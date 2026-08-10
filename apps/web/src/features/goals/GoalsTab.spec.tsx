/**
 * @jest-environment jsdom
 */
import { createElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { isManualRecord } from '../../shared/utils/manualRecordUtils';
import { GoalsTab } from './GoalsTab';

// `mock`-prefixed so the hoisted jest.mock factory below may reach them.
const mockCreateElement = createElement;
const mockIsManualRecord = isManualRecord;

let mockGoalDocs: ClinicalDocument[] = [];
const mockDb = {
  clinical_documents: {
    find: () => ({
      exec: async () =>
        mockGoalDocs.map((doc) => ({ toMutableJSON: () => doc })),
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

function goalDoc(id: string, name: string, manual: boolean) {
  return {
    id,
    connection_record_id: 'conn-1',
    user_id: 'user-1',
    data_record: {
      raw: manual
        ? { fullUrl: `manual:${id}`, resource: { description: { text: name } } }
        : { resource: { description: { text: name } } },
      format: 'FHIR.R4',
      content_type: 'application/json',
      resource_type: 'goal',
      version_history: [],
    },
    metadata: { id, date: '2026-01-02T12:00:00.000Z', display_name: name },
  } as unknown as ClinicalDocument;
}

function renderTab() {
  return render(
    <MemoryRouter>
      <GoalsTab />
    </MemoryRouter>,
  );
}

describe('GoalsTab', () => {
  beforeEach(() => {
    mockGoalDocs = [];
  });

  it('offers the add link from the empty state as well as the banner', async () => {
    renderTab();

    await waitFor(() =>
      expect(screen.getByText('No health goals recorded yet.')).toBeTruthy(),
    );
    const links = screen.getAllByRole('link', { name: /Add goal/ });
    expect(links).toHaveLength(2);
    links.forEach((link) =>
      expect(link.getAttribute('href')).toBe(
        '/records/new?type=goal&returnTo=%2Frecords%2Fgoals',
      ),
    );
  });

  it('offers Edit and Delete on the goals you typed, not on synced ones', async () => {
    mockGoalDocs = [
      goalDoc('typed-1', 'Walk 30 minutes daily', true),
      goalDoc('synced-1', 'Lower A1c', false),
    ];

    renderTab();

    await waitFor(() =>
      expect(screen.getByText('Walk 30 minutes daily')).toBeTruthy(),
    );
    expect(screen.getByTestId('actions-typed-1')).toBeTruthy();
    expect(screen.queryByTestId('actions-synced-1')).toBeNull();
    // The banner link is the only add affordance once the list has rows.
    expect(screen.getAllByRole('link', { name: /Add goal/ })).toHaveLength(1);
  });
});
