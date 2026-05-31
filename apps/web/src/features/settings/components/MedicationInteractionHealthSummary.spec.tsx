import { render, screen } from '@testing-library/react';

import { MedicationInteractionHealthSummary } from './MedicationInteractionHealthSummary';

describe('MedicationInteractionHealthSummary', () => {
  it('shows missing DDInter and unavailable RxNorm cache states', () => {
    render(<MedicationInteractionHealthSummary />);

    expect(
      screen.getByText(/Missing: load the bundled DDInter data/),
    ).toBeTruthy();
    expect(screen.getByText('Cache status unavailable.')).toBeTruthy();
  });

  it('shows installed DDInter and RxNorm cache counts', () => {
    render(
      <MedicationInteractionHealthSummary
        bundleStatus={{
          installed: true,
          readiness: 'installed',
          recordCount: 222383,
          fileCount: 8,
          sourceUrl: 'https://ddinter.scbdd.com/download/',
          license: 'DDInter terms apply',
        }}
        rxNormCacheStatus={{
          entryCount: 4,
          staleEntryCount: 1,
          lastUpdatedAt: '2026-05-31T00:00:00.000Z',
        }}
      />,
    );

    expect(
      screen.getByText(/222,383 indexed records from 8 files/),
    ).toBeTruthy();
    expect(screen.getByText(/4 cached lookups; 1 stale/)).toBeTruthy();
    expect(screen.getByText(/DDInter terms apply/)).toBeTruthy();
  });
});
