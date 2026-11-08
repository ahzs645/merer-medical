/** @jest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react';
import { RxDatabase } from 'rxdb';

import { DatabaseCollections } from '../../app/providers/DatabaseCollections';
import { ClinicalDocumentResourceType } from '../../models/clinical-document/ClinicalDocument.type';
import { createTestClinicalDocument } from '../../test-utils/clinicalDocumentTestData';
import {
  cleanupTestDatabase,
  createTestDatabase,
} from '../../test-utils/createTestDatabase';
import { useRecordSearch } from './useRecordSearch';

let mockDb: RxDatabase<DatabaseCollections>;
let mockUserId = 'synthetic-search-user';

jest.mock('../../app/providers/RxDbProvider', () => ({
  ...jest.requireActual('../../app/providers/RxDbProvider'),
  useRxDb: () => mockDb,
}));
jest.mock('../../app/providers/UserProvider', () => ({
  ...jest.requireActual('../../app/providers/UserProvider'),
  useUser: () => ({ id: mockUserId }),
}));

function document(
  type: ClinicalDocumentResourceType,
  name: string,
  date?: string,
  userId = mockUserId,
) {
  const doc = createTestClinicalDocument({ user_id: userId });
  doc.id = `test-connection|${userId}|${doc.metadata!.id}`;
  doc.metadata = { ...doc.metadata, display_name: name, date };
  doc.data_record.resource_type = type;
  return doc;
}

beforeEach(async () => {
  mockUserId = 'synthetic-search-user';
  mockDb = await createTestDatabase();
});

afterEach(async () => cleanupTestDatabase(mockDb));

it('finds six usable hits beyond unsupported matches without crossing profiles', async () => {
  const unsupported = Array.from({ length: 25 }, (_, index) =>
    document('provenance', `Synthetic match provenance ${index}`, '2026-02-01'),
  );
  const readable = Array.from({ length: 7 }, (_, index) =>
    document(
      'medicationstatement',
      `Synthetic match medication ${index}`,
      `2026-01-0${index + 1}`,
    ),
  );
  await mockDb.clinical_documents.bulkInsert([
    ...unsupported,
    ...readable,
    document('medicationstatement', 'Synthetic match undated'),
    document(
      'device',
      'Synthetic match other patient',
      '2026-03-01',
      'another-patient',
    ),
  ]);

  const { result } = renderHook(() => useRecordSearch('Synthetic match'));
  await waitFor(() => expect(result.current.hits).toHaveLength(6));
  expect(result.current.error).toBe(false);
  expect(result.current.hits.map((hit) => hit.id)).toEqual(
    readable
      .slice(1)
      .reverse()
      .map((doc) => doc.id),
  );
  expect(
    result.current.hits.every((hit) => hit.path.startsWith('/timeline?')),
  ).toBe(true);
});

it('keeps literal name matching and replaces old-profile hits when the profile changes', async () => {
  const first = document('device', 'Monitor [demo]', undefined);
  const second = document(
    'device',
    'Monitor [demo]',
    undefined,
    'second-patient',
  );
  await mockDb.clinical_documents.bulkInsert([first, second]);
  const { result, rerender } = renderHook(() =>
    useRecordSearch('Monitor [demo]'),
  );
  await waitFor(() =>
    expect(result.current.hits.map((hit) => hit.id)).toEqual([first.id]),
  );
  expect(result.current.hits[0].path).toBe(
    '/records/devices?q=Monitor%20%5Bdemo%5D',
  );

  mockUserId = 'second-patient';
  rerender();
  expect(result.current.hits).toEqual([]);
  await waitFor(() =>
    expect(result.current.hits.map((hit) => hit.id)).toEqual([second.id]),
  );
});
