/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';

import { useRecordQuery } from './useRecordQuery';
import { fetchRecords } from '../services/timelineRecords';
import { RecordsByDate, TimelineRecordTypeFilter } from '../types';

const mockDb = {};
const mockUser = { id: 'synthetic-user' };
jest.mock('../../../app/providers/RxDbProvider', () => ({
  useRxDb: () => mockDb,
}));
jest.mock('../../../app/providers/UserProvider', () => ({
  useUser: () => mockUser,
}));
jest.mock('../../../app/providers/LocalConfigProvider', () => ({
  useLocalConfig: () => ({ experimental__use_openai_rag: false }),
}));
jest.mock('../../vectors', () => ({ useVectors: () => undefined }));
jest.mock('../../../shared/utils/recordChangeSignal', () => ({
  useRecordChangeTick: () => 0,
}));
jest.mock('../services/timelineRecords', () => ({
  fetchRecords: jest.fn(),
  fetchRecordsWithVectorSearch: jest.fn(),
  NON_TIMELINE_RESOURCE_TYPES: [],
  PAGE_SIZE: 50,
}));

const mockFetch = fetchRecords as jest.MockedFunction<typeof fetchRecords>;

function records(id: string): RecordsByDate {
  return {
    '2026-01-01': [
      {
        id,
        user_id: 'synthetic-user',
        connection_record_id: 'synthetic-source',
        metadata: { display_name: 'Synthetic medication', date: '2026-01-01' },
        data_record: {
          resource_type: 'medicationstatement',
          raw: {
            resource: {
              resourceType: 'MedicationStatement',
              status: 'active',
            } as any,
          },
          content_type: 'application/json',
          format: 'FHIR.DSTU2',
          version_history: [],
        },
      },
    ],
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  mockUser.id = 'synthetic-user';
  jest.spyOn(console, 'debug').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

it.each(['query', 'filter', 'profile'] as const)(
  'marks retained records stale on the first render after a %s change',
  async (change) => {
    const previous = records('old-record');
    const next = records('next-record');
    mockFetch.mockResolvedValueOnce(previous);
    const renders: Array<{
      query: string;
      filter: TimelineRecordTypeFilter;
      user: string;
      ready: boolean;
      data: RecordsByDate | undefined;
    }> = [];
    const hook = renderHook(
      ({ query, filter }) => {
        const state = useRecordQuery(query, false, filter);
        renders.push({
          query,
          filter,
          user: mockUser.id,
          ready: state.dataReadyForQuery,
          data: state.data,
        });
        return state;
      },
      {
        initialProps: {
          query: 'previous',
          filter: 'all' as TimelineRecordTypeFilter,
        },
      },
    );
    await waitFor(() =>
      expect(hook.result.current.dataReadyForQuery).toBe(true),
    );

    let finish!: (value: RecordsByDate) => void;
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const props = {
      query: change === 'query' ? 'next' : 'previous',
      filter: (change === 'filter'
        ? 'encounter'
        : 'all') as TimelineRecordTypeFilter,
    };
    if (change === 'profile') mockUser.id = 'synthetic-next-user';
    const renderCount = renders.length;
    hook.rerender(props);

    // This is the render before the effect dispatches LOADING: status alone
    // would wrongly accept the previous dataset's existing anchor.
    expect(renders[renderCount].data).toBe(previous);
    expect(renders[renderCount].ready).toBe(false);
    expect(hook.result.current.dataReadyForQuery).toBe(false);

    await act(async () => {
      finish(next);
    });
    expect(hook.result.current.data).toBe(next);
    expect(hook.result.current.dataReadyForQuery).toBe(true);
  },
);
