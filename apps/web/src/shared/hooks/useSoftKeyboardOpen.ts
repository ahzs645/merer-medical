import { useEffect, useState } from 'react';

/** Fields that bring up a keyboard when focused. */
export function isTextEntry(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement) return !element.readOnly;
  if (element instanceof HTMLSelectElement) return false;
  if (element instanceof HTMLInputElement) {
    return (
      !element.readOnly &&
      !NON_TEXT_INPUTS.has(
        (element.getAttribute('type') || 'text').toLowerCase(),
      )
    );
  }
  return element instanceof HTMLElement && element.isContentEditable === true;
}

const NON_TEXT_INPUTS = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

/** A keyboard takes far more than this; browser toolbars take less. */
const KEYBOARD_MIN_HEIGHT = 150;

/**
 * Whether an on-screen keyboard is up, as far as the page can tell: a text
 * field has focus *and* the visible height has dropped well below the tallest
 * it has been at this width. Either alone is wrong — a desktop focuses fields
 * with no keyboard, and a phone's toolbars grow and shrink as it scrolls.
 *
 * The tallest height resets when the width changes, which is what turning the
 * phone does.
 */
export function useSoftKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const viewport = window.visualViewport;
    let width = window.innerWidth;
    let tallest = 0;

    const measure = () => {
      const height = viewport?.height ?? window.innerHeight;
      if (window.innerWidth !== width) {
        width = window.innerWidth;
        tallest = 0;
      }
      tallest = Math.max(tallest, height);
      setOpen(
        isTextEntry(document.activeElement) &&
          tallest - height > KEYBOARD_MIN_HEIGHT,
      );
    };

    measure();
    viewport?.addEventListener('resize', measure);
    window.addEventListener('resize', measure);
    document.addEventListener('focusin', measure);
    // After focus has moved, not while it is between elements.
    const onFocusOut = () => window.setTimeout(measure, 0);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      viewport?.removeEventListener('resize', measure);
      window.removeEventListener('resize', measure);
      document.removeEventListener('focusin', measure);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return open;
}
