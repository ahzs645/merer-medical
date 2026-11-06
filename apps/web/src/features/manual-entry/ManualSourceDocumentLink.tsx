import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { useNotificationDispatch } from '../../app/providers/NotificationProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { setClinicalDocumentSourceLink } from '../../repositories/ClinicalDocumentRepository';
import { useClinicalDoc } from '../../shared/hooks/useClinicalDoc';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { Modal } from '../../shared/components/Modal';
import { ModalHeader } from '../../shared/components/ModalHeader';
import { EmbeddedAttachmentViewer } from '../timeline/components/document-reference/EmbeddedAttachmentViewer';

function getMetaString(
  item: ClinicalDocument,
  key: string,
): string | undefined {
  const value = (item.metadata as Record<string, unknown> | undefined)?.[key];
  return typeof value === 'string' && value ? value : undefined;
}

type SourceOption = {
  documentId: string;
  attachmentId?: string;
  label: string;
  subtitle?: string;
};

export interface SourceDocumentLink {
  /** A source document or its attachment is itself the origin. */
  isSourceItself: boolean;
  isLinked: boolean;
  /** True once the embedded file has loaded, so View source can open it. */
  canView: boolean;
  /** The document's own title ("Mayo Clinic Rochester — records release…"). */
  documentTitle?: string;
  /** The file it was embedded from ("H.E. Mr. … 4-281-518.pdf"). */
  fileName?: string;
  busy: boolean;
  openViewer: () => void;
  openPicker: () => void;
  unlink: () => void;
  /** The viewer and picker; render once, outside any menu. */
  dialogs: ReactNode;
}

/**
 * View, change, link, or unlink the source document a record points at. A
 * record references its source through `metadata.source_document_id` (the
 * DocumentReference) and `metadata.source_attachment_id` (the embedded bytes).
 *
 * A hook rather than a row of buttons, so the caller decides where each action
 * lives: View source stays on the card, Change and Unlink go into its menu.
 */
export function useSourceDocumentLink(
  item: ClinicalDocument,
): SourceDocumentLink {
  const db = useRxDb();
  const user = useUser();
  const navigate = useNavigate();
  const notifyDispatch = useNotificationDispatch();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const sourceAttachmentId = getMetaString(item, 'source_attachment_id');
  const sourceDocumentId = getMetaString(item, 'source_document_id');
  const attachment = useClinicalDoc(sourceAttachmentId);
  const sourceDocument = useClinicalDoc(sourceDocumentId);

  const resourceType = item.data_record?.resource_type;
  const isSourceItself =
    resourceType === 'documentreference' ||
    resourceType === 'documentreference_attachment';

  const isLinked = Boolean(sourceDocumentId || sourceAttachmentId);
  const fileName =
    getMetaString(item, 'source_image') ||
    attachment?.get('metadata.display_name') ||
    undefined;
  // The DocumentReference's type is the title a person gave the document; its
  // display name adds " source document", which is the builder talking.
  const documentTitle =
    (sourceDocument?.get('data_record.raw.resource.type.text') as
      | string
      | undefined) ||
    (
      sourceDocument?.get('metadata.display_name') as string | undefined
    )?.replace(/ source document$/, '') ||
    undefined;
  const viewerTitle = documentTitle || fileName || 'Source document';

  const applyLink = useCallback(
    async (link: { documentId: string; attachmentId?: string } | null) => {
      if (!db || busy) return;
      setBusy(true);
      try {
        await setClinicalDocumentSourceLink(db, user.id, item.id, link);
        notifyDispatch({
          type: 'set_notification',
          message: link ? 'Source document linked' : 'Source document unlinked',
          variant: 'success',
        });
        setPickerOpen(false);
        navigate(0);
      } catch (error) {
        console.error(error);
        notifyDispatch({
          type: 'set_notification',
          message: `Unable to update source link: ${(error as Error).message}`,
          variant: 'error',
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, db, item.id, navigate, notifyDispatch, user.id],
  );

  const dialogs = (
    <>
      {viewerOpen && attachment && (
        <Modal open={viewerOpen} setOpen={setViewerOpen}>
          <div className="flex flex-col">
            <ModalHeader title={viewerTitle} setClose={setViewerOpen} />
            <EmbeddedAttachmentViewer
              attachment={{
                contentType: attachment.get('data_record.content_type'),
                raw: attachment.get('data_record.raw'),
                title: viewerTitle,
              }}
            />
          </div>
        </Modal>
      )}
      {pickerOpen && (
        <SourceDocumentPickerModal
          open={pickerOpen}
          setOpen={setPickerOpen}
          currentDocumentId={sourceDocumentId}
          busy={busy}
          onPick={applyLink}
        />
      )}
    </>
  );

  return {
    isSourceItself,
    isLinked,
    canView: isLinked && Boolean(attachment),
    documentTitle,
    fileName,
    busy,
    openViewer: () => setViewerOpen(true),
    openPicker: () => setPickerOpen(true),
    unlink: () => applyLink(null),
    dialogs,
  };
}

/**
 * View source on its own, for a statement that is not a full record card —
 * "No known allergies" keeps a way through to the document that said so
 * without the edit/delete row a real allergen carries.
 */
export function ManualSourceDocumentLink({ item }: { item: ClinicalDocument }) {
  const source = useSourceDocumentLink(item);
  if (source.isSourceItself || !source.canView) return null;
  const description = [source.documentTitle, source.fileName]
    .filter(Boolean)
    .join(' — ');
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          source.openViewer();
        }}
        title={description || undefined}
        className="relative mt-2 inline-flex min-h-8 items-center gap-1 rounded-md border border-primary-200 px-2.5 py-1 text-xs font-semibold text-primary-700 shadow-sm after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] hover:bg-primary-50"
      >
        View source
      </button>
      {source.dialogs}
    </>
  );
}

