import { Fragment } from 'react';
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
  onSaved,
  ...options
}: {
  onClose: () => void;
  onSaved?: () => void;
} & Omit<UseManualRecordFormOptions, 'onComplete'>) {
  const { t } = useInterfaceLanguage();
  const form = useManualRecordForm({
    ...options,
    onComplete: () => {
      onSaved?.();
      onClose();
    },
  });

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
        <Dialog.Title className="text-base font-semibold text-gray-900">
          {t(form.isEditing ? 'Edit record' : 'Add record')}
        </Dialog.Title>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={t('Close')}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[80vh] overflow-y-auto">
        <ManualRecordForm form={form} onCancel={onClose} embedded />
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
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 z-40 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-2 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-2 sm:scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
                <ManualRecordModalBody
                  onClose={onClose}
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
