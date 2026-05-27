import {
  DocumentArrowDownIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { MouseEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
import { Routes as AppRoutes } from '../../Routes';
import { deleteClinicalDocument } from '../../repositories/ClinicalDocumentRepository';
import { isManualRecord } from '../../shared/utils/manualRecordUtils';

export function ManualRecordActions({ item }: { item: ClinicalDocument }) {
  const db = useRxDb();
  const user = useUser();
  const navigate = useNavigate();
  const notifyDispatch = useNotificationDispatch();
  const [isDeleting, setIsDeleting] = useState(false);
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
      });

    return () => {
      cancelled = true;
    };
  }, [item.id]);

  if (!isManualRecord(item)) return null;

  async function onDelete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!db || isDeleting) return;
    const confirmed = window.confirm('Delete this manual record?');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteClinicalDocument(db, user.id, item.id);
      notifyDispatch({
        type: 'set_notification',
        message: 'Record deleted',
        variant: 'success',
      });
      navigate(AppRoutes.Timeline);
      window.setTimeout(() => navigate(0), 0);
    } catch (error) {
      console.error(error);
      notifyDispatch({
        type: 'set_notification',
        message: `Unable to delete record: ${(error as Error).message}`,
        variant: 'error',
      });
    } finally {
      setIsDeleting(false);
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

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {linkedFiles.map((file) => (
        <span key={file.id} className="inline-flex gap-1">
          <button
            type="button"
            onClick={(event) => onOpenAttachment(event, file.id)}
            className="inline-flex items-center gap-1 rounded-md border border-primary-200 px-2 py-1 text-xs font-semibold text-primary-700 shadow-sm hover:bg-primary-50"
            title={file.filename || 'Open linked file'}
          >
            <EyeIcon className="h-4 w-4" />
            Open source
          </button>
          <button
            type="button"
            onClick={(event) => onDownloadAttachment(event, file.id)}
            className="inline-flex items-center gap-1 rounded-md border border-primary-200 px-2 py-1 text-xs font-semibold text-primary-700 shadow-sm hover:bg-primary-50"
            title={file.filename || 'Download linked file'}
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            Download
          </button>
        </span>
      ))}
      <Link
        to={AppRoutes.EditRecord.replace(
          ':recordId',
          encodeURIComponent(item.id),
        )}
        onClick={(event) => event.stopPropagation()}
        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
      >
        <PencilSquareIcon className="h-4 w-4" />
        Edit
      </Link>
      <button
        type="button"
        disabled={isDeleting}
        onClick={onDelete}
        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <TrashIcon className="h-4 w-4" />
        {isDeleting ? 'Deleting' : 'Delete'}
      </button>
    </div>
  );
}
