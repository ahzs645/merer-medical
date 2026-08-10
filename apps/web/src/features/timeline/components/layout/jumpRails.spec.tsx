import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { JumpToPanel } from './JumpToPanel';
import { YearJumpBar } from './YearJumpBar';

/**
 * Both rails list dates that are usually not paged in yet. They must hand the
 * jump to the caller (which loads the target period) rather than relying on a
 * bare `#anchor` that only exists for rendered dates, and they must show that
 * the target is loading.
 */

function renderInRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('JumpToPanel', () => {
  const dateKeys = ['2026-03-20', '2019-07-04', '2006-04-01'];

  it('offers every date on record, not just the loaded ones', () => {
    renderInRouter(
      <JumpToPanel
        dateKeys={dateKeys}
        items={{ '2026-03-20': [] }}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Mar 20')).toBeTruthy();
    expect(screen.getByText('Jul 04')).toBeTruthy();
    expect(screen.getByText('Apr 01')).toBeTruthy();
  });

  it('asks the caller to load the period instead of only linking to it', () => {
    const onJumpToDate = jest.fn();
    renderInRouter(
      <JumpToPanel
        dateKeys={dateKeys}
        isLoading={false}
        onJumpToDate={onJumpToDate}
      />,
    );

    fireEvent.click(screen.getByText('Apr 01'));

    expect(onJumpToDate).toHaveBeenCalledWith('2006-04-01');
  });

  it('marks the date being fetched as busy', () => {
    renderInRouter(
      <JumpToPanel
        dateKeys={dateKeys}
        isLoading={false}
        seekingDateKey="2006-04-01"
      />,
    );

    expect(screen.getByText('Apr 01').getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Loading')).toBeTruthy();
    expect(screen.getByText('Jul 04').getAttribute('aria-busy')).toBeNull();
  });
});

describe('YearJumpBar', () => {
  const dateKeys = ['2026-03-20', '2019-07-04', '2019-01-02', '2006-04-01'];

  it('offers one entry per year, newest date first', () => {
    renderInRouter(<YearJumpBar dateKeys={dateKeys} />);

    const nav = screen.getByLabelText('Jump to year');
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      '2026',
      '2019',
      '2006',
    ]);
  });

  it('jumps to the newest date in the chosen year', () => {
    const onJumpToDate = jest.fn();
    renderInRouter(
      <YearJumpBar dateKeys={dateKeys} onJumpToDate={onJumpToDate} />,
    );

    fireEvent.click(screen.getByText('2019'));

    expect(onJumpToDate).toHaveBeenCalledWith('2019-07-04');
  });

  it('marks the year being fetched as busy', () => {
    renderInRouter(
      <YearJumpBar dateKeys={dateKeys} seekingDateKey="2006-04-01" />,
    );

    const nav = screen.getByLabelText('Jump to year');
    const links = within(nav).getAllByRole('link');
    expect(links[2].getAttribute('aria-busy')).toBe('true');
    expect(links[0].getAttribute('aria-busy')).toBeNull();
  });
});
