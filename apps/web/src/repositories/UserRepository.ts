import { RxDatabase, RxDocument } from 'rxdb';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DatabaseCollections } from '../app/providers/DatabaseCollections';
import { UserDocument } from '../models/user-document/UserDocument.type';
import uuid4 from '../shared/utils/UUIDUtils';
import {
  getDataClient,
  isDexieReposEnabled,
  liveRxObservable,
  userPatchToDomain,
  userToLegacy,
  wrapAsRxDocument,
  type RxDocumentLike,
} from './dexie-bridge';

const defaultUser: UserDocument = {
  id: uuid4(),
  is_selected_user: true,
  is_default_user: true,
};

function buildUserHandle(user: UserDocument): RxDocumentLike<UserDocument> {
  const client = getDataClient();
  return wrapAsRxDocument<UserDocument>(user, {
    update: async (patch) => {
      const next = await client.users.update(
        user.id,
        userPatchToDomain(patch as Partial<UserDocument>),
      );
      return { ...userToLegacy(next), ...patch };
    },
    remove: async () => {
      await client.users.delete(user.id);
    },
  });
}

async function dexieListAllLegacy(): Promise<UserDocument[]> {
  const client = getDataClient();
  const users = await client.users.list();
  return users.map(userToLegacy);
}

export async function findUserById(
  db: RxDatabase<DatabaseCollections>,
  id: string,
): Promise<UserDocument | null> {
  if (isDexieReposEnabled()) {
    const u = await getDataClient().users.get(id);
    return u ? userToLegacy(u) : null;
  }
  const doc = await db.user_documents.findOne({ selector: { id } }).exec();
  return doc ? doc.toJSON() : null;
}

export async function findSelectedUser(
  db: RxDatabase<DatabaseCollections>,
): Promise<UserDocument | null> {
  if (isDexieReposEnabled()) {
    const u = await getDataClient().users.getSelected();
    return u ? userToLegacy(u) : null;
  }
  const doc = await db.user_documents
    .findOne({ selector: { is_selected_user: true } })
    .exec();
  return doc ? doc.toJSON() : null;
}

export async function findAllUsers(
  db: RxDatabase<DatabaseCollections>,
): Promise<UserDocument[]> {
  if (isDexieReposEnabled()) {
    return dexieListAllLegacy();
  }
  const docs = await db.user_documents.find().exec();
  return docs.map((doc) => doc.toJSON());
}

export async function userExists(
  db: RxDatabase<DatabaseCollections>,
): Promise<boolean> {
  if (isDexieReposEnabled()) {
    const list = await getDataClient().users.list();
    return list.length > 0;
  }
  const users = await db.user_documents.find().limit(1).exec();
  return users.length > 0;
}

export async function findSelectedUserWithDoc(
  db: RxDatabase<DatabaseCollections>,
): Promise<{
  user: UserDocument;
  rawUser: RxDocument<UserDocument> | null;
}> {
  if (isDexieReposEnabled()) {
    const u = await getDataClient().users.getSelected();
    if (!u) return { user: defaultUser, rawUser: null };
    const legacy = userToLegacy(u);
    const handle = buildUserHandle(legacy);
    return {
      user: { ...defaultUser, ...legacy } as UserDocument,
      rawUser: handle as unknown as RxDocument<UserDocument>,
    };
  }
  const rawUser = await db.user_documents
    .findOne({ selector: { is_selected_user: true } })
    .exec();

  return {
    user: rawUser
      ? ({ ...defaultUser, ...rawUser.toMutableJSON() } as UserDocument)
      : defaultUser,
    rawUser: rawUser as RxDocument<UserDocument> | null,
  };
}

export async function findAllUsersWithDocs(
  db: RxDatabase<DatabaseCollections>,
): Promise<RxDocument<UserDocument>[]> {
  if (isDexieReposEnabled()) {
    const users = await dexieListAllLegacy();
    return users.map(
      (u) => buildUserHandle(u) as unknown as RxDocument<UserDocument>,
    );
  }
  return db.user_documents.find().exec();
}

export function watchSelectedUser(
  db: RxDatabase<DatabaseCollections>,
): Observable<{
  user: UserDocument;
  rawUser: RxDocument<UserDocument> | null;
}> {
  if (isDexieReposEnabled()) {
    return liveRxObservable(async () => {
      const u = await getDataClient().users.getSelected();
      if (!u) return { user: defaultUser, rawUser: null };
      const legacy = userToLegacy(u);
      return {
        user: { ...defaultUser, ...legacy } as UserDocument,
        rawUser: buildUserHandle(legacy) as unknown as RxDocument<UserDocument>,
      };
    });
  }
  return db.user_documents
    .findOne({ selector: { is_selected_user: true } })
    .$.pipe(
      map((item) => ({
        user: {
          ...defaultUser,
          ...item?.toMutableJSON(),
        } as UserDocument,
        rawUser: item as RxDocument<UserDocument> | null,
      })),
    );
}

