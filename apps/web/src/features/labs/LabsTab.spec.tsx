/**
 * @jest-environment jsdom
 */
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { LabsTab } from './LabsTab';
import { RecordCoverageSummary } from './types';

// `mock`-prefixed so the hoisted jest.mock factories below may reach it.
const mockCreateElement = createElement;

const mockCoverage: RecordCoverageSummary = {
  totalRecords: 412,
  labRows: 181,
  labPanels: 9,
  undatedLabRows: 0,
  medicationRecords: 23,
  encounterRecords: 17,
  imagingRecords: 5,
  diagnosticReports: 11,
  patientRecords: 1,
};

let mockStatus: 'loading' | 'success' = 'success';
let mockLabs: unknown[] = [];

jest.mock('./hooks/useLabsData', () => ({
  useLabsData: () => ({
    labs: mockLabs,
    reportsByObservationId: new Map(),
    connectionsById: new Map(),
    referenceContext: { ageYears: 14, sex: 'male' },
    recordCoverage: mockCoverage,
    status: mockStatus,
  }),
}));
// The table is not what this page owes the reader above the fold; standing it
// in keeps the assertions about what sits between the banner and it.
jest.mock('./components/LabsTable', () => ({
  LabsTable: () =>
    mockCreateElement('div', { 'data-testid': 'labs-table' }, 'results'),
}));

// Headless UI's Dialog observes its panel to decide whether it is on screen,
// and jsdom ships no IntersectionObserver.
class NoopIntersectionObserver {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
  takeRecords = () => [];
  root = null;
  rootMargin = '';
  thresholds = [];
}

beforeAll(() => {
  window.IntersectionObserver =
    NoopIntersectionObserver as unknown as typeof IntersectionObserver;
  global.IntersectionObserver = window.IntersectionObserver;
});

function makeLab(id: string, name: string) {
  return {
    id,
    connection_record_id: 'conn-1',
    metadata: {
      id,
      date: '2026-01-02T12:00:00.000Z',
      display_name: name,
      loinc_coding: [],
    },
    data_record: {
      raw: { resource: { code: { text: name } } },
      resource_type: 'observation',
    },
  };
}

// Opened on the plain route. This used to have to enter through the
// `added=1` path, because the page defaulted to "Attention" and none of these
// fixtures is flagged — a test that had to dodge the default is a fair sign
// the default was hiding your records.
function renderTab(entry = '/records/labs') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LabsTab />
    </MemoryRouter>,
  );
}

/**
 * The coverage card used to sit here, between the banner and the first result,
 * and it grew back twice after being cut. These pin the shape it was replaced
 * with: nothing in the flow, the control in the banner, the facts one press
 * away.
 */
describe('LabsTab', () => {
  beforeEach(() => {
    mockStatus = 'success';
    mockLabs = [makeLab('lab-1', 'Ferritin'), makeLab('lab-2', 'Sodium')];
    window.localStorage.clear();
  });

  it('puts nothing between the banner and the first lab result', () => {
    const { container } = renderTab();

    const scroller = container.querySelector('#labs-scroll-container');
    const flow = scroller?.firstElementChild;
    // The coverage card was the first child here, and the results came second.
    expect(flow?.firstElementChild?.getAttribute('data-testid')).toBe(
      'labs-table',
    );
    // Nothing in the flow reads out a record count any more.
    expect(scroller?.textContent).not.toContain('181');
  });

  it('keeps the reference standard on screen rather than in the modal', () => {
    renderTab();

    // Still a control the reader can see and change without opening anything.
    expect(screen.getByLabelText('Reference')).toBeTruthy();
  });

  it('says how much of the list you are being shown, in the banner', () => {
    renderTab();

    const tally = screen.getByText(/lab tests listed/);
    // "2 of 2" only means something next to the chips and the search box that
    // decide it, so it has to be in the banner and not floating over the list.
    expect(tally.closest('.bg-primary-800')).not.toBeNull();
    expect(tally.textContent).toContain('2 of 2');
  });

  it('reaches every coverage number in one press', () => {
    renderTab();

    expect(screen.queryByText('181')).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: "What's in your records" }),
    );

    // The three lab tiles and the five that were behind a disclosure.
    ['181', '9', '14y, male', '23', '17', '5', '11', '412'].forEach((value) => {
      expect(screen.getByText(value)).toBeTruthy();
    });
  });

  it('drops the tally line while there is nothing to tally', () => {
    mockStatus = 'loading';
    mockLabs = [];
    renderTab();

    expect(screen.queryByText(/lab tests listed/)).toBeNull();
    // The control and the button do not blink into existence on load, so the
    // banner keeps its height when the labs arrive.
    expect(screen.getByLabelText('Reference')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: "What's in your records" }),
    ).toBeTruthy();
  });
});

/**
 * The view you are looking at is an address now. Before this, filter and search
 * were component state plus a sessionStorage copy of the query: pressing Back
 * from a result returned you to the page's default rather than the list you
 * left, which also left the shell's scroll restoration nothing to restore to,
 * because the page that came back was a different length.
 */
describe('LabsTab view state', () => {
  beforeEach(() => {
    mockStatus = 'success';
    mockLabs = [makeLab('lab-1', 'Ferritin'), makeLab('lab-2', 'Sodium')];
    window.localStorage.clear();
  });

  it('opens on the full list, not pre-filtered to a subset of it', () => {
    const { container } = renderTab();

    const all = screen.getByRole('button', { name: /^All/ });
    expect(all.getAttribute('aria-pressed')).toBe('true');
    // Both fixtures are ordinary results. Under the old "Attention" default
    // this read "0 of 2", and the page a records app opened on was empty.
    expect(screen.getByText(/lab tests listed/).textContent).toContain(
      '2 of 2',
    );
    expect(container.textContent).toContain('All2');
  });

  it('opens on the view its address describes', () => {
    renderTab('/records/labs?q=ferritin');

    // The search box was applied before the first paint, from the URL, rather
    // than restored from a sessionStorage copy after it.
    expect(
      (screen.getByLabelText('Search labs') as HTMLInputElement).value,
    ).toBe('ferritin');
    expect(screen.getByText(/lab tests listed/).textContent).toContain(
      '1 of 2',
    );
  });

  it('reads a filter out of the address too', () => {
    renderTab('/records/labs?filter=attention');

    const attention = screen.getByRole('button', { name: /^Attention/ });
    expect(attention.getAttribute('aria-pressed')).toBe('true');
  });
});
