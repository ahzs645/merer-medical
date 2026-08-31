/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { strToU8, zipSync } from 'fflate';

import { SharedPackagePanel } from './SharedPackagePanel';

const mockImport = jest.fn(async () => ({
  counts: { clinical_documents: 3 },
  unknownTables: [],
}));
const mockNotify = jest.fn();
const mockRemovePlaceholders = jest.fn(async () => 0);
let mockAllUsers: Array<{
  get: (k: string) => string;
  toMutableJSON: () => Record<string, unknown>;
}> = [];
let mockCurrentUser: { id: string } | undefined;

function profile(id: string) {
  return {
    get: (key: string) => (key === 'id' ? id : ''),
    // A real profile, not the blank one the app makes on first boot.
    toMutableJSON: () => ({
      id,
      first_name: 'Existing',
      is_default_user: false,
    }),
  };
}

/** The profile `createDefaultUserIfNone` puts in so something is selected. */
function placeholder(id: string) {
  return {
    get: (key: string) => (key === 'id' ? id : ''),
    toMutableJSON: () => ({ id, is_default_user: true }),
  };
}

jest.mock('../../../app/providers/RxDbProvider', () => ({
  useRxDb: () => ({}),
}));
jest.mock('../../../app/providers/UserProvider', () => ({
  useAllUsers: () => mockAllUsers,
  useOptionalUser: () => mockCurrentUser,
  useUserManagement: () => ({
    removeEmptyPlaceholders: mockRemovePlaceholders,
  }),
}));
jest.mock('../../../app/providers/NotificationProvider', () => ({
  useNotificationDispatch: () => mockNotify,
}));
jest.mock('../../../services/emrpkg', () => ({
  importEmrpkgToRxDb: (...args: unknown[]) => mockImport(...(args as [])),
  inspectEmrpkg: jest.requireActual('@mere/local-dexie').inspectEmrpkg,
}));

function packageBytes(patientId = 'patient-1') {
  return zipSync({
    'manifest.json': strToU8(
      JSON.stringify({
        format: 'mere-emr-package',
        version: 1,
        createdAt: Date.UTC(2026, 7, 30),
        app: { name: 'mere-medical', version: 'shared-test' },
        tables: ['clinical_documents'],
        counts: { clinical_documents: 42, connection_documents: 2 },
      }),
    ),
    'tables/clinical_documents.json': strToU8('[]'),
    'tables/user_documents.json': strToU8(
      JSON.stringify([
        { id: patientId, first_name: 'Sam', last_name: 'Rivers' },
      ]),
    ),
  });
}

/** jsdom answers every media query the same way, so the branch is set here. */
function setViewport(desktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: desktop,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function renderWith(target: string, extra = '') {
  return render(
    <MemoryRouter
      initialEntries={[
        `/connections?package=${encodeURIComponent(target)}${extra}`,
      ]}
    >
      <SharedPackagePanel />
    </MemoryRouter>,
  );
}

describe('SharedPackagePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    // The package fixture's patient. An existing profile with the same id means
    // the records belong to the person already using the app.
    mockAllUsers = [profile('patient-1')];
    mockCurrentUser = { id: 'patient-1' };
    globalThis.MERE_TRUSTED_PACKAGE_ORIGINS = '';
  });

  it('renders nothing without the parameter', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/connections']}>
        <SharedPackagePanel />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe('');
  });

  /**
   * The guarantee the whole panel exists to make: a link can offer records, it
   * cannot write them. Nothing reaches the store until someone presses a button.
   */
  it('describes the package without importing any of it', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => packageBytes().buffer,
    });
    renderWith('https://example.org/records.emrpkg');

    await waitFor(() =>
      expect(screen.getByText('https://example.org')).toBeTruthy(),
    );
    expect(screen.getByText('42')).toBeTruthy();
    expect(mockImport).not.toHaveBeenCalled();
  });

  it('imports additively when the offer is accepted', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => packageBytes().buffer,
    });
    renderWith('https://example.org/records.emrpkg');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /add to my records/i }),
      ).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole('button', { name: /add to my records/i }));

    await waitFor(() => expect(mockImport).toHaveBeenCalled());
    // Adding, not replacing: a link must not be able to delete a record set.
    expect(mockImport.mock.calls[0][2]).toMatchObject({ replace: false });
  });

  /**
   * A package carries its own patient, and an additive import files records
   * under that patient rather than the profile in use — so a package about
   * somebody else opens a second profile. "Add to my records" was the one
   * reading of that which is wrong, and the one someone would act on before
   * handing over their phone.
   */
  it('offers a separate profile for a package about someone else', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => packageBytes('patient-2').buffer,
    });
    renderWith('https://example.org/records.emrpkg');

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /add as a separate profile/i }),
      ).toBeTruthy(),
    );
    expect(screen.getByText('Sam Rivers')).toBeTruthy();
    expect(screen.getByText(/open as a separate profile/i)).toBeTruthy();
    // Replacing a record set that this import would not touch anyway.
    expect(
      screen.queryByText(/replace my records instead/i)?.closest('details')
        ?.hidden,
    ).toBe(true);
  });

  it('just opens the records when there is no profile yet', async () => {
    mockAllUsers = [];
    mockCurrentUser = undefined;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => packageBytes('patient-9').buffer,
    });
    renderWith('https://example.org/records.emrpkg');

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /open these records/i }),
      ).toBeTruthy(),
    );
  });

  /**
   * A brand-new device is not empty: the app creates a blank profile on boot so
   * something is always selected. Counting it as a person made a first-ever
   * import announce that it was opening a profile "separate" from nothing.
   */
  it('treats the blank first-boot profile as an empty device', async () => {
    mockAllUsers = [placeholder('auto-1')];
    mockCurrentUser = { id: 'auto-1' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => packageBytes('patient-7').buffer,
    });
    renderWith('https://example.org/records.emrpkg');

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /open these records/i }),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(/separate profile/i)).toBeNull();
  });

  it('clears the blank profile away once real records land', async () => {
    mockAllUsers = [placeholder('auto-1')];
    mockCurrentUser = { id: 'auto-1' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => packageBytes('patient-7').buffer,
    });
    renderWith('https://example.org/records.emrpkg');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /open these records/i }),
      ).toBeTruthy(),
    );

    fireEvent.click(
      screen.getByRole('button', { name: /open these records/i }),
    );
    await waitFor(() => expect(mockRemovePlaceholders).toHaveBeenCalled());
  });

  it('refuses a scheme that is not http(s)', async () => {
    renderWith('javascript:alert(1)');
    await waitFor(() =>
      expect(screen.getByText(/not an http\(s\) address/i)).toBeTruthy(),
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  /**
   * A cross-origin block and a dead network are the same TypeError, and the
   * remedy is completely different — the message has to name the likely one.
   */
  it('explains a cross-origin block rather than reporting a network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new TypeError('Failed to fetch'),
    );
    renderWith('https://drive.google.com/records.emrpkg');
    await waitFor(() =>
      expect(screen.getByText(/Access-Control-Allow-Origin/)).toBeTruthy(),
    );
  });

  it('reports an HTTP failure with its status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    renderWith('https://example.org/gone.emrpkg');
    await waitFor(() =>
      expect(screen.getByText(/answered 404 Not Found/)).toBeTruthy(),
    );
  });

  it('rejects a file that is not a package', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => strToU8('hello there').buffer,
    });
    renderWith('https://example.org/notes.txt');
    await waitFor(() =>
      expect(
        screen.getByText(/does not point at a Mere package/i),
      ).toBeTruthy(),
    );
    expect(mockImport).not.toHaveBeenCalled();
  });
});

