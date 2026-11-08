/** @jest-environment jsdom */
import { createElement } from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { BundleEntry, FhirResource } from 'fhir/r2';

import { ElementsByDateListCard } from './ElementsByDateListCard';
import { ClinicalDocument } from '../../../../models/clinical-document/ClinicalDocument.type';

type TestRecord = ClinicalDocument<BundleEntry<FhirResource>>;

// The grouped card decides which records reach each full detail card. Keep
// that boundary observable without connecting the individual cards to a DB.
function mockDetailCard({ item }: { item: TestRecord }) {
  return createElement(
    'article',
    { 'data-testid': 'record-detail', 'data-record-id': item.id },
    item.metadata?.display_name,
  );
}

jest.mock('../../../connections/hooks/useConnectionDoc', () => ({
  useConnectionDocs: () => [],
}));
jest.mock('../../../../shared/hooks/useClinicalDoc', () => ({
  useClinicalDoc: () => undefined,
}));
jest.mock('../../../../shared/hooks/useIntersectionObserver', () => ({
  __esModule: true,
  default: () => undefined,
}));
jest.mock('../../../../app/providers/InterfaceLanguageProvider', () => ({
  useInterfaceLanguage: () => ({ t: (text: string) => text }),
}));
jest.mock(
  '../document-reference/ShowDocumentReferenceAttachmentExpandable',
  () => ({
    checkIfXmlIsCCDA: () => false,
  }),
);
jest.mock('../document-reference/parseCCDA/parseCCDA', () => ({
  parseCCDA: () => ({}),
}));
jest.mock('../cards/AllergyIntoleranceCard', () => ({
  AllergyIntoleranceCard: mockDetailCard,
}));
jest.mock('../cards/AppointmentCard', () => ({
  AppointmentCard: mockDetailCard,
}));
jest.mock('../cards/CarePlanCard', () => ({ CarePlanCard: mockDetailCard }));
jest.mock('../cards/CareTeamCard', () => ({ CareTeamCard: mockDetailCard }));
jest.mock('../cards/ConditionCard', () => ({ ConditionCard: mockDetailCard }));
jest.mock('../cards/ConsentCard', () => ({ ConsentCard: mockDetailCard }));
jest.mock('../cards/CoverageCard', () => ({ CoverageCard: mockDetailCard }));
jest.mock('../cards/DiagnosticReportCard', () => ({
  DiagnosticReportCard: mockDetailCard,
}));
jest.mock('../cards/DocumentReferenceCard', () => ({
  DocumentReferenceCard: mockDetailCard,
  DocumentReferenceAttachmentCard: mockDetailCard,
}));
jest.mock('../cards/EncounterCard', () => ({ EncounterCard: mockDetailCard }));
jest.mock('../cards/GoalCard', () => ({ GoalCard: mockDetailCard }));
jest.mock('../cards/FamilyMemberHistoryCard', () => ({
  FamilyMemberHistoryCard: mockDetailCard,
}));
jest.mock('../cards/ImmunizationCard', () => ({
  ImmunizationCard: mockDetailCard,
}));
jest.mock('../cards/MedicationCard', () => ({
  MedicationCard: mockDetailCard,
}));
jest.mock('../cards/MedicationOrderCard', () => ({
  MedicationOrderCard: mockDetailCard,
}));
jest.mock('../cards/MedicationRequestCard', () => ({
  MedicationRequestCard: mockDetailCard,
}));
jest.mock('../cards/ObservationCard', () => ({
  ObservationCard: mockDetailCard,
}));
jest.mock('../cards/ProcedureCard', () => ({ ProcedureCard: mockDetailCard }));
jest.mock('../cards/SpecimenCard', () => ({ SpecimenCard: mockDetailCard }));
jest.mock('../cards/ServiceRequestCard', () => ({
  ServiceRequestCard: mockDetailCard,
}));

function records(
  type: TestRecord['data_record']['resource_type'],
  count: number,
  prefix: string = type,
): TestRecord[] {
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    return {
      id: `${prefix}-${number}`,
      connection_record_id: 'synthetic-connection',
      user_id: 'synthetic-profile',
      data_record: {
        resource_type: type,
        format: 'FHIR.DSTU2',
        content_type: 'application/json',
        version_history: [],
        raw: {
          resource: {
            resourceType: type,
            // Encounters need a class or location to have a visible summary.
            class: type === 'encounter' ? 'outpatient' : undefined,
          },
        },
      },
      metadata: {
        display_name: `${prefix} ${number}`,
        date: '2026-02-01T12:00:00.000Z',
      },
    } as unknown as TestRecord;
  });
}

