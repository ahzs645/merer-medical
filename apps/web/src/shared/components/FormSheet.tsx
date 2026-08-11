import { Fragment, type ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * One panel, two shapes: a sheet sitting on the bottom edge of a phone, and the
 * top-anchored card a desktop dialog has always been.
 *
 * This was the shape `ManualRecordModal` had grown, and it is the right shape
 * for any short form the reader opens on purpose — so it lives here rather than
 * being copied. Everything it knows is about the container: the panel's two
 * geometries, the grab handle, the title bar with its close button, and the
 * transitions. What goes inside is the caller's business.
 *
 * `onRequestClose` is every close path — the X, the backdrop, Escape — so a
 * caller with a half-filled form can put one dirty-check in one place.
 */
export function FormSheet({
  open,
  title,
  onRequestClose,
  children,
  closeLabel = 'Close',
}: {
  open: boolean;
  title: string;
  onRequestClose: () => void;
  children: ReactNode;
  closeLabel?: string;
}) {
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-dialog" onClose={onRequestClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-out duration-200 motion-reduce:transition-none"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-in duration-150 motion-reduce:transition-none"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 z-dialog overflow-y-auto">
          <div className="flex min-h-full items-end justify-center sm:items-start sm:p-4">
            {/* The panel needs a named `transition-property`. Left to the CSS
                default — `all` — it animates every other property that changes
                with it. The phone slides the sheet up off the bottom edge; the
                desktop keeps its fade and scale. Reduced motion gets the end
                state with no travel. */}
            <Transition.Child
              as={Fragment}
              enter="transition-[transform,opacity] duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none sm:duration-200 sm:ease-out"
              enterFrom="translate-y-full sm:translate-y-2 sm:scale-95 sm:opacity-0"
              enterTo="translate-y-0 sm:scale-100 sm:opacity-100"
              leave="transition-[transform,opacity] duration-200 ease-in motion-reduce:transition-none sm:duration-150"
              leaveFrom="translate-y-0 sm:scale-100 sm:opacity-100"
              leaveTo="translate-y-full sm:translate-y-2 sm:scale-95 sm:opacity-0"
            >
              {/* 85vh, not 90: `vh` measures the large viewport, so with the
                  iOS Safari address bar on screen a 90vh sheet is taller than
                  what you can see, and the part that goes off the top is its
                  own header — the title and the close button.

                  `pt-2.5` on the panel, never `mt-` on the grab handle: a top
                  margin on a first child collapses out through the panel,
                  pushing the sheet down and leaving the handle on its edge
                  instead of inside it. */}
              <Dialog.Panel className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] pt-2.5 shadow-xl sm:max-h-none sm:rounded-lg sm:pb-0 sm:pt-0">
                <div
                  aria-hidden="true"
                  className="mx-auto h-1.5 w-10 rounded-full bg-gray-300 sm:hidden"
                />
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
                  <Dialog.Title className="text-base font-semibold text-gray-900">
                    {title}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onRequestClose}
                    className="-me-1 inline-flex h-11 w-11 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label={closeLabel}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                {/* The only scrolling box in either shape. A form's sticky
                    Save row pins to whichever ancestor scrolls: let the panel
                    scroll instead and the title bar scrolls away with the
                    fields. Below `sm` this takes whatever height the capped
                    panel has left; from `sm` up it keeps its own 80vh so the
                    centred dialog is unchanged. */}
                <div className="min-h-0 flex-1 overflow-y-auto sm:max-h-[80vh] sm:flex-none">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