describe('SharedPackagePanel autoload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => packageBytes('patient-1').buffer,
    });
    mockAllUsers = [profile('patient-1')];
    mockCurrentUser = { id: 'patient-1' };
    globalThis.MERE_TRUSTED_PACKAGE_ORIGINS = '';
  });

  /**
   * The point of gating auto-import on the deployment rather than the link:
   * anyone can append `&autoload=1`, so honouring it on its own would remove
   * the one screen standing between a link somebody sent you and your record.
   */
  it('ignores autoload from an origin the deployment does not trust', async () => {
    renderWith('https://stranger.example/records.emrpkg', '&autoload=1');

    await waitFor(() =>
      expect(screen.getByText(/not on this app.s trusted list/i)).toBeTruthy(),
    );
    expect(mockImport).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /add to my records/i }),
    ).toBeTruthy();
  });

  it('imports without asking from a trusted origin', async () => {
    globalThis.MERE_TRUSTED_PACKAGE_ORIGINS = 'https://records.example';
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => packageBytes('patient-1').buffer,
    });
    renderWith('https://records.example/records.emrpkg', '&autoload=1');

    await waitFor(() => expect(mockImport).toHaveBeenCalled());
    // Additive even here: a trusted host may save a tap, not delete a record set.
    expect(mockImport.mock.calls[0][2]).toMatchObject({ replace: false });
  });

  it('reads a comma-separated list and tolerates a trailing slash', async () => {
    globalThis.MERE_TRUSTED_PACKAGE_ORIGINS =
      'https://a.example/, https://records.example';
    renderWith('https://records.example/records.emrpkg', '&autoload=1');
    await waitFor(() => expect(mockImport).toHaveBeenCalled());
  });

  it('still asks when the package is encrypted', async () => {
    globalThis.MERE_TRUSTED_PACKAGE_ORIGINS = 'https://records.example';
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      // A `MEREPKG1` envelope: encrypted, so its passphrase is not known yet.
      arrayBuffer: async () => strToU8('MEREPKG1' + '\u0000'.repeat(40)).buffer,
    });
    renderWith('https://records.example/records.emrpkg', '&autoload=1');

    await waitFor(() =>
      expect(screen.getByText(/this package is encrypted/i)).toBeTruthy(),
    );
    expect(mockImport).not.toHaveBeenCalled();
  });

  it('does nothing extra without the parameter', async () => {
    globalThis.MERE_TRUSTED_PACKAGE_ORIGINS = 'https://records.example';
    renderWith('https://records.example/records.emrpkg');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /add to my records/i }),
      ).toBeTruthy(),
    );
    expect(mockImport).not.toHaveBeenCalled();
  });
});

describe('SharedPackagePanel presentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => packageBytes('patient-1').buffer,
    });
    mockAllUsers = [profile('patient-1')];
    mockCurrentUser = { id: 'patient-1' };
    globalThis.MERE_TRUSTED_PACKAGE_ORIGINS = '';
    setViewport(false);
  });

  /**
   * On a phone the offer is the only reason the reader followed the link, and a
   * banner over a page they did not ask for reads like a notice rather than a
   * question. A sheet makes it the thing on screen — and gives it a close.
   */
  it('presents the offer as a dialog on a phone', async () => {
    renderWith('https://example.org/records.emrpkg');
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(screen.getByRole('button', { name: /^close$/i })).toBeTruthy();
  });

  it('stays in the page on a wider screen', async () => {
    setViewport(true);
    renderWith('https://example.org/records.emrpkg');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /add to my records/i }),
      ).toBeTruthy(),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  /**
   * Closing must not consume the package: the link is still the link, and
   * opening it again brings the same offer back.
   */
  it('closing dismisses without importing anything', async () => {
    renderWith('https://example.org/records.emrpkg');
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mockImport).not.toHaveBeenCalled();
  });
});
