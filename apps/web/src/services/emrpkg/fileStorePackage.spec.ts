import { webcrypto } from 'crypto';
import { TextDecoder, TextEncoder } from 'util';
import { RxDatabase } from 'rxdb';

import { DatabaseCollections } from '../../app/providers/DatabaseCollections';
import {
  cleanupTestDatabase,
  createTestDatabase,
} from '../../test-utils/createTestDatabase';
import type { StoredFile } from '../../shared/storage/fileStore';
import { exportEmrpkgFromRxDb, importEmrpkgToRxDb } from './index';

// The test environment has no IndexedDB, so the file store is an in-mockMemory
// map with the same functions.
const mockMemory = new Map<string, StoredFile>();
jest.mock('../../shared/storage/fileStore', () => ({
  listAllFiles: async () => [...mockMemory.values()],
  putStoredFiles: async (rows: StoredFile[]) =>
    rows.forEach((row) => mockMemory.set(row.id, row)),
  deleteAllFiles: async () => mockMemory.clear(),
}));

/** jsdom's Blob lacks arrayBuffer(); the store only needs that. */
function blob(bytes: number[]): Blob {
  const data = new Uint8Array(bytes);
  return {
    size: data.length,
    type: 'application/dicom',
    arrayBuffer: async () => data.buffer,
  } as unknown as Blob;
}

describe('stored files travel with a package', () => {
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
    mockMemory.clear();
    sourceDb = await createTestDatabase();
    targetDb = await createTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase(sourceDb);
    await cleanupTestDatabase(targetDb);
  });

  it('exports the CBCT a record points at, and restores it on import', async () => {
    const userId = '6f271f0e-e76a-4c38-91d2-7216f1c7a8b4';
    const connectionId = '50e03036-5c41-47de-9a2d-6d4188d06dbc';
    await sourceDb.clinical_documents.insert({
      id: `${connectionId}|${userId}|manual:cbct`,
      connection_record_id: connectionId,
      user_id: userId,
      data_record: {
        raw: '',
        format: 'FHIR.DSTU2',
        content_type: 'application/dicom',
        resource_type: 'documentreference_attachment',
        version_history: [],
      },
      metadata: {
        id: 'manual:cbct',
        date: '2026-02-12T12:00:00.000Z',
        display_name: 'Dental CBCT',
        file_set: {
          id: 'set-1',
          kind: 'dicom',
          label: 'CBCT',
          count: 2,
          totalSize: 6,
          sample: ['CBCT/IM1', 'CBCT/IM2'],
        },
      },
    });
    for (const [index, bytes] of [
      [1, 2, 3],
      [4, 5, 6],
    ].entries()) {
      mockMemory.set(`set-1/${index}`, {
        id: `set-1/${index}`,
        setId: 'set-1',
        name: `IM${index + 1}`,
        relativePath: `CBCT/IM${index + 1}`,
        mime: 'application/dicom',
        size: 3,
        blob: blob(bytes),
        createdAt: 1,
      });
    }
    // A file no exported record points at stays out of the package.
    mockMemory.set('orphan/0', {
      ...mockMemory.get('set-1/0')!,
      id: 'orphan/0',
      setId: 'orphan',
    });

    const pkg = await exportEmrpkgFromRxDb(sourceDb);
    mockMemory.clear();

    const result = await importEmrpkgToRxDb(pkg, targetDb);
    expect(result.unknownTables).toEqual([]);
    expect([...mockMemory.keys()].sort()).toEqual(['set-1/0', 'set-1/1']);
    const restored = mockMemory.get('set-1/1')!;
    expect(restored.relativePath).toBe('CBCT/IM2');
    expect(restored.size).toBe(3);
  });
});