export function watchAllUsers(
  db: RxDatabase<DatabaseCollections>,
): Observable<UserDocument[]> {
  if (isDexieReposEnabled()) {
    return liveRxObservable(() => dexieListAllLegacy());
  }
  return db.user_documents
    .find()
    .$.pipe(map((docs) => docs.map((doc) => doc.toJSON())));
}

export function watchAllUsersWithDocs(
  db: RxDatabase<DatabaseCollections>,
): Observable<RxDocument<UserDocument>[]> {
  if (isDexieReposEnabled()) {
    return liveRxObservable(async () => {
      const users = await dexieListAllLegacy();
      return users.map(
        (u) => buildUserHandle(u) as unknown as RxDocument<UserDocument>,
      );
    });
  }
  return db.user_documents
    .find()
    .$.pipe(map((users) => users as RxDocument<UserDocument>[]));
}

export async function createUser(
  db: RxDatabase<DatabaseCollections>,
  userData: Partial<UserDocument>,
): Promise<RxDocument<UserDocument>> {
  if (isDexieReposEnabled()) {
    const client = getDataClient();
    const created = await client.users.create({
      firstName: userData.first_name,
      lastName: userData.last_name,
      email: userData.email,
      gender: userData.gender,
      birthday: userData.birthday,
    });
    // honor explicit flags the caller passed in (the createUser API does not
    // set isDefault/isSelected by default).
    if (
      userData.is_selected_user !== undefined ||
      userData.is_default_user !== undefined
    ) {
      await client.users.update(created.id, {
        ...(userData.is_selected_user !== undefined && {
          isSelected: userData.is_selected_user,
        }),
        ...(userData.is_default_user !== undefined && {
          isDefault: userData.is_default_user,
        }),
      });
    }
    const legacy = userToLegacy(
      (await client.users.get(created.id)) ?? created,
    );
    return buildUserHandle(legacy) as unknown as RxDocument<UserDocument>;
  }

  const newUser: UserDocument = {
    id: uuid4(),
    is_selected_user: false,
    is_default_user: false,
    ...userData,
  };
  return db.user_documents.insert(newUser);
}

export async function createDefaultUserIfNone(
  db: RxDatabase<DatabaseCollections>,
): Promise<boolean> {
  if (isDexieReposEnabled()) {
    const client = getDataClient();
    const existing = await client.users.list();
    if (existing.length > 0) return false;
    await client.users.create({});
    // mark default + selected — users.create already marks first user as both,
    // but be defensive.
    const selected = await client.users.getSelected();
    if (selected) {
      await client.users.update(selected.id, {
        isDefault: true,
        isSelected: true,
      });
    }
    return true;
  }

  const existingUser = await db.user_documents.findOne({}).exec();
  if (existingUser) {
    return false;
  }
  await db.user_documents.insert(defaultUser);
  return true;
}

/**
 * A profile the app made for you, that you never started using.
 *
 * `createDefaultUserIfNone` puts one of these in on first boot so the app
 * always has somebody selected. If your first real records then arrive as a
 * package with a patient of its own, the placeholder is left behind — an
 * "Unnamed User" beside your actual profile, for the rest of the app's life.
 */
export function isUnstartedPlaceholder(user: UserDocument): boolean {
  return Boolean(
    user.is_default_user &&
      !user.first_name?.trim() &&
      !user.last_name?.trim() &&
      !user.birthday,
  );
}

/**
 * Clear away placeholders that were never used and hold nothing.
 *
 * Only ever removes a profile that is both unstarted and empty, so a profile
 * someone deliberately made and left blank survives as long as it has a name,
 * and one holding records is never touched whatever it is called.
 */
export async function removeEmptyPlaceholderProfiles(
  db: RxDatabase<DatabaseCollections>,
): Promise<number> {
  const users = await db.user_documents.find().exec();
  if (users.length < 2) return 0;

  let removed = 0;
  for (const doc of users) {
    const user = doc.toMutableJSON() as UserDocument;
    if (!isUnstartedPlaceholder(user)) continue;
    if ((await countUserRecords(db, user.id)) > 0) continue;
    try {
      await deleteUser(db, user.id);
      removed += 1;
    } catch {
      // Refuses on the last remaining profile, which is the right answer.
    }
  }
  return removed;
}

export async function updateUser(
  db: RxDatabase<DatabaseCollections>,
  id: string,
  updates: Partial<UserDocument>,
): Promise<void> {
  if (isDexieReposEnabled()) {
    const existing = await getDataClient().users.get(id);
    if (!existing) throw new Error(`User not found: ${id}`);
    await getDataClient().users.update(id, userPatchToDomain(updates));
    return;
  }

  const doc = await db.user_documents.findOne({ selector: { id } }).exec();
  if (!doc) {
    throw new Error(`User not found: ${id}`);
  }
  await doc.update({ $set: updates });
}

