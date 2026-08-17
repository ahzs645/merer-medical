import { useCallback, useEffect, useState } from 'react';
import {
  ConnectionDocument,
  ConnectionSources,
} from '../../../models/connection-document/ConnectionDocument.type';
import { useRxDb } from '../../../app/providers/RxDbProvider';
import onpatientLogo from '../../../assets/img/onpatient-logo.jpeg';
import epicLogo from '../../../assets/img/MyChartByEpic.png';
import cernerLogo from '../../../assets/img/cerner-logo.png';
import allscriptsConnectLogo from '../../../assets/img/allscripts-logo.png';
import vaLogo from '../../../assets/img/va-logo.png';
import healowLogo from '../../../assets/img/ecw-logo.png';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { RxDocument } from 'rxdb';
import { useNotificationDispatch } from '../../../app/providers/NotificationProvider';
import { useUserPreferences } from '../../../app/providers/UserPreferencesProvider';
import { useUser } from '../../../app/providers/UserProvider';
import {
  useConfig,
  isConfigValid,
} from '../../../app/providers/AppConfigProvider';
import { ButtonLoadingSpinner } from './ButtonLoadingSpinner';
import {
  useSyncJobContext,
  useSyncJobDispatchContext,
} from '../../sync/SyncJobProvider';
import { AbnormalResultIcon } from '../../timeline/components/AbnormalResultIcon';
import { getLoginUrlBySource, setTenantUrlBySource } from '../ConnectionTab';
import React from 'react';
import { Modal } from '../../../shared/components/Modal';
import { ModalHeader } from '../../../shared/components/ModalHeader';
import { deleteConnectionWithCascade } from '../../../services/fhir/ConnectionService';
import { ConnectionDetailDrawer } from '../../sources/components/ConnectionDetailDrawer';
import {
  ArrowPathIcon,
  InformationCircleIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { safeFormatDate } from '../../../shared/utils/dateFormatters';

/**
 * The portal brand used to be glued onto the front of every title
 * ("MyChart - Highlands Hospital"). On a phone the shared prefix survives
 * truncation and the words that say *which* hospital get cut, so the brand is
 * rendered as a separate secondary line and the institution keeps the row.
 */
const portalBrands: Partial<Record<ConnectionSources, string>> = {
  epic: 'MyChart',
  cerner: 'Cerner',
  veradigm: 'Veradigm',
  freestyle_libre: 'FreeStyle Libre',
};

function getImage(logo: ConnectionSources) {
  switch (logo) {
    case 'onpatient': {
      return onpatientLogo;
    }
    case 'epic': {
      return epicLogo;
    }
    case 'cerner': {
      return cernerLogo;
    }
    case 'veradigm': {
      return allscriptsConnectLogo;
    }
    case 'va': {
      return vaLogo;
    }
    case 'healow': {
      return healowLogo;
    }
    default: {
      return undefined;
    }
  }
}

export function ConnectionCard({
  item,
  baseUrl,
}: {
  item: RxDocument<ConnectionDocument>;
  baseUrl: string;
}) {
  const db = useRxDb(),
    config = useConfig(),
    user = useUser(),
    [deleting, setDeleting] = useState(false),
    userPreferences = useUserPreferences(),
    removeDocument = (document: RxDocument<ConnectionDocument>) => {
      setDeleting(true);
      const connectionId = document.get('id');

      deleteConnectionWithCascade(db, user.id, connectionId)
        .then(() => {
          setDeleting(false);
          notifyDispatch({
            type: 'set_notification',
            message: `Successfully removed connection`,
            variant: 'success',
          });
        })
        .catch((e) => {
          console.error(e);
          setDeleting(false);
          notifyDispatch({
            type: 'set_notification',
            message: `Error removing connection: ${e.message}`,
            variant: 'error',
          });
        });
    },
    notifyDispatch = useNotificationDispatch(),
    sync = useSyncJobContext(),
    syncD = useSyncJobDispatchContext(),
    syncJobEntries = new Set(Object.keys(sync)),
    isLocalImport =
      item.get('source') === 'manual' ||
      item.get('source') === 'freestyle_libre',
    syncing = syncJobEntries.has(item.get('id')),
    handleFetchData = useCallback(() => {
      if (isLocalImport) return;
      if (!isConfigValid(config)) {
        notifyDispatch({
          type: 'set_notification',
          message: 'Configuration not loaded. Please refresh the page.',
          variant: 'error',
        });
        return;
      }
      if (syncD && userPreferences) {
        syncD({
          type: 'add_job',
          config,
          id: item.toJSON().id,
          connectionDocument: item,
          baseUrl,
          useProxy: userPreferences.use_proxy,
          db,
        });
      }
    }, [
      baseUrl,
      config,
      db,
      isLocalImport,
      item,
      notifyDispatch,
      syncD,
      userPreferences,
    ]);

  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showPeriodText, setShowPeriodText] = useState('...');

  const handleFix = useCallback(async () => {
    if (!isConfigValid(config)) {
      notifyDispatch({
        type: 'set_notification',
        message: 'Configuration not loaded. Please refresh the page.',
        variant: 'error',
      });
      return;
    }
    setTenantUrlBySource(item);
    window.location = await getLoginUrlBySource(config, item);
  }, [config, item, notifyDispatch]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (syncing) {
      interval = setInterval(() => {
        if (showPeriodText === '...') {
          setShowPeriodText('.');
        } else if (showPeriodText === '.') {
          setShowPeriodText('..');
        } else if (showPeriodText === '..') {
          setShowPeriodText('...');
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showPeriodText, syncing]);

  const source = item.get('source') as ConnectionSources,
    brand = portalBrands[source],
    institution = item.get('name') as string,
    lastRefreshed = item.get('last_refreshed') as string | undefined,
    hasError = !!item.get('last_sync_was_error'),
    displayName = brand ? `${brand} - ${institution}` : institution;

  return (
    <li className="col-span-1 mb-3 rounded-lg bg-white shadow">
      <div className="flex w-full items-start gap-3 p-4">
        {getImage(source) ? (
          <img
            className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-300"
            src={getImage(source)}
            alt=""
          />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-800">
            CGM
          </div>
        )}
        <div className="min-w-0 flex-1">
          {brand ? (
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-gray-500">
              {brand}
            </p>
          ) : null}
          <h3
            className="line-clamp-2 text-sm font-semibold text-gray-900"
            title={institution}
          >
            {institution}
          </h3>
          {deleting ? (
            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-700">
              <ButtonLoadingSpinner />
              Disconnecting…
            </p>
          ) : hasError ? (
            <p className="mt-1 flex items-start text-sm font-medium text-red-600">
              <span className="mt-0.5 flex-shrink-0">
                <AbnormalResultIcon />
              </span>
              <span className="ps-1">
                {lastRefreshed ? (
                  <>
                    Unable to sync since{' '}
                    <RelativeSyncTime isoDate={lastRefreshed} />
                  </>
                ) : (
                  'Unable to sync'
                )}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm font-medium text-gray-700">
              {syncing ? (
                `Syncing now${showPeriodText}`
              ) : lastRefreshed ? (
                <>
                  {isLocalImport ? 'Imported ' : 'Connected · synced '}
                  <RelativeSyncTime isoDate={lastRefreshed} />
                </>
              ) : isLocalImport ? (
                'Imported'
              ) : (
                'Connected'
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label={`Details and options for ${displayName}`}
          title="Details and options"
          onClick={() => setShowDetail(true)}
          className="-me-2 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <InformationCircleIcon className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      {/* Only the routine action lives on the card. Disconnecting deletes every
          record from the source, so it sits behind the details button with a
          confirmation rather than beside Sync as an equal-weight twin. */}
      {isLocalImport ? null : (
        <div className="flex items-center justify-end gap-1 border-t border-gray-100 px-2 py-1">
          {hasError ? (
            <button
              type="button"
              disabled={syncing}
              onClick={handleFix}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md px-3 text-sm font-bold text-amber-700 hover:bg-amber-50 disabled:text-gray-400"
            >
              <WrenchScrewdriverIcon className="h-4 w-4" aria-hidden="true" />
              Fix connection
            </button>
          ) : null}
          <button
            type="button"
            disabled={syncing || deleting}
            onClick={handleFetchData}
            className="text-primary-700 hover:bg-primary-50 inline-flex min-h-[44px] items-center gap-2 rounded-md px-3 text-sm font-bold disabled:text-gray-400"
          >
            {syncing ? (
              <ButtonLoadingSpinner />
            ) : (
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            )}
            {syncing ? 'Syncing' : 'Sync'}
          </button>
        </div>
      )}
      <ConnectionDetailDrawer
        item={item}
        open={showDetail}
        setOpen={setShowDetail}
        useProxy={!!userPreferences?.use_proxy}
        syncing={syncing}
        deleting={deleting}
        isLocalImport={isLocalImport}
        onSync={() => handleFetchData()}
        onFix={handleFix}
        onDisconnect={() => {
          // Confirm before a destructive, irreversible delete.
          setShowDetail(false);
          setShowModal(true);
        }}
      />
      <Modal
        open={showModal}
        setOpen={setShowModal}
        overflowHidden
        overflowXHidden
      >
        <ModalHeader
          title="Disconnect this source?"
          subtitle={
            <p className="text-sm text-gray-700">
              {displayName} will be disconnected and the records already
              imported from it will be deleted from this device. This cannot be
              undone — you can reconnect later, but you will need to sign in to
              the portal again.
            </p>
          }
          setClose={(x: boolean) => setShowModal(x)}
        />
        <div className="m-4 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
            onClick={() => setShowModal(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-red-700 bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700"
            onClick={() => {
              removeDocument(item);
              setShowModal(false);
            }}
          >
            Disconnect and delete records
          </button>
        </div>
      </Modal>
    </li>
  );
}

/**
 * A bare "synced on Nov 14" cannot tell a two-week-old sync from a two-year-old
 * one, so show the relative age and keep the exact timestamp on hover/focus.
 */
function RelativeSyncTime({ isoDate }: { isoDate: string }) {
  let relative = isoDate;
  try {
    relative = formatDistanceToNow(parseISO(isoDate), { addSuffix: true });
  } catch {
    // Fall back to the raw value rather than crashing the card.
  }
  return (
    <time
      dateTime={isoDate}
      title={safeFormatDate(isoDate, "MMMM d, yyyy 'at' h:mm a", isoDate)}
      className="underline decoration-dotted underline-offset-2"
    >
      {relative}
    </time>
  );
}
