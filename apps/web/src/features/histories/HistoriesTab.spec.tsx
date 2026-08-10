/**
 * @jest-environment jsdom
 */
import { createElement } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { isManualRecord } from '../../shared/utils/manualRecordUtils';
import { notifyRecordsChanged } from '../../shared/utils/recordChangeSignal';
import { HistoriesTab } from './HistoriesTab';

// `mock`-prefixed so the hoisted jest.mock factory below may reach them.
const mockCreateElement = createElement;
const mockIsManualRecord = isManualRecord;

const mockDocsByType: Record<string, ClinicalDocument[]> = {};
const mockFind = jest.fn((query: { selector: Record<string, unknown> }) => ({
  exec: async () =>
    (
      mockDocsByType[String(query.selector['data_record.resource_type'])] ?? []
    ).map((doc) => ({ toMutableJSON: () => doc })),
}));
const mockDb = { clinical_documents: { find: mockFind } };

jest.mock('../../app/providers/RxDbProvider', () => ({
  useRxDb: () => mockDb,
}));
jest.mock('../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: 'user-1' }),
}));
// Stands in for the real Edit/Delete pair, keeping the one thing this page is
// responsible for: handing over the clinical document so the shared
// manual-record check can run on it.
jest.mock('../manual-entry/ManualRecordActions', () => ({
  ManualRecordActions: ({ item }: { item: ClinicalDocument }) =>
    mockIsManualRecord(item)
      ? mockCreateElement('span', { 'data-testid': `actions-${item.id}` })
      : null,
}));

function makeDoc(
  overrides: Partial<ClinicalDocument> & {
    id: string;
    resourceType: string;
    name: string;
  },
): ClinicalDocument {
  const { id, resourceType, name, ...rest } = overrides;
  return {
    id,
    connection_record_id: 'conn-1',
    user_id: 'user-1',
    data_record: {
      raw: { resource: { code: { text: name } } },
      format: 'FHIR.R4',
      content_type: 'application/json',
      resource_type: resourceType,
      version_history: [],
    },
    metadata: { id, date: '2026-01-02T12:00:00.000Z', display_name: name },
    ...rest,
  } as unknown as ClinicalDocument;
}

/** A record typed on this device: the `manual:` full URL is the shared tell. */
function manualDoc(id: string, resourceType: string, name: string) {
  const doc = makeDoc({ id, resourceType, name });
  doc.data_record.raw = {
    fullUrl: `manual:${id}`,
    resource: { code: { text: name } },
  };
  return doc;
}

function renderTab() {
  return render(
    <MemoryRouter>
      <HistoriesTab />
    </MemoryRouter>,
  );
}

describe('HistoriesTab', () => {
  beforeEach(() => {
    mockFind.mockClear();
    for (const key of Object.keys(mockDocsByType)) delete mockDocsByType[key];
  });

  /**
   * "Add history" used to be the one banner button with no preset: it opened
   * the sixteen-card picker and left the reader to work out that this page is
   * fed by four unrelated record kinds. Each section now names its own.
   */
  it.each([
    ['Add condition', 'condition'],
    ['Add procedure', 'procedure'],
    ['Add family history', 'familymemberhistory'],
    ['Add social history', 'socialhistory'],
  ])('presets %s and comes back here after saving', (label, type) => {
    renderTab();

    expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe(
      `/records/new?type=${type}&returnTo=%2Frecords%2Fhistories`,
    );
  });

  it('leaves no add link pointing at the bare record picker', () => {
    renderTab();

    screen.getAllByRole('link').forEach((link) => {
      expect(link.getAttribute('href')).not.toBe('/records/new');
    });
  });

  it('offers Edit and Delete on the rows you typed, not on synced ones', async () => {
    mockDocsByType['condition'] = [
      manualDoc('typed-1', 'condition', 'Sprained ankle'),
      makeDoc({ id: 'synced-1', resourceType: 'condition', name: 'Asthma' }),
    ];

    renderTab();

    await waitFor(() =>
      expect(screen.getByText('Sprained ankle')).toBeTruthy(),
    );
    expect(screen.getByTestId('actions-typed-1')).toBeTruthy();
    expect(screen.queryByTestId('actions-synced-1')).toBeNull();
  });

  /**
   * This list only reloaded on remount, which the save-then-navigate flow
   * happened to provide. Anything that adds a record without leaving the page
   * (a modal, an inline edit) left the reader looking at stale rows.
   */
  it('picks up a record added while it is on screen', async () => {
    renderTab();
    await waitFor(() => expect(mockFind).toHaveBeenCalled());
    expect(screen.queryByText('Tonsillectomy')).toBeNull();

    mockDocsByType['procedure'] = [
      manualDoc('typed-2', 'procedure', 'Tonsillectomy'),
    ];
    act(() => notifyRecordsChanged());

    await waitFor(() => expect(screen.getByText('Tonsillectomy')).toBeTruthy());
  });
});
