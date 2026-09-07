/**
 * @jest-environment jsdom
 */
import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import {
  MemoryRouter,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';

import { useRouteAnnouncement } from './useRouteAnnouncement';

/**
 * The shell, as `TabWrapper` is: one instance that outlives every route, so the
 * hook's state survives a navigation the way it does in the app.
 */
function Shell() {
  const mainRef = useRef<HTMLElement>(null);
  const message = useRouteAnnouncement(mainRef);
  const navigate = useNavigate();

  return (
    <>
      <div data-testid="announcer" aria-live="polite">
        {message}
      </div>
      <button type="button" onClick={() => navigate('/records/medications')}>
        Go to medications
      </button>
      <button type="button" onClick={() => navigate('/records/allergies')}>
        Go to allergies
      </button>
      <button type="button" onClick={() => navigate('/records/conditions')}>
        Go to conditions by topic
      </button>
      <button
        type="button"
        onClick={() => navigate('/records/conditions/details')}
      >
        Go to conditions details
      </button>
      <main ref={mainRef} tabIndex={-1} data-testid="main">
        <Outlet />
      </main>
    </>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/timeline" element={<h1>Timeline</h1>} />
          <Route path="/records/medications" element={<h1>Medications</h1>} />
          <Route path="/records/allergies" element={<h1>Allergies</h1>} />
          {/* Two routes, one heading — the Conditions views. */}
          <Route path="/records/conditions" element={<h1>Conditions</h1>} />
          <Route
            path="/records/conditions/details"
            element={<h1>Conditions</h1>}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

/** Lets the hook's polling for the new page's <h1> run to completion. */
function settle() {
  act(() => {
    jest.advanceTimersByTime(400);
  });
}

/**
 * Before this hook, a route change did neither of the things a route change
 * owes a screen reader: `document.activeElement` stayed on `<body>` and nothing
 * was announced, so the next Tab started again at "Skip to content" — above the
 * navigation the reader had just used, on all 46 routes.
 */
describe('useRouteAnnouncement', () => {
  it('says nothing on first paint', () => {
    renderAt('/timeline');
    settle();

    expect(screen.getByTestId('announcer').textContent).toBe('');
  });

  it('names the page a navigation lands on', () => {
    renderAt('/timeline');
    act(() => {
      screen.getByRole('button', { name: 'Go to medications' }).click();
    });
    settle();

    expect(screen.getByTestId('announcer').textContent).toBe('Medications');
  });

  it('moves focus to the landmark so the next Tab starts in the content', () => {
    renderAt('/timeline');
    expect(document.activeElement).toBe(document.body);

    act(() => {
      screen.getByRole('button', { name: 'Go to medications' }).click();
    });
    settle();

    expect(document.activeElement).toBe(screen.getByTestId('main'));
  });

  it('changes the message when two routes share a heading', () => {
    // A live region only speaks when its content changes, so the Conditions
    // views — two routes under one <h1> — would otherwise pass in silence.
    renderAt('/records/medications');
    act(() => {
      screen.getByRole('button', { name: 'Go to conditions by topic' }).click();
    });
    settle();
    const first = screen.getByTestId('announcer').textContent;

    act(() => {
      screen.getByRole('button', { name: 'Go to conditions details' }).click();
    });
    settle();
    const second = screen.getByTestId('announcer').textContent;

    expect(first).toBe('Conditions');
    expect(second).not.toBe(first);
    expect(second?.replace(/\u200b/g, '')).toBe('Conditions');
  });
});
