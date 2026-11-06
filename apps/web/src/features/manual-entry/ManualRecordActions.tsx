import { Menu, Transition } from '@headlessui/react';
import {
  ClockIcon,
  DocumentArrowDownIcon,
  DocumentMagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  LinkIcon,
  LockClosedIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  ComponentType,
  Fragment,
  lazy,
  MouseEvent,
  ReactNode,
  SVGProps,
  Suspense,
  useEffect,
  useId,
  useState,
} from 'react';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useNotificationDispatch } from '../../app/providers/NotificationProvider';
import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
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
import { useSourceDocumentLink } from './ManualSourceDocumentLink';
import { RecordHistoryModal } from './RecordHistoryModal';

/**
 * The class the actions row wears, exported so a card that has an action of
 * its own — Imaging's "Open record" — can host one row rather than stranding
 * its button on a line above Edit and Delete.
 */
export const manualRecordActionRowClass =
  'mt-3 flex flex-wrap items-center gap-2';

/**
 * One size for every action on a card. They used to come in two — Edit and
 * Delete at 44px, the source chips at 28px — so on a phone the row wrapped into
 * a short line and a tall one. Each button now draws at 32px and carries an
 * invisible 44px tap area (`after:` inset six pixels above and below), so the
 * row is compact without shrinking what a thumb has to hit.
 */
export const actionTapAreaClass =
  "relative after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']";
export const actionChipClass = `${actionTapAreaClass} inline-flex min-h-8 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-60`;
const neutralChip = `${actionChipClass} border-gray-300 text-gray-800 hover:bg-gray-50`;
const primaryChip = `${actionChipClass} border-primary-200 text-primary-700 hover:bg-primary-50`;
const dangerChip = `${actionChipClass} border-red-200 text-red-700 hover:bg-red-50`;

/**
 * The edit sheet, fetched the first time somebody presses Edit.
 *
 * Every timeline card carries these actions, and the timeline is the landing
 * page, so a static import put the whole record form — builders, terminology
 * lookups, the lab table — into the first script every visitor downloads, for
 * a sheet most visits never open.
 */
const ManualRecordModal = lazy(() =>
  import('./ManualRecordModal').then((module) => ({
    default: module.ManualRecordModal,
  })),
);