function expectEveryDetail(items: TestRecord[]) {
  const control = screen.getByRole('button', { name: 'View less' });
  expect(control.getAttribute('aria-expanded')).toBe('true');
  const details = document.getElementById(
    control.getAttribute('aria-controls')!,
  );
  expect(details).not.toBeNull();
  const shownIds = within(details!)
    .getAllByTestId('record-detail')
    .map((record) => record.getAttribute('data-record-id'))
    .sort();
  expect(shownIds).toEqual(items.map((item) => item.id).sort());
}

describe('grouped timeline previews', () => {
  it('bounds a busy day while View more retains all conditions, medications and allergies', async () => {
    const items = [
      ...records('condition', 23),
      ...records('medicationstatement', 9),
      ...records('medicationrequest', 6),
      ...records('medicationorder', 2),
      ...records('allergyintolerance', 8),
    ];
    const original = JSON.stringify(items);
    render(<ElementsByDateListCard itemList={items} />);

    for (const label of ['Conditions', 'Medications', 'Allergies']) {
      const preview = screen.getByRole('list', { name: label });
      expect(within(preview).getAllByRole('listitem')).toHaveLength(5);
    }
    ['... and 18 more', '... and 12 more', '... and 3 more'].forEach((label) =>
      expect(screen.getByText(label)).toBeTruthy(),
    );
    expect(screen.queryByText('condition 06')).toBeNull();
    expect(screen.queryByText('allergyintolerance 06')).toBeNull();
    expect(screen.queryByTestId('record-detail')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'View more' }));
    expectEveryDetail(items);

    fireEvent.click(screen.getByRole('button', { name: 'View less' }));
    await waitFor(() =>
      expect(screen.queryByTestId('record-detail')).toBeNull(),
    );
    expect(
      screen
        .getByRole('button', { name: 'View more' })
        .getAttribute('aria-expanded'),
    ).toBe('false');
    expect(JSON.stringify(items)).toBe(original);
  });

  it('shares one medication limit across statements, requests and orders', () => {
    const items = [
      ...records('medicationstatement', 3, 'Statement'),
      ...records('medicationrequest', 4, 'Request'),
      ...records('medicationorder', 2, 'Order'),
    ];
    render(<ElementsByDateListCard itemList={items} />);

    const preview = screen.getByRole('list', { name: 'Medications' });
    expect(
      within(preview)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual([
      'Statement 01',
      'Statement 02',
      'Statement 03',
      'Request 01',
      'Request 02',
    ]);
    expect(screen.getByText('... and 4 more')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'View more' }));
    expectEveryDetail(items);
  });

  it.each([1, 5])(
    'does not imply missing records for a %i-item category',
    (count) => {
      render(<ElementsByDateListCard itemList={records('condition', count)} />);

      expect(
        within(screen.getByRole('list', { name: 'Conditions' })).getAllByRole(
          'listitem',
        ),
      ).toHaveLength(count);
      expect(screen.queryByText(/^\.\.\. and \d+ more$/)).toBeNull();
    },
  );

  it.each<[TestRecord['data_record']['resource_type'], string]>([
    ['encounter', 'Encounters'],
    ['procedure', 'Procedures'],
    ['consent', 'Consents'],
    ['immunization', 'Immunizations'],
    ['coverage', 'Coverage'],
    ['careplan', 'Care Plans'],
    ['careteam', 'Care Teams'],
    ['servicerequest', 'Referrals'],
    ['goal', 'Goals'],
    ['appointment', 'Appointments'],
    ['specimen', 'Specimens'],
    ['familymemberhistory', 'Family History'],
    ['diagnosticreport', 'Lab Panels'],
    ['observation', 'Labs'],
    ['documentreference', 'Documents'],
  ])(
    'keeps the same preview limit and complete detail for %s records',
    (type, label) => {
      const items = records(type, 6);
      render(<ElementsByDateListCard itemList={items} />);

      expect(
        within(screen.getByRole('list', { name: label })).getAllByRole(
          'listitem',
        ),
      ).toHaveLength(5);
      expect(screen.getByText('... and 1 more')).toBeTruthy();
      expect(screen.queryByTestId('record-detail')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'View more' }));
      expectEveryDetail(items);
    },
  );
});
