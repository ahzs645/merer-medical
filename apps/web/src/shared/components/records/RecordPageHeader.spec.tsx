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
});
