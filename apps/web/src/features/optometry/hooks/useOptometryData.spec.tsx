/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';

import { notifyRecordsChanged } from '../../../shared/utils/recordChangeSignal';
import { useOptometryData } from './useOptometryData';

const mockFind = jest.fn(() => ({ exec: () => Promise.resolve([]) }));
// One stable db object: a fresh one per render would retrigger the fetch effect
// forever, which is a property of the mock and not of the provider.
const mockDb = { clinical_documents: { find: mockFind } };

jest.mock('../../../app/providers/RxDbProvider', () => ({
  useRxDb: () => mockDb,
}));
jest.mock('../../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: 'test-user' }),
}));

/**
 * Deleting a prescription from a panel used to leave the deleted row on screen
 * — still flagged "Current" in the timeline — until the page was reloaded,
 * because this hook only refetched on db/user changes.
 */
describe('useOptometryData', () => {
  it('refetches when a record is added, edited, or deleted', async () => {
    const { result } = renderHook(() => useOptometryData());
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(mockFind).toHaveBeenCalledTimes(1);

    act(() => notifyRecordsChanged());

    await waitFor(() => expect(mockFind).toHaveBeenCalledTimes(2));
  });
});
