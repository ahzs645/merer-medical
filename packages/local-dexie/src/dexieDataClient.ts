import { createId } from '@mere/domain';
import type {
  Connection,
  ConnectionSource,
  InstanceConfig,
  SummaryPagePreferences,
  TerminologyEntry,
  TerminologyProfile,
  User,
  UserPreferences,
  TerminologyPack,
  TerminologySearchIndex,
} from '@mere/domain';
import type { AppDataClient } from '@mere/data';
import { getDb, closeDb, type MereDb } from './db';
import { createPackageCommands } from './exportImport';
import { makeObservable } from './observable';
import { createAttachmentCommands } from './commands/attachments';
import { createClinicalDocumentCommands } from './commands/clinicalDocuments';
import { dexieLive, now } from './commands/common';

export interface CreateDexieDataClientOptions {
  dbName?: string;
}

export function createDexieDataClient(
  opts: CreateDexieDataClientOptions = {},
): AppDataClient {
  const dbName = opts.dbName ?? 'mere';
  const db: MereDb = getDb(dbName);

  const users: AppDataClient['users'] = {
    list: async () => (await db.users.toArray()).filter((r) => !r.deletedAt),
    get: async (id) => (await db.users.get(id)) ?? null,
    getSelected: async () => {
      const all = await db.users.toArray();
      const live = all.filter((u) => !u.deletedAt);
      return (
        live.find((u) => u.isSelected) ??
        live.find((u) => u.isDefault) ??
        live[0] ??
        null
      );
    },
    async create(input) {
      const t = now();
      const user: User = {
        id: createId('usr'),
        createdAt: t,
        updatedAt: t,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        gender: input.gender,
        birthday: input.birthday,
      };
      const others = await db.users.toArray();
      if (others.length === 0) user.isDefault = true;
      if (!others.some((u) => u.isSelected)) user.isSelected = true;
      await db.users.add(user);
      return user;
    },
    async update(id, patch) {
      const cur = await db.users.get(id);
      if (!cur) throw new Error(`User ${id} not found`);
      const next: User = { ...cur, ...patch, id, updatedAt: now() };
      await db.users.put(next);
      return next;
    },
    async setProfilePicture(id, file) {
      const att = await attachments.put({
        ownerType: 'user_profile',
        ownerId: id,
        mime: file.mime,
        bytes: file.bytes,
        filename: file.filename,
      });
      await users.update(id, { profilePictureAttachmentId: att.id });
      return att;
    },
    async select(id) {
      await db.transaction('rw', db.users, async () => {
        const all = await db.users.toArray();
        for (const u of all) {
          if (u.isSelected && u.id !== id) {
            await db.users.put({ ...u, isSelected: false, updatedAt: now() });
          }
        }
        const target = await db.users.get(id);
        if (target) {
          await db.users.put({ ...target, isSelected: true, updatedAt: now() });
        }
      });
    },
    async delete(id) {
      const cur = await db.users.get(id);
      if (!cur) return;
      await db.users.put({ ...cur, deletedAt: now(), updatedAt: now() });
    },
    observeSelected: () =>
      makeObservable<User | null>(
        () => null,
        dexieLive(async () => {
          const all = await db.users.toArray();
          const live = all.filter((u) => !u.deletedAt);
          return (
            live.find((u) => u.isSelected) ??
            live.find((u) => u.isDefault) ??
            live[0] ??
            null
          );
        }),
      ),
  };

  const userPreferences: AppDataClient['userPreferences'] = {
    getForUser: async (userId) =>
      (await db.user_preferences.where('userId').equals(userId).first()) ??
      null,
    async upsert(userId, patch) {
      const existing = await db.user_preferences
        .where('userId')
        .equals(userId)
        .first();
      const t = now();
      const next: UserPreferences = existing
        ? { ...existing, ...patch, userId, updatedAt: t }
        : {
            id: createId('pref'),
            createdAt: t,
            updatedAt: t,
            userId,
            useProxy: patch.useProxy ?? false,
          };
      await db.user_preferences.put(next);
      return next;
    },
  };

  const connections: AppDataClient['connections'] = {
    list: (userId) => db.connections.where('userId').equals(userId).toArray(),
    get: async (id) => (await db.connections.get(id)) ?? null,
    bySource: async (userId, source: ConnectionSource) => {
      const rows = await db.connections
        .where('userId')
        .equals(userId)
        .toArray();
      return rows.filter((r) => r.source === source);
    },
    async create(input) {
      const t = now();
      const c: Connection = {
        ...input,
        id: createId('conn'),
        createdAt: t,
        updatedAt: t,
      };
      await db.connections.add(c);
      return c;
    },
    async update(id, patch) {
      const cur = await db.connections.get(id);
      if (!cur) throw new Error(`Connection ${id} not found`);
      const next: Connection = { ...cur, ...patch, id, updatedAt: now() };
      await db.connections.put(next);
      return next;
    },
    async delete(id) {
      await db.connections.delete(id);
    },
    observe: (userId) =>
      makeObservable<Connection[]>(
        () => [],
        dexieLive(() =>
          db.connections.where('userId').equals(userId).toArray(),
        ),
      ),
  };

  const clinicalDocuments = createClinicalDocumentCommands(db);
  const attachments = createAttachmentCommands(db);

  const instanceConfig: AppDataClient['instanceConfig'] = {
    async get() {
      const all = await db.instance_config.toArray();
      return all[0] ?? null;
    },
    async update(patch) {
      const all = await db.instance_config.toArray();
      const t = now();
      const next: InstanceConfig = all[0]
        ? { ...all[0], ...patch, updatedAt: t }
        : {
            id: createId('cfg'),
            createdAt: t,
            updatedAt: t,
            ...patch,
          };
      await db.instance_config.put(next);
      return next;
    },
  };

  const summaryPagePreferences: AppDataClient['summaryPagePreferences'] = {
    async getForUser(userId) {
      return (
        (await db.summary_page_preferences
          .where('userId')
          .equals(userId)
          .first()) ?? null
      );
    },
    async upsert(userId, cards) {
      const existing = await db.summary_page_preferences
        .where('userId')
        .equals(userId)
        .first();
      const t = now();
      const next: SummaryPagePreferences = existing
        ? { ...existing, cards, updatedAt: t }
        : {
            id: createId('sumpref'),
            createdAt: t,
            updatedAt: t,
            userId,
            cards,
          };
      await db.summary_page_preferences.put(next);
      return next;
    },
  };

  const terminology: AppDataClient['terminology'] = {
    async listPacks(profile?: TerminologyProfile) {
      const packs = profile
        ? await db.terminology_packs.where('profile').equals(profile).toArray()
        : await db.terminology_packs.toArray();
      return packs.filter((pack) => !pack.deletedAt);
    },
    async upsertPack(input) {
      const t = now();
      const incomingPack = input.pack as Partial<TerminologyPack> &
        typeof input.pack;
      const pack: TerminologyPack = {
        ...input.pack,
        createdAt: incomingPack.createdAt ?? t,
        updatedAt: t,
      };
      const entries: TerminologyEntry[] = input.entries.map((entryInput) => {
        const entry = entryInput as Partial<TerminologyEntry> &
          typeof entryInput;
        return {
          ...entryInput,
          packId: pack.id,
          createdAt: entry.createdAt ?? t,
          updatedAt: t,
        };
      });
      const searchIndexes: TerminologySearchIndex[] = (
        input.searchIndexes ?? []
      ).map((indexInput) => {
        const index = indexInput as Partial<TerminologySearchIndex> &
          typeof indexInput;
        return {
          ...indexInput,
          packId: pack.id,
          createdAt: index.createdAt ?? t,
          updatedAt: t,
        };
      });
      await db.transaction(
        'rw',
        db.terminology_packs,
        db.terminology_entries,
        db.terminology_search_index,
        async () => {
          await db.terminology_packs.put(pack);
          await db.terminology_entries.where('packId').equals(pack.id).delete();
          if (entries.length) await db.terminology_entries.bulkPut(entries);
          await db.terminology_search_index
            .where('packId')
            .equals(pack.id)
            .delete();
          if (searchIndexes.length) {
            await db.terminology_search_index.bulkPut(searchIndexes);
          }
        },
      );
      return pack;
    },
    async search(q) {
      const limit = q.limit ?? 8;
      const normalizedQuery = q.query.trim().toLocaleLowerCase();
      let rows = await db.terminology_entries
        .where('[profile+domain]' as never)
        .equals([q.profile, q.domain] as never)
        .toArray()
        .catch(async () => {
          const all = await db.terminology_entries
            .where('profile')
            .equals(q.profile)
            .toArray();
          return all.filter((entry) => entry.domain === q.domain);
        });

      rows = rows.filter((entry) => entry.active && !entry.deletedAt);
      if (!normalizedQuery) return rows.slice(0, limit);

      const scored = rows
        .map((entry) => {
          const display =
            q.language === 'fr' && entry.displayFr
              ? entry.displayFr
              : entry.displayEn;
          const haystack = [
            display,
            entry.displayEn,
            entry.displayFr,
            entry.code,
            entry.source,
            ...(entry.aliasesEn ?? []),
            ...(entry.aliasesFr ?? []),
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase();
          const starts = haystack.startsWith(normalizedQuery);
          const includes = haystack.includes(normalizedQuery);
          return {
            entry,
            score: starts ? 0 : includes ? 1 : 2,
            includes,
          };
        })
        .filter((item) => item.includes)
        .sort((a, b) => a.score - b.score);

      return scored.map((item) => item.entry).slice(0, limit);
    },
  };

  return {
    mode: 'local',
    users,
    userPreferences,
    connections,
    clinicalDocuments,
    attachments,
    instanceConfig,
    summaryPagePreferences,
    terminology,
    package: createPackageCommands(dbName),
    async close() {
      await closeDb();
    },
  };
}
