/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useVisitPrepPacket } from './useVisitPrepPacket';

let mockUserId = 'profile-a';
let mockTick = 0;
let mockDb: ReturnType<typeof createDatabase>;
jest.mock('../../../app/providers/RxDbProvider', () => ({
  useRxDb: () => mockDb,
}));
jest.mock('../../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: mockUserId }),
}));
jest.mock('../../../shared/utils/recordChangeSignal', () => ({
  useRecordChangeTick: () => mockTick,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function row(title: string) {
  return {
    toMutableJSON: () => ({
      id: title,
      user_id: mockUserId,
      metadata: { display_name: title },
      data_record: {
        resource_type: 'documentreference',
        raw: { resource: {} },
      },
    }),
  };
}

function createDatabase() {
  const pending: ReturnType<typeof deferred<ReturnType<typeof row>[]>>[] = [];
  const find = jest.fn(() => ({
    exec: () => {
      const query = deferred<ReturnType<typeof row>[]>();
      pending.push(query);
      return query.promise;
    },
  }));
  return { clinical_documents: { find }, pending };
}

beforeEach(() => {
  mockUserId = 'profile-a';
  mockTick = 0;
  mockDb = createDatabase();
});

it('never exposes a previous profile packet under the newly selected profile, even before its load effect', async () => {
  const rendered: Array<{ userId: string; titles: string[] }> = [];
  const { result, rerender } = renderHook(() => {
    const value = useVisitPrepPacket();
    rendered.push({
      userId: mockUserId,
      titles: value.packet.documents.map((item) => item.title),
    });
    return value;
  });
  await act(async () => mockDb.pending[0].resolve([row('A document')]));
  expect(result.current.packet.documents[0].title).toBe('A document');
  mockUserId = 'profile-b';
  rerender();
  expect(result.current.status).toBe('loading');
  expect(result.current.packet.documents).toEqual([]);
  expect(
    rendered
      .filter((item) => item.userId === 'profile-b')
      .every((item) => !item.titles.includes('A document')),
  ).toBe(true);
  await act(async () => mockDb.pending[1].resolve([row('B document')]));
  expect(result.current.status).toBe('success');
  expect(result.current.packet.documents[0].title).toBe('B document');
});

it('rejects late results across a profile round trip and a database replacement', async () => {
  const originalDb = mockDb;
  const { result, rerender } = renderHook(() => useVisitPrepPacket());
  mockUserId = 'profile-b';
  rerender();
  mockUserId = 'profile-a';
  rerender();
  await act(async () =>
    originalDb.pending[0].resolve([row('Stale A document')]),
  );
  await act(async () =>
    originalDb.pending[1].resolve([row('Stale B document')]),
  );
  expect(result.current.status).toBe('loading');
  expect(result.current.packet.documents).toEqual([]);
  mockDb = createDatabase();
  rerender();
  await act(async () =>
    originalDb.pending[2].resolve([row('Old database document')]),
  );
  expect(result.current.packet.documents).toEqual([]);
  await act(async () => mockDb.pending[0].resolve([row('Current document')]));
  expect(result.current.packet.documents[0].title).toBe('Current document');
});

it('clears a failed refresh packet, reports the error, and can recover after a records update', async () => {
  const { result, rerender } = renderHook(() => useVisitPrepPacket());
  await act(async () => mockDb.pending[0].resolve([row('Old document')]));
  mockTick += 1;
  rerender();
  await act(async () =>
    mockDb.pending[1].reject(new Error('Synthetic query failure')),
  );
  expect(result.current.status).toBe('error');
  expect(result.current.packet.documents).toEqual([]);
  mockTick += 1;
  rerender();
  await act(async () => mockDb.pending[2].resolve([row('Recovered document')]));
  await waitFor(() => expect(result.current.status).toBe('success'));
  expect(result.current.packet.documents[0].title).toBe('Recovered document');
});
