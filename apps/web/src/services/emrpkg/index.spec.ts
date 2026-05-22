import { webcrypto } from 'crypto';
import { TextDecoder, TextEncoder } from 'util';
import { RxDatabase } from 'rxdb';

import { DatabaseCollections } from '../../app/providers/DatabaseCollections';
import {
  cleanupTestDatabase,
  createTestDatabase,
} from '../../test-utils/createTestDatabase';
import {
  exportEmrpkgFromRxDb,
  importEmrpkgToRxDb,
  inspectEmrpkg,
} from './index';

describe('emrpkg RxDB import/export', () => {
  let sourceDb: RxDatabase<DatabaseCollections>;
  let targetDb: RxDatabase<DatabaseCollections>;

  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'TextEncoder', {
      value: TextEncoder,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'TextDecoder', {
      value: TextDecoder,
      configurable: true,
    });
  });

  beforeEach(async () => {
    sourceDb = await createTestDatabase();
    targetDb = await createTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase(sourceDb);
    await cleanupTestDatabase(targetDb);
  });

  it('round-trips encrypted packages containing manual records and files', async () => {
    const userId = '6f271f0e-e76a-4c38-91d2-7216f1c7a8b4';
    const connectionId = '50e03036-5c41-47de-9a2d-6d4188d06dbc';
    const labId = `${connectionId}|${userId}|manual:lab`;
    const fileId = `${connectionId}|${userId}|manual:file`;

    await sourceDb.connection_documents.insert({
      id: connectionId,
      user_id: userId,
      access_token: '',
      expires_at: 0,
      source: 'manual',
      name: 'Manual entry',
      location: 'manual://local',
    });

    await sourceDb.clinical_documents.bulkInsert([
      {
        id: labId,
        connection_record_id: connectionId,
        user_id: userId,
        data_record: {
          raw: {
            fullUrl: 'manual:lab',
            manual_kind: 'lab',
            resource: {
              resourceType: 'Observation',
              id: 'lab',
              code: { text: 'Manual glucose' },
              valueQuantity: { value: 98, unit: 'mg/dL' },
              referenceRange: [
                {
                  low: { value: '70', unit: 'mg/dL' },
                  high: { value: '99', unit: 'mg/dL' },
                },
              ],
              interpretation: { text: 'Normal' },
              note: [{ text: 'fasting' }],
            },
          },
          format: 'FHIR.DSTU2',
          content_type: 'application/json',
          resource_type: 'observation',
          version_history: [],
        },
        metadata: {
          id: 'manual:lab',
          date: '2026-05-22T12:00:00.000Z',
          display_name: 'Manual glucose',
        },
      },
      {
        id: fileId,
        connection_record_id: connectionId,
        user_id: userId,
        data_record: {
          raw: 'Manual file contents',
          format: 'FHIR.DSTU2',
          content_type: 'text/plain',
          resource_type: 'documentreference_attachment',
          version_history: [],
        },
        metadata: {
          id: 'manual:file',
          date: '2026-05-22T12:00:00.000Z',
          display_name: 'manual-note.txt',
        },
      },
    ]);

    const passphrase = 'manual records test passphrase';
    const pkg = await exportEmrpkgFromRxDb(sourceDb, { passphrase });

    await expect(importEmrpkgToRxDb(pkg, targetDb)).rejects.toThrow();
    await expect(inspectEmrpkg(pkg)).resolves.toMatchObject({
      encrypted: true,
    });

    const result = await importEmrpkgToRxDb(pkg, targetDb, { passphrase });
    expect(result.counts.clinical_documents).toBe(2);
    expect(result.counts.connection_documents).toBe(1);

    const importedClinical = await targetDb.clinical_documents.find().exec();
    const importedConnection = await targetDb.connection_documents
      .find()
      .exec();
    const rows = importedClinical.map((doc) => doc.toMutableJSON());

    expect(importedConnection[0].get('source')).toBe('manual');
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metadata: expect.objectContaining({ display_name: 'Manual glucose' }),
          data_record: expect.objectContaining({
            resource_type: 'observation',
            raw: expect.objectContaining({
              manual_kind: 'lab',
              resource: expect.objectContaining({
                valueQuantity: { value: 98, unit: 'mg/dL' },
              }),
            }),
          }),
        }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            display_name: 'manual-note.txt',
          }),
          data_record: expect.objectContaining({
            resource_type: 'documentreference_attachment',
            content_type: 'text/plain',
            raw: 'Manual file contents',
          }),
        }),
      ]),
    );
  });
});