export async function switchUser(
  db: RxDatabase<DatabaseCollections>,
  toUserId: string,
): Promise<void> {
  console.debug(`UserRepository: Switching to user ${toUserId}`);

  if (isDexieReposEnabled()) {
    const client = getDataClient();
    const target = await client.users.get(toUserId);
    if (!target) throw new Error(`User not found: ${toUserId}`);
    await client.users.select(toUserId);
    console.debug(`UserRepository: Successfully switched to user ${toUserId}`);
    return;
  }

  const newUser = await db.user_documents
    .findOne({ selector: { id: toUserId } })
    .exec();

  if (!newUser) {
    throw new Error(`User not found: ${toUserId}`);
  }

  try {
    await newUser.update({ $set: { is_selected_user: true } });

    const oldUser = await db.user_documents
      .findOne({
        selector: {
          is_selected_user: true,
          id: { $ne: toUserId },
        },
      })
      .exec();

    if (oldUser) {
      await oldUser.update({ $set: { is_selected_user: false } });
    }

    console.debug(`UserRepository: Successfully switched to user ${toUserId}`);
  } catch (error) {
    console.error('Failed to switch user:', error);
    throw new Error(
      `Failed to switch to user ${toUserId}: ${error instanceof Error ? error.message : 'Unknown database error'}`,
    );
  }
}

/**
 * Every collection that belongs to a profile rather than to the app.
 *
 * `user_preferences` and `vector_storage` carry a `user_id` too but declare no
 * index on it; they are queried the same way and are small enough that it does
 * not matter.
 */
const USER_OWNED_COLLECTIONS = [
  'clinical_documents',
  'connection_documents',
  'user_preferences',
  'summary_page_preferences',
  'clinical_timeline_comments',
  'notifications',
  'workflow_records',
  'vector_storage',
] as const;

/**
 * The subset a person would call their records.
 *
 * Preferences and layout rows are scaffolding the app writes for itself the
 * moment a profile exists. They are deleted with the profile like everything
 * else, but counting them told a brand-new profile it held "1 record" — which
 * both misdescribes the delete and made an untouched profile look used.
 */
const USER_RECORD_COLLECTIONS = USER_OWNED_COLLECTIONS.filter(
  (name) => name !== 'user_preferences' && name !== 'summary_page_preferences',
);

/** How much would go with a profile — asked before deleting, not after. */
export async function countUserRecords(
  db: RxDatabase<DatabaseCollections>,
  id: string,
): Promise<number> {
  const counts = await Promise.all(
    USER_RECORD_COLLECTIONS.map(async (name) => {
      const collection = db[name as keyof DatabaseCollections];
      if (!collection) return 0;
      const docs = await collection.find({ selector: { user_id: id } }).exec();
      return docs.length;
    }),
  );
  return counts.reduce((total, count) => total + count, 0);
}

/**
 * Remove a profile and everything filed under it.
 *
 * Removing the user row alone left the records behind: hundreds of clinical
 * documents belonging to a patient the app no longer lists, invisible, still
 * occupying the store, and ready to reappear under any profile that happened to
 * be created with the same id. A profile is the records; deleting one has to
 * mean deleting them.
 *
 * Two things it refuses to do. It will not delete the last profile — the app
 * assumes a selected user everywhere, and an empty store is what "start over"
 * is for. And it will not leave nobody selected: deleting the profile in use
 * hands selection to another first, so the app never has to render without one.
 */
export async function deleteUser(
  db: RxDatabase<DatabaseCollections>,
  id: string,
): Promise<void> {
  if (isDexieReposEnabled()) {
    const existing = await getDataClient().users.get(id);
    if (!existing) throw new Error(`User not found: ${id}`);
    await getDataClient().users.delete(id);
    return;
  }

  const doc = await db.user_documents.findOne({ selector: { id } }).exec();
  if (!doc) {
    throw new Error(`User not found: ${id}`);
  }

  const others = await db.user_documents
    .find({ selector: { id: { $ne: id } } })
    .exec();
  if (others.length === 0) {
    throw new Error(
      'This is the only profile. Deleting it would leave the app with nobody to show.',
    );
  }

  if (doc.get('is_selected_user')) {
    await switchUser(db, others[0].get('id'));
  }

  for (const name of USER_OWNED_COLLECTIONS) {
    const collection = db[name as keyof DatabaseCollections];
    if (!collection) continue;
    const owned = await collection.find({ selector: { user_id: id } }).exec();
    // One at a time rather than `bulkRemove`: a collection that rejects one
    // document should not take the rest of the cleanup down with it and strand
    // the profile half-deleted.
    for (const record of owned) {
      try {
        await record.remove();
      } catch (error) {
        console.warn(`Failed to remove ${name} record for user ${id}`, error);
      }
    }
  }

  await doc.remove();
}
