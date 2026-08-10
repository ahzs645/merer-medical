/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  EmptyStateLink,
  RecordListPage,
  type RecordListStatus,
} from './RecordListPage';

function renderPage(
  overrides: Partial<Parameters<typeof RecordListPage>[0]> = {},
) {
  return render(
    <MemoryRouter>
      <RecordListPage
        title="Goals"
        status={'success' as RecordListStatus}
        loadingText="Loading goals…"
        isEmpty={false}
        emptyText="No health goals recorded yet."
        {...overrides}
      >
        <article>A goal</article>
      </RecordListPage>
    </MemoryRouter>,
  );
}

/**
 * Both slots exist because `children` render in exactly one branch —
 * success-and-non-empty — and every page that put an add affordance there
 * discovered it too late.
 */
describe('RecordListPage', () => {
  it('draws the empty state its own add door', () => {
    renderPage({
      isEmpty: true,
      emptyAction: (
        <EmptyStateLink to="/records/new?type=goal" label="Add goal" />
      ),
    });

    expect(screen.getByText('No health goals recorded yet.')).toBeTruthy();
    const link = screen.getByRole('link', { name: /Add goal/ });
    expect(link.getAttribute('href')).toBe('/records/new?type=goal');
  });

  it('keeps the empty action out of the populated list', () => {
    renderPage({
      emptyAction: (
        <EmptyStateLink to="/records/new?type=goal" label="Add goal" />
      ),
    });

    expect(screen.getByText('A goal')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Add goal/ })).toBeNull();
  });

  // The Allergies dialog lived in `children`, so the button that opened it was
  // a dead click until the list already had a record in it.
  it.each<[string, Partial<Parameters<typeof RecordListPage>[0]>]>([
    ['loading', { status: 'loading' }],
    ['error', { status: 'error', error: new Error('nope') }],
    ['empty', { isEmpty: true }],
    ['no match', { isNoMatch: true }],
    ['populated', {}],
  ])('mounts page dialogs in the %s state', (_name, overrides) => {
    renderPage({
      ...overrides,
      dialogs: <div data-testid="page-dialog" />,
    });

    expect(screen.getByTestId('page-dialog')).toBeTruthy();
  });
});