function SourceDocumentPickerModal({
  open,
  setOpen,
  currentDocumentId,
  busy,
  onPick,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  currentDocumentId?: string;
  busy: boolean;
  onPick: (link: { documentId: string; attachmentId?: string }) => void;
}) {
  const db = useRxDb();
  const user = useUser();
  const [options, setOptions] = useState<SourceOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    db.clinical_documents
      .find({
        selector: {
          user_id: user.id,
          'data_record.resource_type': 'documentreference',
        },
        sort: [{ 'metadata.date': 'desc' }],
      })
      .exec()
      .then((docs) => {
        if (cancelled) return;
        setOptions(
          docs.map((doc) => {
            const record = doc.toMutableJSON() as ClinicalDocument;
            const resource = getFhirResource<any>(record);
            return {
              documentId: record.metadata?.id || record.id,
              attachmentId: resource?.content?.[0]?.attachment?.url,
              label:
                record.metadata?.display_name ||
                resource?.content?.[0]?.attachment?.title ||
                record.metadata?.id ||
                'Untitled document',
              subtitle:
                getMetaString(record, 'source_image') ||
                resource?.type?.text ||
                undefined,
            };
          }),
        );
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [db, user.id]);

  return (
    <Modal open={open} setOpen={setOpen}>
      <div className="flex flex-col">
        <ModalHeader title="Link a source document" setClose={setOpen} />
        <div className="max-h-[70vh] overflow-y-auto p-3">
          {loading ? (
            <p className="p-4 text-sm text-gray-600">Loading documents…</p>
          ) : options.length === 0 ? (
            <p className="p-4 text-sm text-gray-600">
              No source documents are available. Upload a document first.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {options.map((option) => {
                const isCurrent = option.documentId === currentDocumentId;
                return (
                  <li key={option.documentId}>
                    <button
                      type="button"
                      disabled={busy || isCurrent}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onPick({
                          documentId: option.documentId,
                          attachmentId: option.attachmentId,
                        });
                      }}
                      className="flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-start hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="text-sm font-semibold text-gray-900">
                        {option.label}
                        {isCurrent && (
                          <span className="ms-2 rounded bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary-700">
                            Current
                          </span>
                        )}
                      </span>
                      {option.subtitle && (
                        <span className="text-xs text-gray-500">
                          {option.subtitle}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
