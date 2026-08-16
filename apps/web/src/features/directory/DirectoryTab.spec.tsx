/**
 * @jest-environment jsdom
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { notifyRecordsChanged } from '../../shared/utils/recordChangeSignal';
import { DirectoryTab } from './DirectoryTab';

const mockDocsByType: Record<string, ClinicalDocument[]> = {};
// The directory reads every record now — a clinician named as the performer on
// a report is as much a provider as a care-team member — so an unfiltered
// query has to come back with everything rather than nothing.
const mockFind = jest.fn((query: { selector: Record<string, unknown> }) => ({
  exec: async () => {
    const type = query.selector['data_record.resource_type'];
    const docs = type
      ? mockDocsByType[String(type)] ?? []
      : Object.values(mockDocsByType).flat();
    return docs.map((doc) => ({ toMutableJSON: () => doc }));
  },
}));
const mockDb = { clinical_documents: { find: mockFind } };

jest.mock('../../app/providers/RxDbProvider', () => ({
  useRxDb: () => mockDb,
}));
jest.mock('../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: 'user-1' }),
}));

function encounterDoc(id: string, location: string) {
  return {
    id,
    connection_record_id: 'conn-1',
    user_id: 'user-1',
    data_record: {
      raw: { resource: { location: [{ location: { display: location } }] } },
      format: 'FHIR.R4',
      content_type: 'application/json',
      resource_type: 'encounter',
      version_history: [],
    },
    metadata: { id, date: '2026-01-02T12:00:00.000Z' },
  } as unknown as ClinicalDocument;
}

describe('DirectoryTab', () => {
  beforeEach(() => {
    mockFind.mockClear();
    for (const key of Object.keys(mockDocsByType)) delete mockDocsByType[key];
  });

  /**
   * This list is built out of visits, so a visit added without leaving the
   * page has to grow it. It reloaded only on remount, which the
   * save-then-navigate flow happened to provide.
   */
  it('picks up a location added while it is on screen', async () => {
    // Inside a router because the search box is URL state now — unlike the
    // earlier scroll-restoration mistake, this page really is only ever
    // rendered inside one.
    render(
      <MemoryRouter>
        <DirectoryTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(mockFind).toHaveBeenCalled());
    expect(screen.queryByText('Jasper Healthcare Centre')).toBeNull();

    mockDocsByType['encounter'] = [
      encounterDoc('visit-1', 'Jasper Healthcare Centre 518 Robson Street'),
    ];
    act(() => notifyRecordsChanged());

    await waitFor(() =>
      expect(screen.getByText('Jasper Healthcare Centre')).toBeTruthy(),
    );
  });
});
