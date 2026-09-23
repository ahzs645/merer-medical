import { useCallback, useEffect, useRef } from 'react';

/**
 * Back closes the sheet, dialog or palette on top, instead of leaving the page
 * underneath it.
 *
 * Open the More sheet on Labs and press Back — the Android gesture, the
 * browser button, the installed app's only way back — and the sheet closed and
 * the page behind it went to the previous route. Every native sheet does the
 * opposite, so this gives each open overlay a history entry of its own: Back
 * pops that entry, and the overlay closes.
 *
 * The entry is the current URL again, with a marker in `history.state` and the
 * router's own `idx` and `key` kept, so React Router sees a pop to where it
 * already is and does nothing. Overlays nest (a confirm inside a modal), so
 * open ones form a stack and a pop closes only the top one.
 *
 * Closed any other way — Escape, the X, a choice — the overlay takes its entry
 * back off with `history.back()`, but only if that entry is still the current
 * one a task later. An overlay closing because its own link or command
 * navigates says so with `closeForNavigation` and navigates with `replace`, so
 * the new page takes the overlay's entry instead of stacking above it.
 */

type OpenOverlay = { token: string; close: () => void; leaving?: boolean };

const stack: OpenOverlay[] = [];
/** Pops this module caused itself, which must not close anything else. */
let ownPops = 0;
let listening = false;
let counter = 0;

const MARKER = 'mereOverlay';

function onPopState() {
  if (ownPops > 0) {
    ownPops -= 1;
    return;
  }
  stack.pop()?.close();
}

function currentMarker(): unknown {
  const state = window.history.state as Record<string, unknown> | null;
  return state?.[MARKER];
}

/**
 * Returns `closeForNavigation`: call it just before an overlay closes because
 * one of its own links or commands is navigating. The overlay's entry is then
 * left for that navigation to replace (navigate with `replace`), and no
 * `back()` is sent — the router's push can land a task or more after the
 * close, and a `back()` racing it undid the navigation (⌘K → Settings stayed
 * on the page it started from).
 */
export function useCloseOnBack(open: boolean, onClose: () => void): () => void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const entryRef = useRef<OpenOverlay | undefined>(undefined);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    if (!listening) {
      window.addEventListener('popstate', onPopState);
      listening = true;
    }

    counter += 1;
    const token = `overlay-${counter}`;
    const entry: OpenOverlay = { token, close: () => closeRef.current() };
    window.history.pushState(
      { ...(window.history.state || {}), [MARKER]: token },
      '',
    );
    stack.push(entry);
    entryRef.current = entry;

    return () => {
      const index = stack.indexOf(entry);
      // Already gone: Back popped it, and that pop is what closed us.
      if (index === -1) return;
      stack.splice(index, 1);
      // Closing for a navigation, which will replace this entry itself.
      if (entry.leaving) return;
      // A task later, not now: a choice in the command palette closes it and
      // then navigates, and the router's push lands after this cleanup. A
      // `back()` queued first would be applied to the new page and undo the
      // navigation. By the next task the push has happened, the marker is no
      // longer current, and there is nothing to take off.
      window.setTimeout(() => {
        if (currentMarker() === token) {
          ownPops += 1;
          window.history.back();
        }
      }, 0);
    };
  }, [open]);

  return useCallback(() => {
    if (entryRef.current) entryRef.current.leaving = true;
  }, []);
}

/** For tests: forget every open overlay. */
export function resetCloseOnBackForTests(): void {
  stack.length = 0;
  ownPops = 0;
}
