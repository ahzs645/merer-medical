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
