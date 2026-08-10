/**
 * @jest-environment jsdom
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { notifyRecordsChanged } from '../../shared/utils/recordChangeSignal';
import { VitalsTab } from './VitalsTab';

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
const mockDb = { clinical_documents: { find: mockFind } };

jest.mock('../../app/providers/RxDbProvider', () => ({
  useRxDb: () => mockDb,
}));
jest.mock('../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: 'user-1' }),
}));

function vitalDoc({
  id,
  name,
  loinc,
  date,
  value,
  unit,
}: {
  id: string;
  name: string;
  loinc: string;
  date: string;
  value: number;
  unit: string;
}): ClinicalDocument {
  return {
    id,
    connection_record_id: 'conn-1',
    user_id: 'user-1',
    data_record: {
      raw: {
        resource: {
          resourceType: 'Observation',
          category: [{ coding: [{ code: 'vital-signs' }] }],
          code: { text: name, coding: [{ code: loinc, display: name }] },
          effectiveDateTime: date,
          valueQuantity: { value, unit },
        },
      },
      format: 'FHIR.R4',
      content_type: 'application/json',
      resource_type: 'observation',
      version_history: [],
    },
    metadata: { id, date, display_name: name },
  } as unknown as ClinicalDocument;
}

/** Body mass index, one reading a year, newest first — the demo's shape. */
function bmiHistory(years: number[]): ClinicalDocument[] {
  return years.map((year, index) =>
    vitalDoc({
      id: `bmi-${year}`,
      name: 'Body Mass Index',
      loinc: '39156-5',
      date: `${year}-03-15`,
      value: 20 - index * 0.3,
      unit: 'kg/m2',
    }),
  );
}

function renderTab() {
  return render(
    <MemoryRouter>
      <VitalsTab />
    </MemoryRouter>,
  );
}

function historyDisclosure(): HTMLDetailsElement {
  const summary = screen.getByText(/earlier readings?$/);
  const details = summary.closest('details');
  if (!details) throw new Error('history summary is not inside a <details>');
  return details as HTMLDetailsElement;
}

describe('VitalsTab history disclosure', () => {
  beforeEach(() => {
    mockFind.mockClear();
    for (const key of Object.keys(mockDocsByType)) delete mockDocsByType[key];
  });

  it('arrives with the newest reading and the graph out, and the rest folded away', async () => {
    mockDocsByType['observation'] = bmiHistory([2026, 2025, 2024]);

    const { container } = renderTab();

    await waitFor(() =>
      expect(screen.getByText('Body Mass Index')).toBeTruthy(),
    );
    // The one row worth seeing on arrival is the headline, not a table row.
    expect(screen.getByText('20 kg/m²')).toBeTruthy();
    expect(screen.getByText('Mar 15, 2026')).toBeTruthy();
    // The sparkline is the point of collapsing the rows, so it must survive.
    expect(container.querySelector('article svg')).toBeTruthy();
    expect(historyDisclosure().open).toBe(false);
  });

  it('says how many readings the trigger opens, and reaches 44px', async () => {
    mockDocsByType['observation'] = bmiHistory([2026, 2025, 2024]);

    renderTab();

    await waitFor(() =>
      expect(screen.getByText('2 earlier readings')).toBeTruthy(),
    );
    const summary = screen.getByText('2 earlier readings');
    expect(summary.getAttribute('aria-label')).toBe(
      '2 earlier readings for Body Mass Index',
    );
    expect(summary.className).toContain('min-h-[44px]');
  });

  it('counts one hidden reading in the singular', async () => {
    mockDocsByType['observation'] = bmiHistory([2026, 2025]);

    renderTab();

    await waitFor(() =>
      expect(screen.getByText('1 earlier reading')).toBeTruthy(),
    );
  });

  it('gives a vital with a single reading nothing to open', async () => {
    mockDocsByType['observation'] = bmiHistory([2026]);

    renderTab();

    await waitFor(() =>
      expect(screen.getByText('Body Mass Index')).toBeTruthy(),
    );
    // The only reading is already the headline; a disclosure here would open
    // onto a row the card is showing.
    expect(screen.queryByText(/earlier reading/)).toBeNull();
  });

  it('keeps an opened history open when a record change refreshes the page', async () => {
    mockDocsByType['observation'] = bmiHistory([2026, 2025, 2024]);

    renderTab();

    await waitFor(() =>
      expect(screen.getByText('2 earlier readings')).toBeTruthy(),
    );
    const details = historyDisclosure();
    act(() => {
      screen.getByText('2 earlier readings').click();
    });
    expect(details.open).toBe(true);
    expect(screen.getByText('Mar 15, 2024')).toBeTruthy();

    // Adding a vital re-runs the query underneath whoever is reading the
    // history; the list must not blink back to the loading placeholder and
    // take the open disclosure down with it.
    mockDocsByType['observation'] = [
      ...bmiHistory([2026, 2025, 2024]),
      vitalDoc({
        id: 'weight-2026',
        name: 'Weight',
        loinc: '29463-7',
        date: '2026-03-15',
        value: 70,
        unit: 'kg',
      }),
    ];
    act(() => notifyRecordsChanged());

    await waitFor(() => expect(screen.getByText('Weight')).toBeTruthy());
    expect(screen.queryByText('Loading vital signs…')).toBeNull();
    expect(historyDisclosure().open).toBe(true);
  });
});
