/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { ImmunizationRecord } from '../types';
import { ImmunizationTimelinePanel } from './ImmunizationTimelinePanel';

jest.mock('../../../app/providers/RxDbProvider', () => ({
  useRxDb: () => ({}),
}));
jest.mock('../../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: 'test-user' }),
}));
jest.mock('../../../app/providers/NotificationProvider', () => ({
  useNotificationDispatch: () => jest.fn(),
}));

function buildDocument(
  id: string,
  connectionRecordId: string,
): ClinicalDocument<unknown> {
  return {
    id,
    connection_record_id: connectionRecordId,
    user_id: 'test-user',
    data_record: {
      raw: { resource: { resourceType: 'Immunization' } },
      format: 'FHIR.R4',
      content_type: 'application/json',
      resource_type: 'immunization',
      version_history: [],
    },
    metadata: { id, date: '2024-03-02T00:00:00.000Z' },
  } as unknown as ClinicalDocument<unknown>;
}

function buildRecord(
  id: string,
  connectionRecordId: string,
): ImmunizationRecord {
  return {
    id,
    document: buildDocument(id, connectionRecordId),
    vaccineKey: 'influenza' as ImmunizationRecord['vaccineKey'],
    vaccineName: `Vaccine ${id}`,
    date: '2024-03-02T00:00:00.000Z',
  };
}

// `c-` prefixed connection ids are what manualRecordUtils treats as hand-entered.
const MANUAL = buildRecord('manual-dose', 'c-manual');
const IMPORTED = buildRecord('imported-dose', 'epic-connection');

function renderPanel(records: ImmunizationRecord[]) {
  return render(
    <MemoryRouter>
      <ImmunizationTimelinePanel records={records} />
    </MemoryRouter>,
  );
}

/**
 * The timeline used to offer a bare "Edit" text link — 21px wide, no delete —
 * so a mistyped dose could only be corrected by leaving the page and could not
 * be removed at all.
 */
describe('ImmunizationTimelinePanel manual record actions', () => {
  it('offers edit, and delete under More actions, on a hand-entered dose', async () => {
    renderPanel([MANUAL]);

    const edit = screen.getByRole('button', { name: 'Edit' });
    const more = screen.getByRole('button', { name: 'More actions' });

    // Drawn at 32px on wider screens, with an invisible tap area around it.
    for (const button of [edit, more]) {
      expect(button.className).toContain('min-h-8');
      expect(button.className).toContain('after:-inset-y-1.5');
    }
    // Delete is the menu's last item, not a red button on every card.
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    fireEvent.click(more);
    expect(
      await screen.findByRole('menuitem', { name: 'Delete' }),
    ).toBeTruthy();
  });

  it('no longer sends the correction through the full-page edit route', () => {
    const { container } = renderPanel([MANUAL]);

    expect(
      container.querySelector('a[href="/records/manual-dose/edit"]'),
    ).toBeNull();
  });

  it('leaves records synced from a provider untouched', () => {
    renderPanel([IMPORTED]);

    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });
});
