/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { Link, MemoryRouter, useLocation, useNavigate } from 'react-router-dom';

import {
  clearRememberedScrollPositions,
  useScrollRestoration,
} from './useScrollRestoration';

// Supply only the missing jsdom geometry. Scroll events, route history, the
// persistent shell, and its replaced list/detail DOM all use the real hook.
function dimensions(contentHeight: number, viewportHeight: number) {
  return (element: HTMLDivElement | null) => {
    if (!element) return;
    Object.defineProperties(element, {
      scrollHeight: { configurable: true, value: contentHeight },
      clientHeight: { configurable: true, value: viewportHeight },
    });
  };
}

function RecordShell() {
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  useScrollRestoration(containerRef);

  return (
    <main ref={containerRef}>
      {location.pathname === '/records/labs' ? (
        <div key="list">
          <div
            ref={dimensions(1200, 600)}
            data-testid="category-navigation"
            style={{ overflowY: 'auto' }}
          >
            Categories
          </div>
          <div
            ref={dimensions(44, 44)}
            data-testid="horizontal-filters"
            style={{ overflowX: 'auto', overflowY: 'auto' }}
          >
            All tests · Attention · Health planner
          </div>
          <div
            ref={dimensions(2400, 600)}
            data-testid="lab-list"
            style={{ overflowY: 'auto' }}
          >
            <Link to="/records/labs/detail">Open selected lab</Link>
          </div>
        </div>
      ) : (
        <div key="detail">
          <h1>Selected lab</h1>
          <button onClick={() => navigate(-1)}>Browser Back</button>
        </div>
      )}
    </main>
  );
}

beforeEach(() => {
  clearRememberedScrollPositions();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useScrollRestoration', () => {
  it('restores the vertical list position after a horizontal filter scroll and browser Back', () => {
    render(
      <MemoryRouter initialEntries={['/records/labs']}>
        <RecordShell />
      </MemoryRouter>,
    );

    const originalList = screen.getByTestId('lab-list');
    originalList.scrollTop = 720;
    fireEvent.scroll(originalList);

    // A sideways strip's scrollTop remains zero. It must not replace the
    // remembered list offset or its index among the two vertical scrollers.
    const filters = screen.getByTestId('horizontal-filters');
    filters.scrollLeft = 150;
    fireEvent.scroll(filters);
    expect(filters.scrollTop).toBe(0);

    fireEvent.click(screen.getByRole('link', { name: 'Open selected lab' }));
    expect(screen.queryByTestId('lab-list')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Browser Back' }));

    const restoredList = screen.getByTestId('lab-list');
    expect(restoredList).not.toBe(originalList);
    expect(restoredList.scrollTop).toBe(0);
    act(() => {
      jest.advanceTimersByTime(20);
    });

    expect(restoredList.scrollTop).toBe(720);
    expect(screen.getByTestId('category-navigation').scrollTop).toBe(0);
    expect(screen.getByTestId('horizontal-filters').scrollTop).toBe(0);
  });
});
