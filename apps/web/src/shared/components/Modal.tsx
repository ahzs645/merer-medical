import { PropsWithChildren } from 'react';
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useCloseOnBack } from '../hooks/useCloseOnBack';

export function Modal({
  open,
  setOpen,
  afterLeave,
  children,
  overflowHidden = false,
  overflowXHidden = false,
  flex = false,
}: PropsWithChildren<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  afterLeave?: () => void;
  overflowHidden?: boolean;
  overflowXHidden?: boolean;
  flex?: boolean;
}>) {
  useCloseOnBack(open, () => setOpen(false));
  return (
    <Transition.Root show={open} as={Fragment} afterLeave={afterLeave} appear>
      <Dialog as="div" className="relative z-dialog" onClose={setOpen}>
        {/* Background opacity */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 transition-opacity" />
        </Transition.Child>
        {/* Modal. On a phone it is a sheet on the bottom edge — the shape
            FormSheet gives the edit form — rather than a card floating
            between the status bar and the tab bar with page showing above
            and below it. From `sm` up it is the top-anchored card it always
            was. */}
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center sm:block sm:p-12">
            {/* Named transition properties, as in FormSheet: the phone slides
                the sheet up off the bottom edge, the desktop fades and
                scales, reduced motion gets the end state. */}
            <Transition.Child
              as={Fragment}
              enter="transition-[transform,opacity] duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none sm:duration-300 sm:ease-out"
              enterFrom="translate-y-full sm:translate-y-4 sm:scale-95 sm:opacity-0"
              enterTo="translate-y-0 sm:scale-100 sm:opacity-100"
              leave="transition-[transform,opacity] duration-200 ease-in motion-reduce:transition-none"
              leaveFrom="translate-y-0 sm:scale-100 sm:opacity-100"
              leaveTo="translate-y-full sm:translate-y-4 sm:scale-95 sm:opacity-0"
            >
              {/* 85vh for the reason FormSheet gives: `vh` is the large
                  viewport, and a taller sheet loses its own header under the
                  iOS address bar. The sheet scrolls itself; a caller passing
                  `flex` lays its content out in a column and scrolls its own
                  body, keeping its header in view. */}
              <Dialog.Panel
                className={`${
                  flex ? 'flex flex-col' : 'flex flex-col sm:block'
                } max-h-[85vh] w-full rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] pt-2.5 shadow-2xl ring-1 ring-black ring-opacity-5 sm:mx-auto sm:max-h-none sm:w-auto sm:min-w-[50%] sm:max-w-3xl sm:rounded-xl sm:pb-0 sm:pt-0 ${
                  overflowHidden
                    ? 'overflow-hidden'
                    : flex
                      ? 'overflow-hidden sm:overflow-visible'
                      : 'overflow-y-auto overscroll-contain sm:overflow-visible'
                } ${overflowXHidden ? 'overflow-x-hidden' : ''}`}
              >
                <div
                  aria-hidden="true"
                  className="mx-auto mb-1 h-1.5 w-10 shrink-0 rounded-full bg-gray-300 sm:hidden"
                />
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
