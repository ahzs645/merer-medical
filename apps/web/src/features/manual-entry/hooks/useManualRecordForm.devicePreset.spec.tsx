/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { useManualRecordForm } from './useManualRecordForm';

jest.mock('../../../app/providers/RxDbProvider', () => ({
  useRxDb: () => undefined,
}));
jest.mock('../../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: 'synthetic-profile' }),
}));
jest.mock('../../../app/providers/NotificationProvider', () => ({
  useNotificationDispatch: () => jest.fn(),
}));
jest.mock('../../../app/providers/LocalConfigProvider', () => ({
  useLocalConfig: () => ({}),
  useUpdateLocalConfig: () => jest.fn(),
}));

function openForm(query: string) {
  const wrapper = ({ children }: PropsWithChildren) => (
    <MemoryRouter initialEntries={[`/records/new?${query}`]}>
      {children}
    </MemoryRouter>
  );
  return renderHook(
    () => ({ form: useManualRecordForm(), location: useLocation() }),
    { wrapper },
  );
}

describe('device file import handoff', () => {
  it('opens the Libre file form, stays pristine, and returns to the Sources import task', () => {
    const { result } = openForm(
      'type=device&deviceImport=freestyle_libre&returnTo=%2Fconnections%3Ftask%3Dimport',
    );
    expect(result.current.form.isLibreImportType).toBe(true);
    expect(result.current.form.isManualDeviceReadingType).toBe(false);
    expect(result.current.form.presetAddTitle).toBe('Import device file');
    expect(result.current.form.isDirty()).toBe(false);
    act(() => result.current.form.leave());
    expect(
      result.current.location.pathname + result.current.location.search,
    ).toBe('/connections?task=import');
  });

  it.each(['', '&deviceImport=manual_reading', '&deviceImport=unsupported'])(
    'keeps the ordinary manual-reading default for device forms with %s',
    (suffix) => {
      const { result } = openForm(`type=device${suffix}`);
      expect(result.current.form.isManualDeviceReadingType).toBe(true);
      expect(result.current.form.isLibreImportType).toBe(false);
      expect(result.current.form.presetAddTitle).toBe('Add device');
    },
  );

  it('ignores a device-file preset on another record kind', () => {
    const { result } = openForm('type=document&deviceImport=freestyle_libre');
    expect(result.current.form.isDocumentType).toBe(true);
    expect(result.current.form.isLibreImportType).toBe(false);
    expect(result.current.form.deviceImportType).toBe('manual_reading');
  });
});
