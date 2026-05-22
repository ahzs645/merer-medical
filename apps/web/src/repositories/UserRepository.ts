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
  await doc.remove();
}
