import {
  DocumentArrowDownIcon,
  EyeIcon,
  LockClosedIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { MouseEvent, useEffect, useState } from 'react';

import { ManualRecordModal } from './ManualRecordModal';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useNotificationDispatch } from '../../app/providers/NotificationProvider';
import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import {
  listClinicalDocumentAttachments,
  downloadClinicalDocumentAttachment,
  openClinicalDocumentAttachment,
  supportsClinicalDocumentAttachments,
} from '../../repositories/AttachmentRepository';
import { deleteClinicalDocument } from '../../repositories/ClinicalDocumentRepository';
import { notifyRecordsChanged } from '../../shared/utils/recordChangeSignal';
import { isManualRecord } from '../../shared/utils/manualRecordUtils';
import { buildRecordProvenance } from '../provenance/provenance';
import { readOnlyReason } from '../provenance/provenanceLabels';
import { ConfirmDeleteDialog } from '../../shared/components/ConfirmDeleteDialog';
import { ManualSourceDocumentLink } from './ManualSourceDocumentLink';

/**
 * The class the actions row wears, exported so a card that has an action of
 * its own — Imaging's "Open record" — can host one row rather than stranding
 * its button on a line above Edit and Delete.
 */
export const manualRecordActionRowClass = 'mt-3 flex flex-wrap gap-2';

export function ManualRecordActions({
  item,
  inline = false,
  explainReadOnly = false,
}: {
  item: ClinicalDocument;
  /** Render the buttons only, for a caller supplying the row around them. */
  inline?: boolean;
  /**
   * Say why a synced record has no Edit or Delete. For pages showing a single
   * record; a list would repeat the note once per row.
   */
  explainReadOnly?: boolean;
}) {
  const db = useRxDb();
  const user = useUser();
  const notifyDispatch = useNotificationDispatch();
  const { t } = useInterfaceLanguage();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [linkedFiles, setLinkedFiles] = useState<
    Array<{ id: string; filename?: string }>
  >([]);

  useEffect(() => {
    if (!supportsClinicalDocumentAttachments()) return;

    let cancelled = false;
    listClinicalDocumentAttachments(item.id)
      .then((attachments) => {
        if (!cancelled) setLinkedFiles(attachments);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          notifyDispatch({
            type: 'set_notification',
            message: `${t('Unable to load linked files')}: ${(error as Error).message}`,
            variant: 'error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [item.id, notifyDispatch]);

  // A record synced from a portal is a mirror of what that system holds, so
  // there is nothing here to edit or delete — editing it locally would put the
  // two out of step with no way to say which is right.
  //
  // Returning `null` said that by saying nothing, which read as "this page is
  // write-only: you can add a plan but never change one". Say it instead.
  // A record synced from a portal is a mirror of what that system holds, so
  // there is nothing here to edit or delete — changing it locally would put the
  // two out of step with no way to say which is right.
  //
  // In a list that is fine unsaid: a note on all thirteen problems is thirteen
  // notes. On a page showing one record, saying nothing reads as "you can add
  // one of these but never change one", so those surfaces opt in.
  if (!isManualRecord(item)) {
    if (!explainReadOnly) return null;
    const note = (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
        <LockClosedIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {/* "edit it there" is advice about a portal, and this note was given
            to every record the app cannot edit — including ones that arrived
            in an imported package and were never near one, which then carried
            a provenance panel saying so directly underneath. */}
        {t(readOnlyReason(buildRecordProvenance(item).entryMethod))}
      </span>
    );
    if (inline) return note;
    return <div className={manualRecordActionRowClass}>{note}</div>;
  }

  function onRequestDelete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!db || isDeleting) return;
    // Asked in the app's own dialog rather than the browser's, and asked at
    // all — unlike a tracker entry or a comment, deleting a record takes its
    // attachments with it, so there is nothing for an Undo to put back.
    setIsConfirmOpen(true);
  }

  async function onDelete() {
    if (!db || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteClinicalDocument(db, user.id, item.id);
      notifyDispatch({
        type: 'set_notification',
        message: t('Record deleted'),
        variant: 'success',
      });
      // Hosting lists subscribe to this signal and refresh in place — no
      // navigation or reload, which would lose scroll position (and, in
      // demo mode, the whole in-memory database).
      notifyRecordsChanged();
    } catch (error) {
      console.error(error);
      notifyDispatch({
        type: 'set_notification',
        message: `${t('Unable to delete record')}: ${(error as Error).message}`,
        variant: 'error',
      });
    } finally {
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  }

  async function onOpenAttachment(
    event: MouseEvent<HTMLButtonElement>,
    attachmentId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();

    try {
      await openClinicalDocumentAttachment(attachmentId);
    } catch (error) {
      console.error(error);
      notifyDispatch({
        type: 'set_notification',
        message: `Unable to open linked file: ${(error as Error).message}`,
        variant: 'error',
      });
    }
  }

  async function onDownloadAttachment(
    event: MouseEvent<HTMLButtonElement>,
    attachmentId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();

    try {
      await downloadClinicalDocumentAttachment(attachmentId);
    } catch (error) {
      console.error(error);
      notifyDispatch({
        type: 'set_notification',
        message: `Unable to download linked file: ${(error as Error).message}`,
        variant: 'error',
      });
    }
  }

  // Edit and Delete carry the 44px minimum the rest of the app applies to
  // banner actions, filter chips and back links; the row stretches its other
  // chips to match, so the source-document controls come up with them.
  const actions = (
    <>
      {linkedFiles.map((file) => (
        <span key={file.id} className="inline-flex gap-1">
          <button
            type="button"
            onClick={(event) => onOpenAttachment(event, file.id)}
            className="inline-flex items-center gap-1 rounded-md border border-primary-200 px-2 py-1 text-xs font-semibold text-primary-700 shadow-sm hover:bg-primary-50"
            title={file.filename || 'Open linked file'}
          >
            <EyeIcon className="h-4 w-4" />
            {t('Open source')}
          </button>
          <button
            type="button"
            onClick={(event) => onDownloadAttachment(event, file.id)}
            className="inline-flex items-center gap-1 rounded-md border border-primary-200 px-2 py-1 text-xs font-semibold text-primary-700 shadow-sm hover:bg-primary-50"
            title={file.filename || 'Download linked file'}
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            {t('Download')}
          </button>
        </span>
      ))}
      <ManualSourceDocumentLink item={item} />
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsEditOpen(true);
        }}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
      >
        <PencilSquareIcon className="h-4 w-4" />
        {t('Edit')}
      </button>
      <button
        type="button"
        disabled={isDeleting}
        onClick={onRequestDelete}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <TrashIcon className="h-4 w-4" />
        {t(isDeleting ? 'Deleting' : 'Delete')}
      </button>
      <ManualRecordModal
        open={isEditOpen}
        recordId={item.id}
        onClose={() => setIsEditOpen(false)}
        onSaved={notifyRecordsChanged}
      />
      <ConfirmDeleteDialog
        open={isConfirmOpen}
        busy={isDeleting}
        title={t('Delete this record?')}
        body={
          linkedFiles.length > 0
            ? t(
                'The record and the files attached to it are removed from this device. This cannot be undone.',
              )
            : t(
                'The record is removed from this device. This cannot be undone.',
              )
        }
        onConfirm={onDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );

  if (inline) return actions;
  return <div className={manualRecordActionRowClass}>{actions}</div>;
}
