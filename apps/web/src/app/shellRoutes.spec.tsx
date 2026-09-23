/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, useLocation, useRoutes } from 'react-router-dom';

import {
  legacyRedirectRoutes,
  notFoundRoute,
  rootRedirectRoute,
} from './shellRoutes';

jest.mock('../shared/components/NotFoundPage', () => ({
  NotFoundPage: () => <h1>Page not found</h1>,
}));

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function ShellRoutes() {
  return useRoutes([
    {
      element: <Outlet />,
      children: [
        rootRedirectRoute,
        { path: '/timeline', element: <Where /> },
        { path: '/records/labs/*', element: <Where /> },
        ...legacyRedirectRoutes,
        notFoundRoute,
      ],
    },
  ]);
}

// `MemoryRouter` rather than the data router the app uses: jsdom has no
// `Request`, which `createMemoryRouter` needs. The route objects are the same.
function renderAt(path: string, basename?: string) {
  render(
    <MemoryRouter initialEntries={[path]} basename={basename}>
      <ShellRoutes />
    </MemoryRouter>,
  );
}

describe('shell routes', () => {
  it('sends the root to the timeline', () => {
    renderAt('/');
    expect(screen.getByTestId('where').textContent).toBe('/timeline');
  });

  it('sends the demo root to the demo timeline', () => {
    renderAt('/demo', '/demo');
    expect(screen.getByTestId('where').textContent).toBe('/timeline');
  });

  it('still says an unknown address is not found', () => {
    renderAt('/nope');
    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeTruthy();
  });

  it('keeps a retired lab address resolving', () => {
    renderAt('/labs/HDL%20cholesterol');
    expect(screen.getByTestId('where').textContent).toBe(
      '/records/labs/HDL%20cholesterol',
    );
  });
});
