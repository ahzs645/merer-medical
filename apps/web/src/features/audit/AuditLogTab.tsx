import { useEffect, useState } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { AuditLogEntry, getAuditLog } from './auditLog';

export function AuditLogTab() {
  const { t } = useInterfaceLanguage();
  const db = useRxDb();
  const user = useUser();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    let isMounted = true;
    getAuditLog(db, user.id).then((items) => {
      if (isMounted) setEntries(items);
    });
    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  return (
    <AppPage banner={<GenericBanner text={t('Audit log')} />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {entries.length ? (
            entries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      {entry.summary}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      {entry.action} · {entry.actor}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                    <ClockIcon className="h-4 w-4" />
                    {safeFormatDate(entry.occurredAt, 'PP p', '')}
                  </div>
                </div>
                {(entry.targetType || entry.targetId || entry.source) && (
                  <p className="mt-2 break-words text-xs text-gray-600">
                    {[entry.targetType, entry.targetId, entry.source]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </article>
            ))
          ) : (
            <div className="rounded-md bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('No audit events yet')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {t(
                  'Imports, edits, exports, shares, AI access, and sync events will appear here as local audit entries.',
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
}
