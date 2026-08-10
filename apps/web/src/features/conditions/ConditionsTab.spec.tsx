/**
 * @jest-environment jsdom
 */
import { createElement } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { notifyRecordsChanged } from '../../shared/utils/recordChangeSignal';
import { ConditionsTab } from './ConditionsTab';

// `mock`-prefixed so the hoisted jest.mock factory below may reach it.
const mockCreateElement = createElement;

const mockDocsByType: Record<string, ClinicalDocument[]> = {};
const mockFind = jest.fn((query: { selector: Record<string, unknown> }) => ({
  exec: async () => {
    const selected = query.selector['data_record.resource_type'];
    const key = typeof selected === 'string' ? selected : '';
    return (mockDocsByType[key] ?? []).map((doc) => ({
      toMutableJSON: () => doc,
    }));
  },
}));
const mockDb = {
  clinical_documents: { find: mockFind },
  connection_documents: { find: () => ({ exec: async () => [] }) },
};

jest.mock('../../app/providers/RxDbProvider', () => ({
  useRxDb: () => mockDb,
}));
jest.mock('../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: 'user-1' }),
}));
// Stands in for the real Edit/Delete pair; this page's job is only to hand
// over the clinical document and to keep the buttons out of the row's link.
jest.mock('../manual-entry/ManualRecordActions', () => ({
  ManualRecordActions: ({ item }: { item: ClinicalDocument }) =>
    mockCreateElement('span', { 'data-testid': `actions-${item.id}` }),
}));

function conditionDoc(id: string, name: string, manual: boolean) {
  return {
    id,
    connection_record_id: 'conn-1',
    user_id: 'user-1',
    data_record: {
      raw: manual
        ? {
            fullUrl: `manual:${id}`,
            resource: {
              code: { text: name },
              clinicalStatus: { text: 'active' },
            },
          }
        : {
            resource: {
              code: { text: name },
              clinicalStatus: { text: 'active' },
            },
          },
      format: 'FHIR.R4',
      content_type: 'application/json',
      resource_type: 'condition',
      version_history: [],
    },
    metadata: { id, date: '2026-01-02T12:00:00.000Z', display_name: name },
  } as unknown as ClinicalDocument;
}

function renderTab() {
  return render(
    <MemoryRouter>
      <ConditionsTab />
    </MemoryRouter>,
  );
}

describe('ConditionsTab', () => {
  beforeEach(() => {
    mockFind.mockClear();
    for (const key of Object.keys(mockDocsByType)) delete mockDocsByType[key];
  });

  /**
   * "Add problem" (Problems) and "Add condition" (here) resolved to the same
   * `?type=condition` form and produced a record listed on both pages. One
   * record, one word; `returnTo` is what still differs.
   */
  it('names the record a condition and comes back here after saving', async () => {
    renderTab();

    await waitFor(() =>
      expect(screen.getByText('No conditions yet')).toBeTruthy(),
    );
    // Banner and empty state both, and both say the same thing.
    const links = screen.getAllByRole('link', { name: /Add condition/ });
    expect(links).toHaveLength(2);
    links.forEach((link) =>
      expect(link.getAttribute('href')).toBe(
        '/records/new?type=condition&returnTo=%2Frecords%2Fconditions',
      ),
    );
  });

  it('sends nobody to Problems to type a record this page can take', async () => {
    renderTab();

    await waitFor(() =>
      expect(screen.getByText('No conditions yet')).toBeTruthy(),
    );
    expect(screen.queryByRole('link', { name: /Go to Problems/ })).toBeNull();
  });

  it('keeps the Edit/Delete pair out of the row link', async () => {
    mockDocsByType['condition'] = [conditionDoc('typed-1', 'Migraine', true)];

    renderTab();

    await waitFor(() => expect(screen.getByText('Migraine')).toBeTruthy());
    const actions = screen.getByTestId('actions-typed-1');
    // Buttons nested inside an anchor are invalid markup, and the row would
    // navigate out from under the tap.
    expect(actions.closest('a')).toBeNull();
  });

  it('picks up a condition added while it is on screen', async () => {
    renderTab();
    await waitFor(() => expect(mockFind).toHaveBeenCalled());
    expect(screen.queryByText('Migraine')).toBeNull();

    mockDocsByType['condition'] = [conditionDoc('typed-1', 'Migraine', true)];
    act(() => notifyRecordsChanged());

    await waitFor(() => expect(screen.getByText('Migraine')).toBeTruthy());
  });
});
