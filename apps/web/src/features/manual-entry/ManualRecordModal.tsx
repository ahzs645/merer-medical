import { Fragment, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { ManualRecordForm } from './ManualRecordForm';
import {
  useManualRecordForm,
  type UseManualRecordFormOptions,
} from './hooks/useManualRecordForm';

type ManualRecordModalProps = {
  open: boolean;
  onClose: () => void;
  // Fired after a successful save/update (before close) so the host can refresh.
  onSaved?: () => void;
} & Omit<UseManualRecordFormOptions, 'onComplete'>;

// Hosts the shared form inside a dialog. Split into a body so the form hook (and
// its edit-load effect) only runs while the modal is mounted/open.
function ManualRecordModalBody({
  onClose,
  requestClose,
  registerCloseGuard,
  onSaved,
  ...options
}: {
  onClose: () => void;
  requestClose: () => void;
  registerCloseGuard: (guard: () => boolean) => void;
} & Omit<ManualRecordModalProps, 'open'>) {
  const { t } = useInterfaceLanguage();
  const form = useManualRecordForm({
    ...options,
    onComplete: () => {
      onSaved?.();
      onClose();
    },
  });

  // Every close path (X, backdrop, Escape, Cancel) runs this guard so a
  // half-filled form is never discarded without confirmation.
  useEffect(() => {
    registerCloseGuard(
      () => !form.isDirty() || window.confirm(t('Discard unsaved changes?')),
    );
  });

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
        <Dialog.Title className="text-base font-semibold text-gray-900">
          {t(form.isEditing ? 'Edit record' : 'Add record')}
        </Dialog.Title>
        <button
          type="button"
          onClick={requestClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={t('Close')}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      {/* This div is the only scrolling box in either shape, because the form's
          Save/Cancel row is `sticky bottom-0` and pins to whichever ancestor
          scrolls: let the sheet's panel scroll instead and the title bar
          scrolls away with the fields while the row stops being pinned to the
          sheet's bottom edge. Below `sm` it takes whatever height the capped
          panel has left; from `sm` up it keeps its own 80vh so the centred
          dialog is unchanged. */}
      <div className="min-h-0 flex-1 overflow-y-auto sm:max-h-[80vh] sm:flex-none">
        <ManualRecordForm form={form} onCancel={requestClose} embedded />
      </div>
    </>
  );
}

export function ManualRecordModal({
  open,
  onClose,
  onSaved,
  ...options
}: ManualRecordModalProps) {
  // The body registers the actual dirty-check; until it mounts, closing is
  // always allowed.
  const closeGuardRef = useRef<() => boolean>(() => true);
  const requestClose = () => {
    if (closeGuardRef.current()) onClose();
  };
  // Drop the stale guard once the body unmounts so a reopened modal starts
  // from a clean slate.
  useEffect(() => {
    if (!open) closeGuardRef.current = () => true;
  }, [open]);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={requestClose}>
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

        <div className="fixed inset-0 z-40 overflow-y-auto">
          {/* One panel, two shapes: below `sm` it is a sheet sitting on the
              bottom edge with no gutter to float in, and from `sm` up it is
              the top-anchored card this dialog has always been. */}
          <div className="flex min-h-full items-end justify-center sm:items-start sm:p-4">
            {/* The panel had no `transition-property` of its own, so it took
                the CSS default — `all` — and animated every other property
                that changed with it. Name the two that move: the phone slides
                the sheet up off the bottom edge on the More sheet's curve, the
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
                  what you can see and the part that goes off the top is its
                  own header — the title and the close button. 85vh clears the
                  bar in both states and still leaves the long form ~600px to
                  scroll in on a 390px phone.

                  `pt-2.5` on the panel, never `mt-` on the grab handle: a top
                  margin on a first child collapses out through the panel,
                  pushing the sheet down and leaving the handle on its edge
                  instead of inside it. That is the bug the More sheet in
                  `TabWrapper` was fixed for. */}
              <Dialog.Panel className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] pt-2.5 shadow-xl sm:max-h-none sm:rounded-lg sm:pb-0 sm:pt-0">
                <div
                  aria-hidden="true"
                  className="mx-auto h-1.5 w-10 rounded-full bg-gray-300 sm:hidden"
                />
                <ManualRecordModalBody
                  onClose={onClose}
                  requestClose={requestClose}
                  registerCloseGuard={(guard) => {
                    closeGuardRef.current = guard;
                  }}
                  onSaved={onSaved}
                  {...options}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
