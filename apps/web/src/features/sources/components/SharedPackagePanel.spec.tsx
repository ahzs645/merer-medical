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

jest.mock('../../../app/providers/RxDbProvider', () => ({
  useRxDb: () => ({}),
}));
jest.mock('../../../app/providers/NotificationProvider', () => ({
  useNotificationDispatch: () => mockNotify,
}));
jest.mock('../../../services/emrpkg', () => ({
  importEmrpkgToRxDb: (...args: unknown[]) => mockImport(...(args as [])),
  inspectEmrpkg: jest.requireActual('@mere/local-dexie').inspectEmrpkg,
}));

function packageBytes() {
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
  });
}

function renderWith(target: string) {
  return render(
    <MemoryRouter
      initialEntries={[`/connections?package=${encodeURIComponent(target)}`]}
    >
      <SharedPackagePanel />
    </MemoryRouter>,
  );
}

describe('SharedPackagePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
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
