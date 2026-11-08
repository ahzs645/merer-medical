/** @jest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { SharingTab } from './SharingTab';

let mockUserId = 'profile-a';
let mockDb = {};
const mockList = jest.fn();
const mockSave = jest.fn();
const mockExport = jest.fn();
const mockAudit = jest.fn();
const mockCreateUrl = jest.fn(() => 'blob:synthetic-package');
const mockRevokeUrl = jest.fn();
jest.mock('../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: mockUserId }),
}));
jest.mock('../../app/providers/RxDbProvider', () => ({
  useRxDb: () => mockDb,
}));
jest.mock('../../repositories/WorkflowRecordRepository', () => ({
  listWorkflowRecords: (...args: unknown[]) => mockList(...args),
  upsertWorkflowRecord: (...args: unknown[]) => mockSave(...args),
}));
jest.mock('../../shared/components/AppPage', () => ({
  AppPage: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('../../shared/components/OtherDownloadDoors', () => ({
  OtherDownloadDoors: () => null,
}));
jest.mock('../../shared/components/records/RecordPageHeader', () => ({
  RecordPageHeader: () => null,
}));
jest.mock('../../services/emrpkg', () => ({
  exportEmrpkgFromRxDb: (...args: unknown[]) => mockExport(...args),
}));
jest.mock('../audit/auditLog', () => ({
  appendAuditLog: (...args: unknown[]) => mockAudit(...args),
}));

const state = (name: string) => ({
  emergencyProfile: { preferredName: name },
  proxies: [],
  grants: [],
});

beforeEach(() => {
  mockUserId = 'profile-a';
  mockDb = {};
  mockList
    .mockReset()
    .mockImplementation((_db, userId) =>
      Promise.resolve([
        { id: `sharing-state:${userId}`, payload: state(userId) },
      ]),
    );
  mockSave.mockReset().mockResolvedValue(undefined);
  mockExport.mockReset().mockResolvedValue(new Uint8Array([1]));
  mockAudit.mockReset().mockResolvedValue(undefined);
  mockCreateUrl.mockClear();
  mockRevokeUrl.mockClear();
});

it('never saves the old profile snapshot under a newly selected profile while it loads', async () => {
  const { rerender } = render(<SharingTab />);
  await waitFor(() =>
    expect(
      (screen.getByLabelText('Preferred name') as HTMLInputElement).value,
    ).toBe('profile-a'),
  );
  await waitFor(() => expect(mockSave).toHaveBeenCalled());
  mockSave.mockClear();
  let resolveLoad!: (rows: unknown[]) => void;
  mockList.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
  );
  mockUserId = 'profile-b';
  rerender(<SharingTab />);
  expect(screen.queryByLabelText('Preferred name')).toBeNull();
  expect(mockSave).not.toHaveBeenCalled();
  await act(async () =>
    resolveLoad([{ id: 'sharing-state:profile-b', payload: state('B name') }]),
  );
  await waitFor(() => expect(mockSave).toHaveBeenCalled());
  expect(
    mockSave.mock.calls.every(
      ([, record]) =>
        record.user_id === 'profile-b' &&
        record.payload.emergencyProfile.preferredName === 'B name',
    ),
  ).toBe(true);
});

it('serializes rapid edits so a slow older save cannot overwrite newer notes', async () => {
  render(<SharingTab />);
  await waitFor(() =>
    expect(screen.getByLabelText('Preferred name')).toBeTruthy(),
  );
  await waitFor(() =>
    expect(screen.getByText('Changes saved on this device.')).toBeTruthy(),
  );
  let finishFirst!: () => void;
  mockSave.mockClear().mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishFirst = resolve;
      }),
  );
  fireEvent.change(screen.getByLabelText('Preferred name'), {
    target: { value: 'First edit' },
  });
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText('Preferred name'), {
    target: { value: 'Latest edit' },
  });
  expect(mockSave).toHaveBeenCalledTimes(1);
  await act(async () => finishFirst());
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2));
  expect(mockSave.mock.calls[1][1].payload.emergencyProfile.preferredName).toBe(
    'Latest edit',
  );
});

const originalCreateUrl = URL.createObjectURL;
const originalRevokeUrl = URL.revokeObjectURL;
beforeAll(() => {
  URL.createObjectURL = mockCreateUrl;
  URL.revokeObjectURL = mockRevokeUrl;
});
afterAll(() => {
  URL.createObjectURL = originalCreateUrl;
  URL.revokeObjectURL = originalRevokeUrl;
});

it.each([false, true])(
  'does not offer a stale profile package after a profile switch (round trip: %s)',
  async (roundTrip) => {
    let finishExport!: (value: Uint8Array) => void;
    mockExport.mockReturnValueOnce(
      new Promise<Uint8Array>((resolve) => {
        finishExport = resolve;
      }),
    );
    const { rerender } = render(<SharingTab />);
    await waitFor(() =>
      expect(screen.getByLabelText('Preferred name')).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Download package' }));
    await waitFor(() => expect(mockExport).toHaveBeenCalledTimes(1));
    mockUserId = 'profile-b';
    rerender(<SharingTab />);
    await waitFor(() =>
      expect(
        (screen.getByLabelText('Preferred name') as HTMLInputElement).value,
      ).toBe('profile-b'),
    );
    if (roundTrip) {
      mockUserId = 'profile-a';
      rerender(<SharingTab />);
      await waitFor(() =>
        expect(
          (screen.getByLabelText('Preferred name') as HTMLInputElement).value,
        ).toBe('profile-a'),
      );
    }
    await act(async () => finishExport(new Uint8Array([1])));
    expect(mockCreateUrl).not.toHaveBeenCalled();
    expect(mockAudit).not.toHaveBeenCalled();
    expect(screen.queryByText('Download again')).toBeNull();
  },
);

it('keeps current emergency information and caregiver drafts after an export failure', async () => {
  mockExport.mockRejectedValueOnce(new Error('Synthetic export failure'));
  render(<SharingTab />);
  await waitFor(() =>
    expect(screen.getByLabelText('Preferred name')).toBeTruthy(),
  );
  fireEvent.change(screen.getByLabelText('Preferred name'), {
    target: { value: 'Current emergency name' },
  });
  fireEvent.change(screen.getByLabelText('Name', { exact: true }), {
    target: { value: 'Current caregiver draft' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Download package' }));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(
    (screen.getByLabelText('Preferred name') as HTMLInputElement).value,
  ).toBe('Current emergency name');
  expect(
    (screen.getByLabelText('Name', { exact: true }) as HTMLInputElement).value,
  ).toBe('Current caregiver draft');
  expect(
    screen.getByText('Unable to prepare the package. Try downloading again.'),
  ).toBeTruthy();
  expect(mockCreateUrl).not.toHaveBeenCalled();
});

it('does not render or save a prior database snapshot when the selected user ID stays the same', async () => {
  const { rerender } = render(<SharingTab />);
  await waitFor(() =>
    expect(screen.getByText('Changes saved on this device.')).toBeTruthy(),
  );
  mockSave.mockClear();
  let finishLoad!: (records: unknown[]) => void;
  mockList.mockReturnValueOnce(
    new Promise((resolve) => {
      finishLoad = resolve;
    }),
  );
  mockDb = {};
  const replacementDb = mockDb;
  rerender(<SharingTab />);
  expect(screen.queryByLabelText('Preferred name')).toBeNull();
  expect(mockSave).not.toHaveBeenCalled();
  await act(async () =>
    finishLoad([
      {
        id: 'sharing-state:profile-a',
        payload: state('Replacement database name'),
      },
    ]),
  );
  await waitFor(() => expect(mockSave).toHaveBeenCalled());
  expect(
    (screen.getByLabelText('Preferred name') as HTMLInputElement).value,
  ).toBe('Replacement database name');
  expect(
    mockSave.mock.calls.every(
      ([db, record]) =>
        db === replacementDb &&
        record.payload.emergencyProfile.preferredName ===
          'Replacement database name',
    ),
  ).toBe(true);
});
