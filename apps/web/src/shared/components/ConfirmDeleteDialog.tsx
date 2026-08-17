import { Fragment, useRef, type ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * The one "are you sure" in the app, for deletes that cannot be undone.
 *
 * Deleting a manual record used to raise `window.confirm` — an operating-system
 * dialog, unstyled, untranslatable beyond its message, and unlike every other
 * question this app asks. It also said nothing about what would go with the
 * record.
 *
 * Small things you wrote yourself don't come through here at all: they delete
 * on the tap and offer Undo in the toast (`useUndoableDelete`). This is for the
 * cases where the way back doesn't exist — a record whose attachments are
 * removed with it.
 *
 * The cancel button takes initial focus, so a stray Return on a dialog you did
 * not expect closes it rather than confirming.
 */
export function ConfirmDeleteDialog({
  open,
  title,
  body,
  confirmLabel = 'Delete',
  cancelLabel = 'Keep it',
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  /** What goes with it, in the reader's terms. */
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-dialog"
        initialFocus={cancelRef}
        onClose={() => {
          if (!busy) onCancel();
        }}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200 motion-reduce:transition-none"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150 motion-reduce:transition-none"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500/60" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200 motion-reduce:transition-none"
              enterFrom="opacity-0 translate-y-2 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150 motion-reduce:transition-none"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-2 sm:scale-95"
            >
              <Dialog.Panel className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl ring-1 ring-black/5">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                    <ExclamationTriangleIcon
                      className="h-6 w-6 text-red-700"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <Dialog.Title className="text-base font-semibold text-gray-900">
                      {title}
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-gray-700">
                      {body}
                    </Dialog.Description>
                  </div>
                </div>
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    ref={cancelRef}
                    type="button"
                    disabled={busy}
                    onClick={onCancel}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:opacity-60"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onConfirm}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-red-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2 disabled:opacity-60"
                  >
                    {busy ? 'Deleting…' : confirmLabel}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
