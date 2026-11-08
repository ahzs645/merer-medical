/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';

import ConnectionTab from './ConnectionTab';

const mockNotify = jest.fn();
const mockImport = jest.fn();
const mockExport = jest.fn();
const mockConnection = {
  id: 'synthetic-portal',
  get: (field: string) =>
    (
      ({
        name: 'Sample Clinic',
        source: 'epic',
        location: 'https://example.invalid',
      }) as Record<string, string>
    )[field],
};

jest.mock('./hooks/useConnectionCards', () => ({
  useConnectionCards: () => [mockConnection],
}));
jest.mock('./components/ConnectionCard', () => ({
  ConnectionCard: ({ item }: { item: typeof mockConnection }) => (
    <li>{item.get('name')}</li>
  ),
}));
jest.mock('./components/TenantSelectModal', () => ({
  TenantSelectModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="Find a portal" /> : null,
}));
jest.mock('../sources/components/PreflightConnectModal', () => ({
  PreflightConnectModal: () => null,
}));
jest.mock('../sources/components/IntegrationStatusPanel', () => ({
  IntegrationStatusPanel: () => <h3>Browser and portal setup</h3>,
}));
jest.mock('../sources/integrationStatus', () => ({
  useIntegrationStatus: () => ({}),
}));
jest.mock('../../app/providers/AppConfigProvider', () => ({
  useConfig: () => ({}),
}));
jest.mock('../../app/providers/UserPreferencesProvider', () => ({
  useUserPreferences: () => ({}),
}));
jest.mock('../../app/providers/RxDbProvider', () => ({
  useRxDb: () => ({}),
  handleJSONDataImport: jest.fn(),
}));
jest.mock('../../app/providers/NotificationProvider', () => ({
  useNotificationDispatch: () => mockNotify,
}));
jest.mock('../../services/emrpkg', () => ({
  importEmrpkgToRxDb: (...args: unknown[]) => mockImport(...args),
  exportEmrpkgFromRxDb: (...args: unknown[]) => mockExport(...args),
  inspectEmrpkg: jest.fn(),
}));
jest.mock('./oauth', () => ({}));

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="location">
        {location.pathname + location.search}
      </output>
      <button onClick={() => navigate(-1)}>Browser Back</button>
    </>
  );
}

function openAt(path = '/connections') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ConnectionTab />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('Sources task navigation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts with three tasks and leaves setup and sync administration behind a separate entry', () => {
    openAt();
    const choices = within(
      screen.getByRole('navigation', { name: 'Add records' }),
    );
    expect(choices.getAllByRole('link')).toEqual([
      choices.getByRole('link', { name: 'Import a file' }),
      choices.getByRole('link', { name: 'Connect a patient portal' }),
      choices.getByRole('link', { name: 'Add a record manually' }),
    ]);
    expect(choices.getByRole('link', { name: 'Import a file' })).toBeTruthy();
    expect(
      choices.getByRole('link', { name: 'Connect a patient portal' }),
    ).toBeTruthy();
    expect(
      choices.getByRole('link', { name: 'Add a record manually' }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Manage sources' })).toBeTruthy();
    expect(screen.queryByText('Browser and portal setup')).toBeNull();
    expect(screen.queryByText('Sample Clinic')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Choose .emrpkg file' }),
    ).toBeNull();
  });

  it('preserves a shared-package offer while changing tasks and returns to choices with Back', () => {
    const offer = 'https://example.invalid/synthetic.emrpkg';
    openAt(`/connections?package=${encodeURIComponent(offer)}`);
    fireEvent.click(screen.getByRole('link', { name: 'Import a file' }));

    const route = new URL(
      screen.getByTestId('location').textContent!,
      'https://example.invalid',
    );
    expect(route.searchParams.get('task')).toBe('import');
    expect(route.searchParams.get('package')).toBe(offer);
    expect(
      screen.getByRole('button', { name: 'Choose .emrpkg file' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Export backup' })).toBeNull();
    expect(mockImport).not.toHaveBeenCalled();
    expect(mockExport).not.toHaveBeenCalled();

    const documentLink = screen.getByRole('link', { name: 'Add a document' });
    const documentUrl = new URL(
      documentLink.getAttribute('href')!,
      'https://example.invalid',
    );
    expect(documentUrl.searchParams.get('type')).toBe('document');
    expect(
      new URL(
        documentUrl.searchParams.get('returnTo')!,
        'https://example.invalid',
      ).searchParams.get('task'),
    ).toBe('import');

    fireEvent.click(screen.getByRole('button', { name: 'Browser Back' }));
    expect(
      screen.getByRole('navigation', { name: 'Add records' }),
    ).toBeTruthy();
    expect(screen.getByTestId('location').textContent).not.toContain('task=');
    expect(screen.getByTestId('location').textContent).toContain('package=');
  });

  it('opens portal discovery only on request and keeps existing source management reachable', () => {
    openAt('/connections?task=portal');
    expect(screen.getByText('Browser and portal setup')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Find a patient portal' }),
    );
    expect(screen.getByRole('dialog', { name: 'Find a portal' })).toBeTruthy();
  });

  it('keeps connection cards and history available in the management task', () => {
    openAt('/connections?task=manage');
    expect(
      screen.getByRole('heading', { name: 'Connected portals' }),
    ).toBeTruthy();
    expect(screen.getAllByText('Sample Clinic')).toHaveLength(2);
    expect(screen.getByRole('table')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Connect a patient portal' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'All source tasks' }));
    expect(
      screen.getByRole('navigation', { name: 'Add records' }),
    ).toBeTruthy();
  });

  it('opens specialty entry forms with a return to the selected manual task', () => {
    openAt('/connections?task=manual');
    for (const [name, specialty] of [
      ['Add a medical record', null],
      ['Add a dental record', 'dental'],
      ['Add an optometry record', 'optometry'],
    ] as const) {
      const url = new URL(
        screen.getByRole('link', { name }).getAttribute('href')!,
        'https://example.invalid',
      );
      expect(url.pathname).toBe('/records/new');
      expect(url.searchParams.get('specialty')).toBe(specialty);
      expect(url.searchParams.get('returnTo')).toBe('/connections?task=manual');
    }
  });

  it('falls back to useful choices for an unknown task and replaces it on selection', () => {
    openAt('/connections?task=unsupported&keep=1');
    fireEvent.click(
      screen.getByRole('link', { name: 'Add a record manually' }),
    );
    const url = new URL(
      screen.getByTestId('location').textContent!,
      'https://example.invalid',
    );
    expect(url.searchParams.get('task')).toBe('manual');
    expect(url.searchParams.get('keep')).toBe('1');
    expect(
      screen.getByRole('link', { name: 'Add a medical record' }),
    ).toBeTruthy();
  });
});
