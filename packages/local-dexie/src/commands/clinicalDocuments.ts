import { createId } from '@mere/domain';
import type { ClinicalDocument, ClinicalResourceType } from '@mere/domain';
import type { AppDataClient } from '@mere/data';

import type { MereDb } from '../db';
import { makeObservable } from '../observable';
import { dexieLive, now } from './common';

export function createClinicalDocumentCommands(
  db: MereDb,
): AppDataClient['clinicalDocuments'] {
  const clinicalDocuments: AppDataClient['clinicalDocuments'] = {
    async query(q) {
      const coll = db.clinical_documents.where('userId').equals(q.userId);
      let rows = await coll.toArray();
      if (q.connectionId) {
        rows = rows.filter((r) => r.connectionId === q.connectionId);
      }
      if (q.resourceTypes?.length) {
        const set = new Set(q.resourceTypes);
        rows = rows.filter((r) => set.has(r.resourceType));
      }
      if (q.format) rows = rows.filter((r) => r.format === q.format);
      if (q.sinceUpdatedAt) {
        rows = rows.filter((r) => r.updatedAt >= q.sinceUpdatedAt!);
      }
      rows = rows.filter((r) => !r.deletedAt);
      const offset = q.offset ?? 0;
      const limit = q.limit ?? rows.length;
      return rows.slice(offset, offset + limit);
    },
    get: async (id) => (await db.clinical_documents.get(id)) ?? null,
    async upsertBatch(docs) {
      const t = now();
      const prepared: ClinicalDocument[] = docs.map((d) => ({
        ...(d as ClinicalDocument),
        id: d.id ?? createId('cdoc'),
        createdAt: (d as ClinicalDocument).createdAt ?? t,
        updatedAt: t,
      }));
      await db.clinical_documents.bulkPut(prepared);
      return prepared;
    },
    async delete(id) {
      await db.clinical_documents.delete(id);
    },
    async countByResource(userId) {
      const rows = await db.clinical_documents
        .where('userId')
        .equals(userId)
        .toArray();
      const out: Partial<Record<ClinicalResourceType, number>> = {};
      for (const r of rows) {
        if (r.deletedAt) continue;
        out[r.resourceType] = (out[r.resourceType] ?? 0) + 1;
      }
      return out as Record<ClinicalResourceType, number>;
    },
    observe: (q) =>
      makeObservable<ClinicalDocument[]>(
        () => [],
        dexieLive(() => clinicalDocuments.query(q)),
      ),
  };

  return clinicalDocuments;
}
