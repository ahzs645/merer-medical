import { createId } from '@mere/domain';
import type { Attachment, AttachmentOwnerType } from '@mere/domain';
import type { AppDataClient } from '@mere/data';

import type { MereDb } from '../db';
import { sha256Hex } from '../crypto';
import { now } from './common';

export function createAttachmentCommands(
  db: MereDb,
): AppDataClient['attachments'] {
  return {
    list: (ownerType: AttachmentOwnerType, ownerId) =>
      db.attachments
        .where('[ownerType+ownerId]' as never)
        .equals([ownerType, ownerId] as never)
        .toArray()
        .catch(async () => {
          const rows = await db.attachments
            .where('ownerId')
            .equals(ownerId)
            .toArray();
          return rows.filter((r) => r.ownerType === ownerType);
        }),
    get: async (id) => (await db.attachments.get(id)) ?? null,
    async read(id) {
      const meta = await db.attachments.get(id);
      if (!meta) return null;
      const blob = await db.attachment_blobs.get(id);
      if (!blob) return null;
      return { meta, bytes: blob.bytes };
    },
    async put(input) {
      const t = now();
      const id = createId('att');
      const sha256 = await sha256Hex(input.bytes);
      const att: Attachment = {
        id,
        createdAt: t,
        updatedAt: t,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        filename: input.filename,
        mime: input.mime,
        size: input.bytes.byteLength,
        sha256,
      };
      await db.transaction(
        'rw',
        db.attachments,
        db.attachment_blobs,
        async () => {
          await db.attachments.put(att);
          await db.attachment_blobs.put({ id, bytes: input.bytes });
        },
      );
      return att;
    },
    async delete(id) {
      await db.transaction(
        'rw',
        db.attachments,
        db.attachment_blobs,
        async () => {
          await db.attachments.delete(id);
          await db.attachment_blobs.delete(id);
        },
      );
    },
  };
}
