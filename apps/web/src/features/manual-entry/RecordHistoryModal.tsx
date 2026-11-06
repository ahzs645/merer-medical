import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import {
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { Modal } from '../../shared/components/Modal';
import { ModalHeader } from '../../shared/components/ModalHeader';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { AuditLogEntry, getAuditLog } from '../audit/auditLog';
import { ProvenancePanel } from '../provenance/ProvenancePanel';
import { buildRecordHistory } from './recordHistory';

export function RecordHistoryModal({
  item,
  open,
  setOpen,
  documentTitle,
  fileName,
  onViewSource,
}: {
  item: ClinicalDocument;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  documentTitle?: string;
  fileName?: string;
  onViewSource?: () => void;
}) {
  const db = useRxDb();
  const user = useUser();
  const { t } = useInterfaceLanguage();
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [connection, setConnection] = useState<ConnectionDocument>();

  useEffect(() => {
    if (!open || !db) return;
    let cancelled = false;
    getAuditLog(db, user.id)
      .then((entries) => !cancelled && setAuditLog(entries))
      .catch(() => undefined);
    db.connection_documents
      .findOne({ selector: { id: item.connection_record_id } })
      .exec()
      .then((doc) => {
        if (!cancelled && doc)
          setConnection(doc.toMutableJSON() as ConnectionDocument);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [db, item.connection_record_id, open, user.id]);

  const history = useMemo(
    () => buildRecordHistory(item, auditLog),
    [auditLog, item],
  );
  const title = item.metadata?.display_name || t('Record');

  return (
    <Modal open={open} setOpen={setOpen} flex>
      <div className="flex min-h-0 flex-1 flex-col sm:max-h-[85vh]">
        <ModalHeader
          title={t('Record history')}
          subtitle={title}
          setClose={setOpen}
        />
        <div className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain p-4 text-sm">
          {(documentTitle || fileName) && (
            <section>
              <Heading icon={DocumentTextIcon} text={t('Source document')} />
              <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-gray-200 p-3">
                <div className="min-w-0">
                  {documentTitle && (
                    <p className="break-words font-medium text-gray-900">
                      {documentTitle}
                    </p>
                  )}
                  {fileName && (
                    <p className="break-all text-xs text-gray-500">
                      {fileName}
                    </p>
                  )}
                </div>
                {onViewSource && (
                  <button
                    type="button"
                    onClick={onViewSource}
                    className="shrink-0 rounded-md border border-primary-200 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                  >
                    {t('View source')}
                  </button>
                )}
              </div>
            </section>
          )}

          {(history.review?.status || history.reviewNotes.length > 0) && (
            <section>
              <Heading
                icon={ExclamationTriangleIcon}
                text={t('Review and assumptions')}
              />
              {history.review?.status && (
                <p className="mb-2 text-xs text-gray-600">
                  <span>{t('Review status')}</span>
                  {': '}
                  {history.review.status}
                  {history.review.verifiedAt
                    ? ` · ${safeFormatDate(history.review.verifiedAt, 'PP', history.review.verifiedAt)}`
                    : ''}
                  {history.review.verifiedBy
                    ? ` · ${history.review.verifiedBy}`
                    : ''}
                </p>
              )}
              <ul className="grid gap-2">
                {history.reviewNotes.map((note) => (
                  <li
                    key={note.text}
                    className={`rounded-md p-2.5 ${
                      note.assumption
                        ? 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-600/20'
                        : 'bg-gray-50 text-gray-800'
                    }`}
                  >
                    {note.assumption && (
                      <span className="me-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold">
                        {t('Assumption')}
                      </span>
                    )}
                    <span className="break-words">{note.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <Heading icon={ClockIcon} text={t('Activity')} />
            {history.events.length === 0 ? (
              <p className="text-gray-500">{t('No activity recorded.')}</p>
            ) : (
              <ol className="relative ms-2 border-s border-gray-200">
                {history.events.map((event, index) => (
                  <li key={`${event.at}-${index}`} className="mb-3 ms-4">
                    <span className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary-400 ring-4 ring-white" />
                    <p className="text-xs text-gray-500">
                      {event.at
                        ? safeFormatDate(event.at, 'PPp', event.at)
                        : ''}
                    </p>
                    <p className="font-medium text-gray-900">
                      {t(event.label)}
                    </p>
                    {event.detail && (
                      <p className="break-words text-gray-600">
                        {event.detail}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {history.versions.length > 0 && (
            <section>
              <Heading icon={ClockIcon} text={t('Earlier versions')} />
              <div className="grid gap-2">
                {history.versions.map((version) => (
                  <details
                    key={version.to}
                    className="rounded-md border border-gray-200 p-2.5"
                  >
                    <summary className="cursor-pointer font-medium text-gray-900">
                      <span>{t('Version')}</span> {version.from} → {version.to}
                      <span className="ms-2 text-xs text-gray-500">
                        {version.changes.length + version.more}{' '}
                        <span>{t('changes')}</span>
                      </span>
                    </summary>
                    <ul className="mt-2 grid gap-1.5">
                      {version.changes.map((change) => (
                        <li key={change.path} className="break-words text-xs">
                          <span className="font-mono text-gray-500">
                            {change.path}
                          </span>
                          <br />
                          <span className="text-red-700 line-through">
                            {change.before ?? '—'}
                          </span>{' '}
                          →{' '}
                          <span className="text-green-800">
                            {change.after ?? '—'}
                          </span>
                        </li>
                      ))}
                      {version.more > 0 && (
                        <li className="text-xs text-gray-500">
                          +{version.more}
                        </li>
                      )}
                    </ul>
                  </details>
                ))}
              </div>
            </section>
          )}

          <ProvenancePanel document={item} connection={connection} />
        </div>
      </div>
    </Modal>
  );
}

function Heading({
  icon: Icon,
  text,
}: {
  icon: typeof ClockIcon;
  text: string;
}) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {text}
    </h3>
  );
}
