/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { TimelineTab } from './TimelineTab';
import { useRecordQuery } from './hooks/useRecordQuery';
import { QueryStatus } from './types';

jest.mock('../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: 'synthetic-user', first_name: 'Synthetic' }),
}));
jest.mock('../../app/providers/LocalConfigProvider', () => ({
  useLocalConfig: () => ({ experimental__use_openai_rag: false }),
}));
jest.mock('../vectors/providers/VectorGeneratorSyncInitializer', () => ({
  useVectorSyncStatus: () => 'COMPLETE',
}));
jest.mock('./hooks/useRecordQuery', () => ({
  useRecordQuery: jest.fn(),
  useTimelineDateKeys: () => [],
}));
jest.mock('./components/layout/TimelineItem', () => ({
  TimelineItem: () => null,
}));
jest.mock('./clinical-timeline/ClinicalTimeline', () => ({
  ClinicalTimeline: () => <p>Trend view</p>,
}));
jest.mock('../../shared/components/EmptyRecordsPlaceholder', () => ({
  EmptyRecordsPlaceholder: () => null,
}));
jest.mock('./components/layout/SearchBar', () => ({
  SearchBar: ({ query, setQuery, typeFilter, setTypeFilter }: any) => (
    <>
      <input
        aria-label="Timeline query"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <select
        aria-label="Timeline type"
        value={typeFilter}
        onChange={(event) => setTypeFilter(event.target.value)}
      >
        <option value="all">All</option>
        <option value="observation">Results</option>
        <option value="encounter">Visits</option>
      </select>
    </>
  ),
}));

const mockRecordQuery = useRecordQuery as jest.MockedFunction<
  typeof useRecordQuery
>;

beforeEach(() => {
  mockRecordQuery.mockReturnValue({
    data: {},
    status: QueryStatus.SUCCESS,
    initialized: true,
    pageCursor: 0,
    loadNextPage: jest.fn(),
    jumpToDate: jest.fn(),
    seekingDateKey: undefined,
    showIndividualItems: true,
  });
});

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="timeline-location">
        {location.pathname}
        {location.search}
        {location.hash}
      </output>
      <Link to="/timeline?q=Synthetic%20medication#timeline-record-synthetic-record">
        Open medication hit
      </Link>
      <Link to="/records">Browse records</Link>
      <button onClick={() => navigate(-1)}>Browser back</button>
    </>
  );
}

function renderTimeline(entry = '/timeline?q=old&filter=observation') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/timeline" element={<TimelineTab />} />
        <Route path="/records" element={<p>Records page</p>} />
      </Routes>
      <NavigationProbe />
    </MemoryRouter>,
  );
}

it('applies a record hit while Timeline is already mounted and opens its Cards context', () => {
  renderTimeline();
  expect(
    (screen.getByLabelText('Timeline query') as HTMLInputElement).value,
  ).toBe('old');
  fireEvent.click(screen.getByRole('button', { name: 'Clinical timeline' }));
  expect(screen.getByText('Trend view')).toBeTruthy();

  fireEvent.click(screen.getByRole('link', { name: 'Open medication hit' }));

  expect(mockRecordQuery).toHaveBeenLastCalledWith(
    'Synthetic medication',
    false,
    'all',
    15,
  );
  expect(
    (screen.getByLabelText('Timeline query') as HTMLInputElement).value,
  ).toBe('Synthetic medication');
  expect(
    screen.getByRole('button', { name: 'Cards' }).getAttribute('aria-pressed'),
  ).toBe('true');
  expect(screen.getByTestId('timeline-location').textContent).toBe(
    '/timeline?q=Synthetic%20medication#timeline-record-synthetic-record',
  );
});

it('restores the query and type filter after Back and after reopening the same URL', () => {
  const view = renderTimeline(
    '/timeline?q=old&filter=observation&context=kept',
  );
  fireEvent.change(screen.getByLabelText('Timeline query'), {
    target: { value: 'updated' },
  });
  fireEvent.change(screen.getByLabelText('Timeline type'), {
    target: { value: 'encounter' },
  });
  const savedUrl = screen.getByTestId('timeline-location').textContent!;
  expect(savedUrl).toContain('q=updated');
  expect(savedUrl).toContain('filter=encounter');
  expect(savedUrl).toContain('context=kept');

  fireEvent.click(screen.getByRole('link', { name: 'Browse records' }));
  fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
  expect(
    (screen.getByLabelText('Timeline query') as HTMLInputElement).value,
  ).toBe('updated');
  expect(
    (screen.getByLabelText('Timeline type') as HTMLSelectElement).value,
  ).toBe('encounter');

  view.unmount();
  renderTimeline(savedUrl);
  expect(
    (screen.getByLabelText('Timeline query') as HTMLInputElement).value,
  ).toBe('updated');
  expect(
    (screen.getByLabelText('Timeline type') as HTMLSelectElement).value,
  ).toBe('encounter');
});
