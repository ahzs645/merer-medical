/**
 * @jest-environment jsdom
 */
import { type ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  RecordHeaderButton,
  RecordHeaderLink,
  RecordPageHeader,
} from './RecordPageHeader';

function renderHeader(node: ReactElement) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

/**
 * Guards the two rules every record banner has to keep as tabs come and go:
 * exactly one page `<h1>`, and no interactive control under the 44px touch
 * target. Both were fixed app-wide recently and are easy to lose again.
 */
describe('RecordPageHeader', () => {
  it('collapses to a bare title when no other slot is filled', () => {
    const { container } = renderHeader(
      <RecordPageHeader title="Vital signs" />,
    );

    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.querySelectorAll('a, button')).toHaveLength(0);
  });

  it('renders every slot with a single h1 and 44px touch targets', () => {
    const { container } = renderHeader(
      <RecordPageHeader
        title="Imaging & Scans"
        description="Imaging reports, X-rays, studies and scan files."
        count={<>12 imaging records</>}
        backLink={{ to: '/records', label: 'All records' }}
        search={{
          query: '',
          onChange: () => undefined,
          placeholder: 'Search scans',
        }}
        action={
          <>
            <RecordHeaderLink to="/records/new" label="Add image or scan" />
            <RecordHeaderButton
              onClick={() => undefined}
              label="Export"
              variant="subtle"
            />
          </>
        }
        filters={{
          items: [
            { id: 'all', label: 'All', count: 12 },
            { id: 'xray', label: 'X-ray', count: 3 },
          ],
          selectedId: 'all',
          onSelect: () => undefined,
          label: 'Filter imaging',
        }}
      />,
    );

    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Imaging & Scans',
    );
    // The visually hidden label falls back to the placeholder.
    expect(screen.getByLabelText('Search scans')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Add image or scan/ }),
    ).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Filter imaging' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /All/ }).getAttribute('aria-pressed'),
    ).toBe('true');

    container.querySelectorAll('a, button, input').forEach((element) => {
      const classes = element.getAttribute('class') ?? '';
      expect(/min-h-\[44px\]|\bh-11\b/.test(classes)).toBe(true);
    });
  });

  /**
   * The two rules the banner's phone layout rests on. jsdom does no layout, so
   * these assert the structure and the classes that decide it — enough to
   * catch the shapes this header had before: an action stranded beneath the
   * search box, and filter chips stacked into rows above the first record.
   */
  it('puts the action beside the title, not under the search box', () => {
    const { container } = renderHeader(
      <RecordPageHeader
        title="All lab results"
        search={{
          query: '',
          onChange: () => undefined,
          placeholder: 'Search lab name or code',
        }}
        action={<RecordHeaderLink to="/records/new" label="Add lab result" />}
      />,
    );

    const titleRow = container.querySelector('h1')?.closest('div.flex-wrap');
    expect(
      titleRow?.contains(screen.getByRole('link', { name: /Add lab result/ })),
    ).toBe(true);
    expect(
      titleRow?.contains(screen.getByLabelText('Search lab name or code')),
    ).toBe(false);
  });

  it('scrolls the filter chips sideways rather than stacking rows', () => {
    renderHeader(
      <RecordPageHeader
        title="Medications"
        filters={{
          items: [
            { id: 'all', label: 'All', count: 3 },
            { id: 'current', label: 'Current', count: 0 },
            { id: 'planned', label: 'Planned', count: 0 },
            { id: 'stopped', label: 'Stopped', count: 0 },
            { id: 'supplements', label: 'Supplements', count: 1 },
            { id: 'needsReview', label: 'Needs review', count: 7 },
          ],
          selectedId: 'all',
          onSelect: () => undefined,
          label: 'Filter medications',
        }}
      />,
    );

    const group = screen.getByRole('group', { name: 'Filter medications' });
    expect(group.className).toContain('overflow-x-auto');
    // Wrapping starts at `sm`: six chips stacked into three rows on a phone
    // and pushed the first medication off the screen.
    expect(group.className).toContain('sm:flex-wrap');
    expect(group.className).not.toMatch(/(^|\s)flex-wrap/);
    group.querySelectorAll('button').forEach((chip) => {
      expect(chip.className).toContain('shrink-0');
    });
  });
});