export function ManualRecordActions({
  item,
  inline = false,
  explainReadOnly = false,
  connection,
}: {
  item: ClinicalDocument;
  /** Render the buttons only, for a caller supplying the row around them. */
  inline?: boolean;
  /**
   * Say why a synced record has no Edit or Delete. For pages showing a single
   * record; a list would repeat the note once per row.
   */
  explainReadOnly?: boolean;
  /**
   * The record's connection, when the page has it. Pass the same one given to
   * the page's `ProvenancePanel`: the read-only note and the panel's "How it
   * arrived" are answers to one question, and with the connection only on the
   * panel's side, Insurance said "Entered by hand" an inch below "Synced from
   * a connected source — edit it there".
   */
  connection?: Partial<ConnectionDocument>;
}) {
  const db = useRxDb();
  const user = useUser();
  const notifyDispatch = useNotificationDispatch();
  const { t } = useInterfaceLanguage();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  // Mounted from the first open onward, so closing still animates out.
  const [editRequested, setEditRequested] = useState(false);
  useEffect(() => {
    if (isEditOpen) setEditRequested(true);
  }, [isEditOpen]);
  const source = useSourceDocumentLink(item);
  const stop = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const [historyOpen, setHistoryOpen] = useState(false);
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
        {t(readOnlyReason(buildRecordProvenance(item, connection).entryMethod))}
      </span>
    );
    const readOnly = (
      <>
        {note}
        <button
          type="button"
          onClick={(event) => {
            stop(event);
            setHistoryOpen(true);
          }}
          className={neutralChip}
        >
          <ClockIcon className="h-4 w-4" aria-hidden="true" />
          {t('History')}
        </button>
        {historyOpen && (
          <RecordHistoryModal
            item={item}
            open={historyOpen}
            setOpen={setHistoryOpen}
            documentTitle={source.documentTitle}
            fileName={source.fileName}
          />
        )}
      </>
    );
    if (inline) return readOnly;
    return <div className={manualRecordActionRowClass}>{readOnly}</div>;
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

  async function onOpenAttachment(attachmentId: string) {
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

  async function onDownloadAttachment(attachmentId: string) {
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

  // On a card: what a person does with a record — read its source, correct
  // it, remove it. Everything else (its history, re-pointing or dropping the
  // source link, files attached by hand) is one tap further, in the menu.
  const actions = (
    <>
      {source.canView && (
        <SourceButton
          title={source.documentTitle}
          fileName={source.fileName}
          onClick={(event) => {
            stop(event);
            source.openViewer();
          }}
        />
      )}
      <button
        type="button"
        onClick={(event) => {
          stop(event);
          setIsEditOpen(true);
        }}
        className={neutralChip}
      >
        <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
        {t('Edit')}
      </button>
      <button
        type="button"
        disabled={isDeleting}
        onClick={onRequestDelete}
        className={dangerChip}
      >
        <TrashIcon className="h-4 w-4" aria-hidden="true" />
        {t(isDeleting ? 'Deleting' : 'Delete')}
      </button>
      <MoreMenu label={t('More actions')}>
        <MenuAction
          icon={ClockIcon}
          onSelect={() => setHistoryOpen(true)}
          label={t('History')}
        />
        {!source.isSourceItself && (
          <MenuAction
            icon={LinkIcon}
            disabled={source.busy}
            onSelect={source.openPicker}
            label={t(source.isLinked ? 'Change source' : 'Link source')}
          />
        )}
        {!source.isSourceItself && source.isLinked && (
          <MenuAction
            icon={XMarkIcon}
            disabled={source.busy}
            onSelect={source.unlink}
            label={t('Unlink source')}
          />
        )}
        {linkedFiles.map((file) => (
          <Fragment key={file.id}>
            <MenuAction
              icon={EyeIcon}
              onSelect={() => onOpenAttachment(file.id)}
              label={`${t('Open')} ${file.filename || t('linked file')}`}
            />
            <MenuAction
              icon={DocumentArrowDownIcon}
              onSelect={() => onDownloadAttachment(file.id)}
              label={`${t('Download')} ${file.filename || t('linked file')}`}
            />
          </Fragment>
        ))}
      </MoreMenu>
      {source.dialogs}
      {historyOpen && (
        <RecordHistoryModal
          item={item}
          open={historyOpen}
          setOpen={setHistoryOpen}
          documentTitle={source.documentTitle}
          fileName={source.fileName}
          onViewSource={
            source.canView
              ? () => {
                  setHistoryOpen(false);
                  source.openViewer();
                }
              : undefined
          }
        />
      )}
      {editRequested && (
        <Suspense fallback={null}>
          <ManualRecordModal
            open={isEditOpen}
            recordId={item.id}
            onClose={() => setIsEditOpen(false)}
            onSaved={notifyRecordsChanged}
          />
        </Suspense>
      )}
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

/**
 * View source, naming the document on hover and keyboard focus. The browser's
 * own `title` tooltip waits a second and never shows on a phone, and it said
 * only the file name ("H.E. Mr. … 4-281-518.pdf"); this one says what the
 * document is, then which file. On touch, the History view names it.
 */
function SourceButton({
  title,
  fileName,
  onClick,
}: {
  title?: string;
  fileName?: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const { t } = useInterfaceLanguage();
  const tooltipId = useId();
  const described = Boolean(title || fileName);
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        className={primaryChip}
        aria-describedby={described ? tooltipId : undefined}
      >
        <DocumentMagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
        {t('View source')}
      </button>
      {described && (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none invisible absolute bottom-full start-0 z-30 mb-2 w-max max-w-[18rem] rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-normal text-white opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
        >
          {title && <span className="block font-semibold">{title}</span>}
          {fileName && fileName !== title && (
            <span className="block break-all text-gray-300">{fileName}</span>
          )}
        </span>
      )}
    </span>
  );
}

function MoreMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Menu as="div" className="relative inline-flex">
      <Menu.Button
        className={`${neutralChip} px-2`}
        onClick={(event: MouseEvent<HTMLButtonElement>) =>
          event.stopPropagation()
        }
      >
        <span className="sr-only">{label}</span>
        <EllipsisHorizontalIcon className="h-4 w-4" aria-hidden="true" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <Menu.Items className="absolute end-0 top-full z-30 mt-1 w-60 origin-top-right rounded-lg bg-white p-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
          {children}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

function MenuAction({
  icon: Icon,
  label,
  onSelect,
  disabled,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <Menu.Item disabled={disabled}>
      {({ active }) => (
        <button
          type="button"
          disabled={disabled}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSelect();
          }}
          className={`flex min-h-[44px] w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm disabled:opacity-60 ${
            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <span className="min-w-0 break-words">{label}</span>
        </button>
      )}
    </Menu.Item>
  );
}
