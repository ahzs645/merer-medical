/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRecordPackageExport } from './useRecordPackageExport';

let mockUserId = 'profile-a';
let mockDb = {};
const mockExport = jest.fn();
const mockAudit = jest.fn();
const mockDownload = jest.fn();
jest.mock('../../../app/providers/RxDbProvider', () => ({
  useRxDb: () => mockDb,
}));
jest.mock('../../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: mockUserId }),
}));
jest.mock('../../../services/emrpkg', () => ({
  exportEmrpkgFromRxDb: (...args: unknown[]) => mockExport(...args),
}));
jest.mock('../../audit/auditLog', () => ({
  appendAuditLog: (...args: unknown[]) => mockAudit(...args),
}));
jest.mock('../utils/packetExport', () => ({
  downloadBlob: (...args: unknown[]) => mockDownload(...args),
  filenameDate: () => 'synthetic-date',
}));

function deferred() {
  let resolve!: (value: Uint8Array) => void;
  const promise = new Promise<Uint8Array>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

beforeEach(() => {
  mockUserId = 'profile-a';
  mockDb = {};
  mockExport.mockReset().mockResolvedValue(new Uint8Array([1]));
  mockAudit.mockReset().mockResolvedValue(undefined);
  mockDownload.mockReset();
});

it.each(['profile', 'round trip', 'database', 'unmount'])(
  'discards a pending export after %s changes its context',
  async (change) => {
    const oldExport = deferred();
    mockExport.mockReturnValueOnce(oldExport.promise);
    const { result, rerender, unmount } = renderHook(() =>
      useRecordPackageExport(),
    );
    let operation!: Promise<void>;
    act(() => {
      operation = result.current.downloadRecordPackage();
    });
    expect(mockExport).toHaveBeenCalledTimes(1);
    if (change === 'unmount') unmount();
    else if (change === 'database') {
      mockDb = {};
      rerender();
    } else {
      mockUserId = 'profile-b';
      rerender();
      if (change === 'round trip') {
        mockUserId = 'profile-a';
        rerender();
      }
    }
    await act(async () => {
      oldExport.resolve(new Uint8Array([1]));
      await operation;
    });
    expect(mockAudit).not.toHaveBeenCalled();
    expect(mockDownload).not.toHaveBeenCalled();
  },
);

it('does not let an old export clear the busy state of a new profile export', async () => {
  const oldExport = deferred();
  const newExport = deferred();
  mockExport
    .mockReturnValueOnce(oldExport.promise)
    .mockReturnValueOnce(newExport.promise);
  const { result, rerender } = renderHook(() => useRecordPackageExport());
  let oldOperation!: Promise<void>;
  let newOperation!: Promise<void>;
  act(() => {
    oldOperation = result.current.downloadRecordPackage();
  });
  mockUserId = 'profile-b';
  rerender();
  act(() => {
    newOperation = result.current.downloadRecordPackage();
  });
  await act(async () => {
    oldExport.resolve(new Uint8Array([1]));
    await oldOperation;
  });
  expect(result.current.exportBusy).toBe(true);
  expect(mockDownload).not.toHaveBeenCalled();
  await act(async () => {
    newExport.resolve(new Uint8Array([2]));
    await newOperation;
  });
  expect(result.current.exportBusy).toBe(false);
  expect(mockDownload).toHaveBeenCalledTimes(1);
  expect(mockAudit.mock.calls[0][1].userId).toBe('profile-b');
});

it('keeps export preferences after a failure and supports a successful retry', async () => {
  const { result } = renderHook(() => useRecordPackageExport());
  act(() => {
    result.current.setPasswordProtect(true);
    result.current.setExportPassphrase('synthetic-passphrase');
    result.current.setIncludeAttachments(false);
  });
  mockExport.mockRejectedValueOnce(new Error('Synthetic export failure'));
  await act(async () => result.current.downloadRecordPackage());
  expect(result.current.exportError).toBe(
    'Unable to prepare the package. Try downloading again.',
  );
  expect(result.current.exportPassphrase).toBe('synthetic-passphrase');
  expect(result.current.includeAttachments).toBe(false);
  expect(result.current.exportBusy).toBe(false);
  await act(async () => result.current.downloadRecordPackage());
  await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));
  expect(result.current.exportError).toBeNull();
});
