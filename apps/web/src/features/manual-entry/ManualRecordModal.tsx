import { useEffect, useRef, useState } from 'react';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { ConfirmDeleteDialog } from '../../shared/components/ConfirmDeleteDialog';
import { FormSheet } from '../../shared/components/FormSheet';
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

// Hosts the shared form inside the sheet. Split into a body so the form hook
// (and its edit-load effect) only runs while the modal is mounted/open.
function ManualRecordModalBody({
  onClose,
  requestClose,
  registerCloseGuard,
  onTitleChange,
  onSaved,
  ...options
}: {
  onClose: () => void;
  requestClose: () => void;
  registerCloseGuard: (guard: () => boolean) => void;
  onTitleChange: (title: string) => void;
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
  // The guard only reports whether closing is safe; the host asks the
  // question, in the app's own dialog rather than the browser's.
  useEffect(() => {
    registerCloseGuard(() => !form.isDirty());
  });

  // Named by what you pressed, the way the full-page form already is: pressing
  // "Add allergy" and landing on a sheet headed "Add record" drops the context
  // you arrived with. The shell draws the title bar, so hand the name up to it.
  const title = form.isEditing
    ? t('Edit record')
    : form.presetAddTitle || t('Add record');
  useEffect(() => {
    onTitleChange(title);
  }, [onTitleChange, title]);

  return <ManualRecordForm form={form} onCancel={requestClose} embedded />;
}

export function ManualRecordModal({
  open,
  onClose,
  onSaved,
  ...options
}: ManualRecordModalProps) {
  const { t } = useInterfaceLanguage();
  // The body registers the actual dirty-check; until it mounts, closing is
  // always allowed.
  const closeGuardRef = useRef<() => boolean>(() => true);
  const [title, setTitle] = useState(() => t('Add record'));
  const [discardOpen, setDiscardOpen] = useState(false);
  const requestClose = () => {
    if (closeGuardRef.current()) {
      onClose();
      return;
    }
    setDiscardOpen(true);
  };
  // Drop the stale guard once the body unmounts so a reopened modal starts
  // from a clean slate.
  useEffect(() => {
    if (!open) {
      closeGuardRef.current = () => true;
      setDiscardOpen(false);
    }
  }, [open]);

  return (
    <FormSheet
      open={open}
      title={title}
      onRequestClose={requestClose}
      closeLabel={t('Close')}
    >
      <ManualRecordModalBody
        onClose={onClose}
        requestClose={requestClose}
        registerCloseGuard={(guard) => {
          closeGuardRef.current = guard;
        }}
        onTitleChange={setTitle}
        onSaved={onSaved}
        {...options}
      />
      <ConfirmDeleteDialog
        open={discardOpen}
        title={t('Discard unsaved changes?')}
        body={t('What you have typed here is not saved yet.')}
        confirmLabel={t('Discard')}
        cancelLabel={t('Keep editing')}
        onConfirm={() => {
          setDiscardOpen(false);
          onClose();
        }}
        onCancel={() => setDiscardOpen(false)}
      />
    </FormSheet>
  );
}
