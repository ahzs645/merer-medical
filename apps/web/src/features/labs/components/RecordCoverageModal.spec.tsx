/**
 * @jest-environment jsdom
 */
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { RecordCoverageModal } from './RecordCoverageModal';
import { RecordCoverageSummary } from '../types';

// Headless UI's Dialog observes its panel to decide whether it is on screen,
// and jsdom ships no IntersectionObserver, so without this stub the dialog
// throws on mount and every assertion below tests nothing.
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

const coverage: RecordCoverageSummary = {
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

function renderModal(
  override: Partial<React.ComponentProps<typeof RecordCoverageModal>> = {},
) {
  function Host() {
    const [open, setOpen] = useState(true);

    return (
      <RecordCoverageModal
        open={open}
        setOpen={setOpen}
        coverage={coverage}
        visibleCount={12}
        totalGroups={51}
        filterMode="attention"
        referenceContext={{ ageYears: 14, sex: 'male' }}
        {...override}
      />
    );
  }

  return render(<Host />);
}

/**
 * These numbers used to be a card above the first lab result. Moving them
 * behind a button is only acceptable while none of them went missing on the
 * way and none of them costs a second press, so that is what this asserts.
 */
describe('RecordCoverageModal', () => {
  it('carries every number the coverage card showed', () => {
    renderModal();

    // The three lab tiles, including the context the ranges were matched to.
    expect(screen.getByText('181')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.getByText('14y, male')).toBeTruthy();
    // The five that were folded away behind "Other record types".
    expect(screen.getByText('23')).toBeTruthy();
    expect(screen.getByText('17')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('11')).toBeTruthy();
    expect(screen.getByText('412')).toBeTruthy();
  });

  it('opens with all eight showing rather than five behind a disclosure', () => {
    const { baseElement } = renderModal();

    // The card folded the other record types away to stay short in the page
    // flow. A modal has the room, so nothing here is two presses deep.
    expect(baseElement.querySelector('details')).toBeNull();
  });

  it('keeps the tally and the sentence explaining which filter produced it', () => {
    renderModal();

    expect(screen.getByText(/12 of 51 lab tests listed/)).toBeTruthy();
    expect(
      screen.getByText(/at least one high, low, or borderline result/),
    ).toBeTruthy();
  });

  it('says when the reference context is missing instead of showing nothing', () => {
    renderModal({ referenceContext: undefined });

    expect(screen.getByText('Not available')).toBeTruthy();
  });

  it('mentions undated lab results only when there are some', () => {
    renderModal();
    expect(screen.queryByText(/without a collection date/)).toBeNull();

    renderModal({ coverage: { ...coverage, undatedLabRows: 4 } });
    expect(
      screen.getByText(/4 lab results arrived without a collection/),
    ).toBeTruthy();
  });

  it('renders nothing at all until it is opened', () => {
    const { baseElement } = render(
      <RecordCoverageModal
        open={false}
        setOpen={() => undefined}
        coverage={coverage}
        visibleCount={51}
        totalGroups={51}
        filterMode="all"
      />,
    );

    expect(baseElement.textContent).not.toContain('181');
  });

  it('closes from the header without needing the backdrop', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText('14y, male')).toBeNull();
  });
});
