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

/** Sources changes its task query while retaining one vertical content box. */
function SourceTaskShell() {
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  useScrollRestoration(containerRef);
  const selectedTask = new URLSearchParams(location.search).get('task');

  return (
    <main ref={containerRef}>
      <div
        ref={dimensions(1600, 500)}
        data-testid="source-content"
        style={{ overflowY: 'auto' }}
      >
        <h1>{selectedTask ? 'Import a file' : 'Source tasks'}</h1>
        <Link to="/connections?task=import">Choose import</Link>
        <button onClick={() => navigate(-1)}>Browser Back</button>
        <button onClick={() => navigate(1)}>Browser Forward</button>
      </div>
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
  it('restores a remembered top position on Back when query navigation reuses a scroller, and restores the task on Forward', () => {
    render(
      <MemoryRouter initialEntries={['/connections']}>
        <SourceTaskShell />
      </MemoryRouter>,
    );
    const scroller = screen.getByTestId('source-content');
    expect(scroller.scrollTop).toBe(0);
    fireEvent.click(screen.getByRole('link', { name: 'Choose import' }));
    scroller.scrollTop = 620;
    fireEvent.scroll(scroller);

    fireEvent.click(screen.getByRole('button', { name: 'Browser Back' }));
    expect(screen.getByRole('heading', { name: 'Source tasks' })).toBeTruthy();
    expect(screen.getByTestId('source-content')).toBe(scroller);
    // The reused element still holds the task's offset until restoration runs.
    expect(scroller.scrollTop).toBe(620);
    act(() => jest.advanceTimersByTime(20));
    expect(scroller.scrollTop).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Browser Forward' }));
    expect(screen.getByRole('heading', { name: 'Import a file' })).toBeTruthy();
    act(() => jest.advanceTimersByTime(20));
    expect(scroller.scrollTop).toBe(620);
  });

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
