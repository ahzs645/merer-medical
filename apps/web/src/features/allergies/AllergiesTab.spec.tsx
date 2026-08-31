/**
 * @jest-environment jsdom
 */
import { createElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { isManualRecord } from '../../shared/utils/manualRecordUtils';
import { AllergiesTab } from './AllergiesTab';

// `mock`-prefixed so the hoisted jest.mock factories below may reach them.
const mockCreateElement = createElement;
const mockIsManualRecord = isManualRecord;

let mockAllergyDocs: ClinicalDocument[] = [];
const mockDb = {
  clinical_documents: {
    find: () => ({
      exec: async () =>
        mockAllergyDocs.map((doc) => ({ toMutableJSON: () => doc })),
    }),
  },
  connection_documents: { find: () => ({ exec: async () => [] }) },
};

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
jest.mock('../manual-entry/ManualSourceDocumentLink', () => ({
  ManualSourceDocumentLink: ({ item }: { item: ClinicalDocument }) =>
    mockCreateElement('span', { 'data-testid': `source-${item.id}` }),
}));
jest.mock('../manual-entry/ManualRecordModal', () => ({
  ManualRecordModal: ({ open }: { open: boolean }) =>
    open
      ? mockCreateElement('div', { 'data-testid': 'add-allergy-dialog' })
      : null,
}));

function makeDoc(id: string, name: string, manual: boolean): ClinicalDocument {
  return {
    id,
    connection_record_id: 'conn-1',
    user_id: 'user-1',
    data_record: {
      raw: manual
        ? { fullUrl: `manual:${id}`, resource: { code: { text: name } } }
        : { resource: { code: { text: name } } },
      format: 'FHIR.R4',
      content_type: 'application/json',
      resource_type: 'allergyintolerance',
      version_history: [],
    },
    metadata: { id, date: '2026-01-02T12:00:00.000Z', display_name: name },
  } as unknown as ClinicalDocument;
}

function renderTab() {
  return render(
    <MemoryRouter>
      <AllergiesTab />
    </MemoryRouter>,
  );
}

describe('AllergiesTab negations', () => {
  beforeEach(() => {
    mockAllergyDocs = [];
  });

  /**
   * "No Known Allergies" used to get a full record card with five actions —
   * the same weight as a real allergen, for a record saying there is nothing
   * here. A portal that sends "Not on File" three times produced three of them.
   */
  it('states an asserted negative instead of listing it as a record', async () => {
    mockAllergyDocs = [makeDoc('nka', 'No Known Allergies', true)];
    renderTab();

    await waitFor(() => {
      expect(screen.getByText('No Known Allergies')).toBeTruthy();
    });
    expect(screen.getByText('0 allergens')).toBeTruthy();
    expect(screen.queryByText('Also recorded')).toBeNull();
    expect(screen.queryByText('Not an allergen')).toBeNull();
    expect(screen.queryByTestId('actions-nka')).toBeNull();
  });

  /**
   * An empty list means nobody wrote anything down; a negation means somebody
   * asked. The page has to be able to say which.
   */
  it('says something different when nothing was recorded at all', async () => {
    renderTab();
    // With no records of any kind the page-level empty state answers, and it
    // says "recorded yet" — the honest phrasing for never-asked, and the thing
    // an asserted negative replaces.
    await waitFor(() => {
      expect(screen.getByText('No allergies recorded yet.')).toBeTruthy();
    });
    expect(screen.queryByText(/No Known Allergies/i)).toBeNull();
  });

  it('does not put a negation beside an allergen that contradicts it', async () => {
    mockAllergyDocs = [
      makeDoc('perfume', 'Perfume', true),
      makeDoc('nka', 'No Known Allergies', true),
    ];
    renderTab();

    await waitFor(() => {
      expect(screen.getByText('Perfume')).toBeTruthy();
    });
    expect(screen.getByText('1 allergen')).toBeTruthy();
    // Named once, quietly, rather than shown as a peer of the allergen it
    // disagrees with — where it could be read as covering it.
    expect(
      screen.queryByRole('heading', { name: 'No Known Allergies' }),
    ).toBeNull();
    expect(screen.getByText(/recorded .No Known Allergies./i)).toBeTruthy();
  });
});

describe('AllergiesTab', () => {
  beforeEach(() => {
    mockAllergyDocs = [];
  });

  /**
   * The dialog used to live inside `RecordListPage`'s `children`, which only
   * render once the list has something in it — so the button above an empty
   * list did nothing, on the one screen a brand-new user is most likely to
   * reach for first.
   */
  it.each([0, 1])(
    'opens the add dialog from an empty list (button %i)',
    async (index) => {
      renderTab();

      await waitFor(() =>
        expect(screen.getByText('No allergies recorded yet.')).toBeTruthy(),
      );
      const buttons = screen.getAllByRole('button', { name: 'Add allergy' });
      // One in the banner, one under the empty-state text.
      expect(buttons).toHaveLength(2);

      fireEvent.click(buttons[index]);
      expect(screen.getByTestId('add-allergy-dialog')).toBeTruthy();
    },
  );

  it('drops the second add button once allergies exist', async () => {
    mockAllergyDocs = [makeDoc('typed-1', 'Penicillin', true)];

    renderTab();

    await waitFor(() => expect(screen.getByText('Penicillin')).toBeTruthy());
    expect(screen.getAllByRole('button', { name: 'Add allergy' })).toHaveLength(
      1,
    );
  });

  it('offers Edit and Delete on the allergies you typed, not on synced ones', async () => {
    mockAllergyDocs = [
      makeDoc('typed-1', 'Penicillin', true),
      makeDoc('synced-1', 'Latex', false),
    ];

    renderTab();

    await waitFor(() => expect(screen.getByText('Penicillin')).toBeTruthy());
    expect(screen.getByTestId('actions-typed-1')).toBeTruthy();
    expect(screen.queryByTestId('actions-synced-1')).toBeNull();
  });
});
