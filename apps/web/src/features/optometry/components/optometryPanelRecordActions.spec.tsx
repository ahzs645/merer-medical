/**
 * @jest-environment jsdom
 */
import { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { OptometryRecord, OptometryRecordKind } from '../types';
import { CurrentPrescriptionPanel } from './CurrentPrescriptionPanel';
import { OcularRecordsPanel } from './OcularRecordsPanel';
import { OptometryCheckupHistoryPanel } from './OptometryCheckupHistoryPanel';
import { PrescriptionTimelinePanel } from './PrescriptionTimelinePanel';
import { SurgicalHistoryPanel } from './SurgicalHistoryPanel';

jest.mock('../../../app/providers/RxDbProvider', () => ({
  useRxDb: () => ({}),
}));
jest.mock('../../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: 'test-user' }),
}));
jest.mock('../../../app/providers/NotificationProvider', () => ({
  useNotificationDispatch: () => jest.fn(),
}));

function buildRecord(
  kind: OptometryRecordKind,
  manual: boolean,
): OptometryRecord {
  const id = `${kind}-${manual ? 'manual' : 'imported'}`;
  return {
    id,
    // `c-` prefixed connection ids are what manualRecordUtils treats as
    // hand-entered; anything else came from a provider feed.
    document: {
      id,
      connection_record_id: manual ? 'c-manual' : 'epic-connection',
      user_id: 'test-user',
      data_record: {
        raw: { resource: { resourceType: 'VisionPrescription' } },
        format: 'FHIR.R4',
        content_type: 'application/json',
        resource_type: 'visionprescription',
        version_history: [],
      },
      metadata: { id, date: '2024-07-08T00:00:00.000Z' },
    } as unknown as ClinicalDocument<unknown>,
    kind,
    title: `${kind} record`,
    date: '2024-07-08T00:00:00.000Z',
    metrics: {},
  };
}

function renderPanel(node: ReactElement) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

const panels: Array<{
  name: string;
  kind: OptometryRecordKind;
  render: (records: OptometryRecord[]) => ReactElement;
}> = [
  {
    name: 'OcularRecordsPanel',
    kind: 'diagnosis',
    render: (records) => <OcularRecordsPanel records={records} />,
  },
  {
    name: 'OptometryCheckupHistoryPanel',
    kind: 'checkup',
    render: (records) => <OptometryCheckupHistoryPanel records={records} />,
  },
  {
    name: 'CurrentPrescriptionPanel',
    kind: 'prescription',
    render: (records) => <CurrentPrescriptionPanel records={records} />,
  },
  {
    name: 'PrescriptionTimelinePanel',
    kind: 'prescription',
    render: (records) => <PrescriptionTimelinePanel records={records} />,
  },
  {
    name: 'SurgicalHistoryPanel',
    kind: 'surgery',
    render: (records) => <SurgicalHistoryPanel records={records} />,
  },
];

/**
 * Each of these panels used to offer a bare "Edit" text link to the full-page
 * form and no delete at all, so a hand-entered prescription, checkup or
 * surgery could not be removed from the page that listed it.
 */
describe.each(panels)(
  '$name manual record actions',
  ({ kind, render: mount }) => {
    it('offers edit and delete on a hand-entered record at a 44px target', () => {
      renderPanel(mount([buildRecord(kind, true)]));

      const edit = screen.getByRole('button', { name: 'Edit' });
      const remove = screen.getByRole('button', { name: 'Delete' });

      expect(edit.className).toContain('min-h-[44px]');
      expect(remove.className).toContain('min-h-[44px]');
    });

    it('no longer sends the correction through the full-page edit route', () => {
      const { container } = renderPanel(mount([buildRecord(kind, true)]));

      expect(container.querySelector('a[href$="/edit"]')).toBeNull();
    });

    it('leaves records synced from a provider untouched', () => {
      renderPanel(mount([buildRecord(kind, false)]));

      expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    });
  },
);
