/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';

import { RecordsHub } from './RecordsHub';
import { useRecordSearch } from '../../shared/components/useRecordSearch';

jest.mock('../../shared/components/useRecordSearch', () => ({
  useRecordSearch: jest.fn(),
}));

const mockSearch = useRecordSearch as jest.MockedFunction<
  typeof useRecordSearch
>;

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output>
        {location.pathname}
        {location.search}
      </output>
      <button onClick={() => navigate(-1)}>Browser back</button>
    </>
  );
}

function renderHub(entry = '/records') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <RecordsHub />
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() =>
  mockSearch.mockReturnValue({ hits: [], searching: false, error: false }),
);

it('keeps category browsing when no search has been entered', () => {
  renderHub();
  expect(
    screen.getByRole('link', { name: /Labs Blood work and panels/ }),
  ).toBeTruthy();
  expect(
    screen.queryByRole('heading', { name: 'Matching records' }),
  ).toBeNull();
});

it('finds a real record whose name is not a category and restores the query after Back', () => {
  mockSearch.mockReturnValue({
    hits: [
      {
        id: 'synthetic-lab',
        name: 'Glucose',
        resourceType: 'observation',
        dateLabel: 'Jan 1, 2026',
        path: '/records/labs/2345-7',
      },
    ],
    searching: false,
    error: false,
  });
  renderHub('/records?q=glucose');
  const hit = screen.getByRole('link', { name: /Glucose Result/ });
  expect(hit.getAttribute('href')).toBe('/records/labs/2345-7');
  expect(screen.queryByText(/No records or categories match/)).toBeNull();
  fireEvent.click(hit);
  fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
  expect(
    screen
      .getByLabelText('Search records and categories')
      .getAttribute('value'),
  ).toBe('glucose');
  expect(screen.getByRole('status').textContent).toBe('/records?q=glucose');
});

it('does not present a failed search as no records', () => {
  mockSearch.mockReturnValue({ hits: [], searching: false, error: true });
  renderHub('/records?q=glucose');
  expect(screen.getByRole('alert').textContent).toMatch(/Unable to search/);
  expect(screen.queryByText(/No records or categories match/)).toBeNull();
});

it('shows a useful empty state after records and categories have both been searched', () => {
  renderHub('/records?q=unmatchedsynthetic');
  expect(screen.getByText(/No records or categories match/)).toBeTruthy();
});
