/**
 * @jest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import { useState } from 'react';

import { resetCloseOnBackForTests, useCloseOnBack } from './useCloseOnBack';

let setOuterOpen: (open: boolean) => void = () => undefined;
let setInnerOpen: (open: boolean) => void = () => undefined;
let leaveOuter: () => void = () => undefined;

function Overlays() {
  const [outer, setOuter] = useState(false);
  const [inner, setInner] = useState(false);
  setOuterOpen = setOuter;
  setInnerOpen = setInner;
  leaveOuter = useCloseOnBack(outer, () => setOuter(false));
  useCloseOnBack(inner, () => setInner(false));
  return (
    <p data-testid="state">
      {outer ? 'outer' : '-'} {inner ? 'inner' : '-'}
    </p>
  );
}

/** jsdom's `history.back()` is asynchronous and fires `popstate`, as a browser does. */
async function goBack() {
  await act(async () => {
    window.history.back();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

function state() {
  return document.querySelector('[data-testid="state"]')?.textContent;
}

beforeEach(() => {
  resetCloseOnBackForTests();
  window.history.replaceState({ idx: 0 }, '', '/records/labs');
});

describe('useCloseOnBack', () => {
  it('closes the overlay on Back and leaves the page where it was', async () => {
    render(<Overlays />);
    const before = window.history.length;
    act(() => setOuterOpen(true));
    expect(window.history.length).toBe(before + 1);

    await goBack();
    expect(state()).toBe('- -');
    expect(window.location.pathname).toBe('/records/labs');
  });

  it('closes only the top overlay when they are nested', async () => {
    render(<Overlays />);
    act(() => setOuterOpen(true));
    act(() => setInnerOpen(true));

    await goBack();
    expect(state()).toBe('outer -');
    await goBack();
    expect(state()).toBe('- -');
  });

  it('takes its entry back off when closed another way', async () => {
    render(<Overlays />);
    act(() => setOuterOpen(true));
    expect((window.history.state as Record<string, unknown>).idx).toBe(0);

    act(() => setOuterOpen(false));
    await settle();
    expect(window.history.state).toEqual({ idx: 0 });
    expect(state()).toBe('- -');
  });

  it('leaves history alone when a link inside has already navigated', async () => {
    render(<Overlays />);
    act(() => setOuterOpen(true));
    window.history.pushState({ idx: 1 }, '', '/settings');

    act(() => setOuterOpen(false));
    await settle();
    expect(window.location.pathname).toBe('/settings');
  });

  it('does not undo a navigation made in the same tap that closed it', async () => {
    render(<Overlays />);
    act(() => setOuterOpen(true));

    act(() => setOuterOpen(false));
    window.history.replaceState({ idx: 1 }, '', '/settings');
    await settle();
    expect(window.location.pathname).toBe('/settings');
  });

  it('sends no back() when it closes for a navigation, however late the router is', async () => {
    render(<Overlays />);
    act(() => setOuterOpen(true));

    act(() => {
      leaveOuter();
      setOuterOpen(false);
    });
    await settle();
    // The router lands its replace after the cleanup has already run.
    window.history.replaceState({ idx: 0 }, '', '/settings');
    await settle();
    expect(window.location.pathname).toBe('/settings');
  });
});
