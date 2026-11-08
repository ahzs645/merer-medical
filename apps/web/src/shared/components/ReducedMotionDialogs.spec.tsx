/** @jest-environment jsdom */
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { FormSheet } from './FormSheet';
import { resetCloseOnBackForTests } from '../hooks/useCloseOnBack';

function DialogHarness({ kind }: { kind: 'form' | 'confirm' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open dialog</button>
      {kind === 'form' ? (
        <FormSheet
          open={open}
          title="Synthetic form"
          closeLabel="Close form"
          onRequestClose={() => setOpen(false)}
        >
          <input aria-label="Synthetic field" />
        </FormSheet>
      ) : (
        <ConfirmDeleteDialog
          open={open}
          title="Discard changes?"
          body="Synthetic form changes"
          cancelLabel="Keep editing"
          onCancel={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
        />
      )}
    </>
  );
}

let reducedMotionStyles: HTMLStyleElement;
beforeEach(() => {
  resetCloseOnBackForTests();
  // jsdom does not evaluate media queries or emit CSS transitionend events.
  // Supply the reduced-motion branch directly, including the app's global
  // important duration. The opt-out class must produce zero so Headless UI
  // can finish without an event from transition-property:none.
  reducedMotionStyles = document.createElement('style');
  reducedMotionStyles.textContent = String.raw`
    * { transition-duration: 0.01ms !important; transition-delay: 0s; }
    .motion-reduce\:transition-none { transition-property: none; }
    .motion-reduce\:\!duration-0 { transition-duration: 0s !important; }
  `;
  document.head.appendChild(reducedMotionStyles);
});
afterEach(() => reducedMotionStyles.remove());

it.each([
  ['form', 'Close form'],
  ['confirm', 'Keep editing'],
] as const)(
  'fully removes the %s portal after dismissal and can reopen it',
  async (kind, closeLabel) => {
    render(<DialogHarness kind={kind} />);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
      const close = await screen.findByRole('button', { name: closeLabel });
      fireEvent.click(close);
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(document.querySelector('[data-headlessui-portal]')).toBeNull();
    }
  },
);
