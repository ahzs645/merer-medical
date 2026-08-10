/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';

import { notifyRecordsChanged } from '../../../shared/utils/recordChangeSignal';
import { useDentalData } from './useDentalData';

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
 * Deleting a record from a dental panel used to leave the deleted row on
 * screen — and in the tooth chart and counts derived from it — until the page
 * was reloaded, because this hook only refetched on db/user changes.
 */
describe('useDentalData', () => {
  it('refetches when a record is added, edited, or deleted', async () => {
    const { result } = renderHook(() => useDentalData());
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(mockFind).toHaveBeenCalledTimes(1);

    act(() => notifyRecordsChanged());

    await waitFor(() => expect(mockFind).toHaveBeenCalledTimes(2));
  });
});
