/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';

import { ResultsDigestCard } from './ResultsDigestCard';
import { ResultsTab } from './ResultsTab';
import { ResultDetail } from './types';
import { useResultsData } from './hooks/useResultsData';

jest.mock('./hooks/useResultsData', () => ({ useResultsData: jest.fn() }));
jest.mock('../labs/hooks/useLabReferenceStandard', () => ({
  useLabReferenceStandard: () => ['canadian', jest.fn()],
}));
jest.mock('../labs/components/LabHistoryChart', () => ({
  LabHistoryChart: () => null,
}));
jest.mock('../labs/components/LabHistoryTable', () => ({
  LabHistoryTable: () => null,
}));
jest.mock('../labs/components/LabReferenceOverlayControls', () => ({
  LabReferenceOverlayControls: () => null,
}));
jest.mock('../labs/components/LabReferenceStandardControl', () => ({
  LabReferenceStandardControl: () => null,
}));

const mockResults = useResultsData as jest.MockedFunction<
  typeof useResultsData
>;

function result(
  id: string,
  title: string,
  type: ResultDetail['type'],
): ResultDetail {
  return {
    id,
    detailId: id,
    type,
    title,
    date: '2026-01-01',
    status: 'final',
    abnormal: false,
    linkedDocumentCount: 0,
    document: {
      id,
      user_id: 'synthetic-user',
      connection_record_id: 'synthetic-source',
      data_record: {
        resource_type:
          type === 'lab'
            ? 'observation'
            : type === 'document'
              ? 'documentreference'
              : 'diagnosticreport',
        raw: { resource: {} },
        format: 'FHIR.R4',
        content_type: 'application/json',
        version_history: [],
      },
      metadata: {
        id: `metadata/${id}`,
        display_name: title,
        ...(type === 'lab'
          ? { manual_specialty: 'laboratory', loinc_coding: ['2345-7'] }
          : {}),
      },
    },
    narrative: `${title} narrative`,
    providerComments: [],
    linkedDocuments: [],
    downloadAvailable: false,
    shareAvailable: true,
    referenceMode: 'canadian',
  };
}

beforeEach(() => {
  const results = [
    result('first', 'Glucose', 'lab'),
    result('report/second', 'Second report', 'diagnostic-report'),
    result('document/third', 'Third document', 'document'),
  ];
  mockResults.mockReturnValue({
    groups: [{ id: 'synthetic-group', title: 'Synthetic results', results }],
    detailsById: new Map(results.map((entry) => [entry.id, entry])),
    status: 'success',
    referenceContext: undefined,
  });
});

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output>{location.search}</output>
      <button onClick={() => navigate(-1)}>Browser back</button>
    </>
  );
}

it('opens each Summary highlight in its own lab, document or selected-result view', () => {
  render(
    <MemoryRouter>
      <ResultsDigestCard />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole('link', { name: /Glucose/ }).getAttribute('href'),
  ).toBe('/records/labs/2345-7');
  expect(
    screen.getByRole('link', { name: /Second report/ }).getAttribute('href'),
  ).toBe('/records/results?result=report%2Fsecond');
  expect(
    screen.getByRole('link', { name: /Third document/ }).getAttribute('href'),
  ).toBe('/records/documents/detail/metadata%2Fdocument%2Fthird');
  expect(
    screen.getByRole('link', { name: /Open all results/ }).getAttribute('href'),
  ).toBe('/records/results');
});

it('opens the addressed result instead of selecting the first result', () => {
  render(
    <MemoryRouter initialEntries={['/records/results?result=report%2Fsecond']}>
      <ResultsTab />
    </MemoryRouter>,
  );
  const detail = screen.getByRole('region', { name: 'Selected result' });
  expect(within(detail).getByText('Second report narrative')).toBeTruthy();
  expect(within(detail).queryByText('Glucose')).toBeNull();
  expect(
    screen.getByRole('link', { name: 'All results' }).getAttribute('href'),
  ).toBe('/records/results');
});

it('keeps result selection in browser history so Back returns to the list', () => {
  render(
    <MemoryRouter initialEntries={['/records/results']}>
      <ResultsTab />
      <LocationProbe />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: /Second report/ }));
  expect(screen.getByRole('status').textContent).toBe(
    '?result=report%2Fsecond',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
  expect(screen.getByRole('status').textContent).toBe('');
  expect(screen.queryByRole('link', { name: 'All results' })).toBeNull();
});

it('starts a newly selected phone detail at the top instead of keeping the list scroll offset', () => {
  render(
    <MemoryRouter initialEntries={['/records/results']}>
      <ResultsTab />
    </MemoryRouter>,
  );
  const scroller = document.getElementById('results-scroll-container')!;
  scroller.scrollTop = 158;

  fireEvent.click(screen.getByRole('button', { name: /Second report/ }));

  expect(scroller.scrollTop).toBe(0);
  expect(
    within(screen.getByRole('region', { name: 'Selected result' })).getByRole(
      'heading',
      { level: 2, name: 'Second report' },
    ),
  ).toBeTruthy();

  scroller.scrollTop = 240;
  fireEvent.click(screen.getByRole('link', { name: 'All results' }));
  expect(scroller.scrollTop).toBe(0);
});

it('reports a missing selected result instead of showing an unrelated result', () => {
  render(
    <MemoryRouter initialEntries={['/records/results?result=missing']}>
      <ResultsTab />
    </MemoryRouter>,
  );
  const detail = screen.getByRole('region', { name: 'Selected result' });
  expect(
    within(detail).getByText('This result is no longer available.'),
  ).toBeTruthy();
  expect(within(detail).queryByText('Glucose')).toBeNull();
});
