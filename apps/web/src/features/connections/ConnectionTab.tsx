import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigationType, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  LinkIcon,
  ExclamationCircleIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { RxDocument } from 'rxdb';

import { AppPage } from '../../shared/components/AppPage';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { ConnectionCard } from './components/ConnectionCard';
import { EMRVendor, TenantSelectModal } from './components/TenantSelectModal';
import { GenericBanner } from '../../shared/components/GenericBanner';
import { useConnectionCards } from './hooks/useConnectionCards';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { useConfig } from '../../app/providers/AppConfigProvider';
import {
  initiateEpicAuth,
  initiateCernerAuth,
  initiateVeradigmAuth,
  initiateHealowAuth,
  setTenantEpicUrl,
  setTenantCernerUrl,
  setTenantVeradigmUrl,
  setTenantHealowUrl,
} from './oauth';
import { Routes } from '../../Routes';
import { buildAddRecordPath } from '../manual-entry/addRecordPath';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useNotificationDispatch } from '../../app/providers/NotificationProvider';
import { useUserPreferences } from '../../app/providers/UserPreferencesProvider';
import { useIntegrationStatus } from '../sources/integrationStatus';
import { IntegrationStatusPanel } from '../sources/components/IntegrationStatusPanel';
import { ImportRecordsPanel } from '../sources/components/ImportRecordsPanel';
import {
  PendingConnection,
  PreflightConnectModal,
} from '../sources/components/PreflightConnectModal';

export { getLoginUrlBySource, setTenantUrlBySource } from './oauth';

/** A titled section within the Sources hub. */
function SourcesSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm font-medium text-gray-600">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SyncHistoryRow({ item }: { item: RxDocument<ConnectionDocument> }) {
  // Include the year: without it a sync from two years ago reads the same as
  // one from two weeks ago on the screen meant to answer exactly that.
  const fmt = (iso?: string) => safeFormatDate(iso, 'MMM d, yyyy, p', '—');
  const hasError = item.get('last_sync_was_error');
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pe-3 text-sm font-medium text-gray-900">
        {item.get('name')}
      </td>
      <td className="py-2 pe-3 text-sm text-gray-600">
        {fmt(item.get('last_refreshed'))}
      </td>
      <td className="py-2 pe-3 text-sm text-gray-600">
        {fmt(item.get('last_sync_attempt'))}
      </td>
      <td className="py-2 text-sm">
        {hasError ? (
          <span className="inline-flex items-center gap-1 text-red-600">
            <ExclamationCircleIcon className="h-4 w-4" />
            Error
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-green-700">
            <CheckCircleIcon className="h-4 w-4" />
            OK
          </span>
        )}
      </td>
    </tr>
  );
}

type SourceTask = 'import' | 'portal' | 'manual' | 'manage';

const sourceTasks = [
  {
    id: 'import',
    title: 'Import a file',
    description: 'Add documents, device readings, or a record package.',
    icon: ArrowUpTrayIcon,
  },
  {
    id: 'portal',
    title: 'Connect a patient portal',
    description: 'Find your provider and sign in to import records.',
    icon: LinkIcon,
  },
  {
    id: 'manual',
    title: 'Add a record manually',
    description: 'Enter a medical, dental, or eye-care record.',
    icon: PencilSquareIcon,
  },
] as const;

const ConnectionTab: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigationType = useNavigationType();
  const taskParam = searchParams.get('task');
  const task: SourceTask | null =
    taskParam === 'import' ||
    taskParam === 'portal' ||
    taskParam === 'manual' ||
    taskParam === 'manage'
      ? taskParam
      : null;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousTask = useRef(task);

  const taskPath = (nextTask: SourceTask | null) => {
    const params = new URLSearchParams(searchParams);
    if (nextTask) params.set('task', nextTask);
    else params.delete('task');
    const query = params.toString();
    return `${Routes.AddConnection}${query ? `?${query}` : ''}`;
  };

  useEffect(() => {
    if (previousTask.current === task) return;
    previousTask.current = task;
    // Query-only navigation is not announced by the shell's route hook. Give
    // the chosen task a focus destination, without interrupting a package offer.
    if (!document.querySelector('[role="dialog"]')) {
      headingRef.current?.focus({ preventScroll: true });
    }
    if (navigationType !== 'POP' && contentRef.current?.parentElement) {
      contentRef.current.parentElement.scrollTop = 0;
    }
  }, [navigationType, task]);

  const list = useConnectionCards(),
    { t } = useInterfaceLanguage(),
    notifyDispatch = useNotificationDispatch(),
    config = useConfig(),
    userPreferences = useUserPreferences(),
    integrationStatus = useIntegrationStatus(),
    [openSelectModal, setOpenSelectModal] = useState(false),
    [pending, setPending] = useState<PendingConnection | null>(null),
    [showPreflight, setShowPreflight] = useState(false),
    commitRef = useRef<(() => void) | null>(null);

  // Build the redirect action for the chosen tenant but defer running it until
  // the user confirms on the "what will be imported?" preflight screen.
  const requestConnect = useCallback(
    (
      base: string & Location,
      auth: string & Location,
      token: string & Location,
      name: string,
      id: string,
      vendor: EMRVendor,
      fhirVersion?: 'DSTU2' | 'R4',
    ) => {
      const version = fhirVersion || 'DSTU2';
      // Build the auth URL for the chosen vendor. Throwing/rejecting here
      // (e.g. missing OAuth configuration) must surface to the user instead
      // of leaving the Connect click a silent no-op.
      const buildAuthUrl = (): Promise<string> => {
        switch (vendor) {
          case 'epic':
            setTenantEpicUrl(base, auth, token, name, id, version);
            return initiateEpicAuth(
              config,
              base,
              auth,
              token,
              name,
              id,
              version,
            );
          case 'cerner':
            setTenantCernerUrl(base, auth, token, name, id, version);
            return initiateCernerAuth(
              config,
              base,
              auth,
              token,
              name,
              id,
              version,
            );
          case 'veradigm':
            setTenantVeradigmUrl(base, auth, token, name, id);
            return initiateVeradigmAuth(config, base, auth, token, name);
          case 'healow':
            setTenantHealowUrl(base, auth, token, name, id);
            return initiateHealowAuth(config, base, auth, token, name, id);
          default:
            return Promise.reject(
              new Error(`Unsupported portal type: ${vendor}`),
            );
        }
      };
      const commit = () => {
        Promise.resolve()
          .then(buildAuthUrl)
          .then((url) => {
            window.location.href = url;
          })
          .catch((error) => {
            console.error(error);
            notifyDispatch({
              type: 'set_notification',
              message: `Unable to start the connection to ${name}: ${(error as Error).message}`,
              variant: 'error',
            });
          });
      };

      commitRef.current = commit;
      setPending({
        vendor,
        name,
        fhirVersion:
          vendor === 'veradigm' || vendor === 'healow' ? undefined : version,
        useProxy: vendor === 'onpatient' ? true : !!userPreferences?.use_proxy,
      });
      setOpenSelectModal(false);
      setShowPreflight(true);
    },
    [config, notifyDispatch, userPreferences?.use_proxy],
  );

  const portalConnections = list?.filter(
    (item) =>
      item.get('source') !== 'manual' &&
      item.get('source') !== 'freestyle_libre',
  );
  const deviceConnections = list?.filter(
    (item) => item.get('source') === 'freestyle_libre',
  );

  const selectedTask = sourceTasks.find((item) => item.id === task);
  const heading =
    selectedTask?.title ??
    (task === 'manage' ? 'Manage sources' : 'What would you like to do?');

  return (
    <AppPage
      banner={<GenericBanner text={t('Sources')} />}
      contentClassName="overflow-y-auto"
    >
      <div
        ref={contentRef}
        className="mx-auto max-w-4xl px-4 pb-8 pt-4 sm:px-6 lg:px-8"
      >
        {task ? (
          <Link
            to={taskPath(null)}
            className="text-primary-700 hover:bg-primary-50 -ms-2 mb-2 inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-semibold"
          >
            <ArrowLeftIcon
              className="h-4 w-4 shrink-0 rtl:rotate-180"
              aria-hidden="true"
            />
            {t('All source tasks')}
          </Link>
        ) : null}
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-bold text-gray-900 focus:outline-none"
        >
          {t(heading)}
        </h2>
        {!task ? (
          <>
            <p className="mt-1 text-sm text-gray-600">
              {t(
                'Choose how to add records. Your records stay on this device.',
              )}
            </p>
            <nav
              aria-label={t('Add records')}
              className="mt-4 grid gap-3 sm:grid-cols-3"
            >
              {sourceTasks.map(({ id, title, description, icon: Icon }) => (
                <Link
                  key={id}
                  to={taskPath(id)}
                  aria-labelledby={`source-task-${id}`}
                  className="hover:border-primary-400 focus-visible:ring-primary-500 flex min-h-[76px] items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-start shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <Icon
                    className="text-primary-700 mt-0.5 h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      id={`source-task-${id}`}
                      className="block text-sm font-bold text-gray-900"
                    >
                      {t(title)}
                    </span>
                    <span className="mt-1 block text-sm text-gray-600">
                      {t(description)}
                    </span>
                  </span>
                  <ChevronRightIcon
                    className="mt-0.5 h-5 w-5 shrink-0 text-gray-400 rtl:rotate-180"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </nav>
            <div className="mt-5 border-t border-gray-200 pt-3">
              <Link
                to={taskPath('manage')}
                className="text-primary-700 hover:bg-primary-50 -ms-2 inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-semibold"
              >
                {t('Manage sources')}
                <ChevronRightIcon
                  className="h-4 w-4 rtl:rotate-180"
                  aria-hidden="true"
                />
              </Link>
              <p className="text-sm text-gray-600">
                {t(
                  'Review connected portals, imported devices, and sync history.',
                )}
              </p>
            </div>
          </>
        ) : null}

        {task === 'import' ? (
          <div className="mt-2">
            <p className="mb-4 text-sm text-gray-600">
              {t('Choose the kind of file you want to add.')}
            </p>
            <ImportRecordsPanel
              includeBackupExport={false}
              returnTo={taskPath('import')}
            />
          </div>
        ) : null}

        {task === 'portal' ? (
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              {t(
                'Choose your provider, review what will be imported, then sign in to its patient portal.',
              )}
            </p>
            <button
              type="button"
              className="bg-primary-600 hover:bg-primary-700 mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-bold text-white sm:w-auto"
              onClick={() => setOpenSelectModal(true)}
            >
              {t('Find a patient portal')}
            </button>
            <div className="mt-5">
              <IntegrationStatusPanel status={integrationStatus} />
            </div>
            <Link
              to={taskPath('manage')}
              className="text-primary-700 mt-3 inline-flex min-h-9 items-center text-sm font-semibold"
            >
              {t('Manage connected sources')}
            </Link>
          </div>
        ) : null}

        {task === 'manual' ? (
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              {t(
                'Choose a form. You can review it before saving to the selected profile.',
              )}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Add a medical record', specialty: undefined },
                { label: 'Add a dental record', specialty: 'dental' as const },
                {
                  label: 'Add an optometry record',
                  specialty: 'optometry' as const,
                },
              ].map(({ label, specialty }) => (
                <Link
                  key={label}
                  to={buildAddRecordPath({
                    specialty,
                    returnTo: taskPath('manual'),
                  })}
                  className="text-primary-700 hover:bg-primary-50 inline-flex min-h-[52px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-bold shadow-sm"
                >
                  <PlusIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {t(label)}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {task === 'manage' ? (
          <>
            <p className="mt-1 text-sm text-gray-600">
              {t(
                'Review connected portals, imported devices, and sync history.',
              )}
            </p>
            <SourcesSection
              title={t('Connected portals')}
              description={t(
                'Patient portals you have connected for automatic syncing.',
              )}
            >
              {portalConnections && portalConnections.length > 0 ? (
                <ul className="grid grid-cols-1">
                  {portalConnections.map((item) => (
                    <ConnectionCard
                      key={item.id}
                      item={item}
                      baseUrl={item.get('location')}
                    />
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  {t('No portals connected yet.')}
                </p>
              )}
              <Link
                to={taskPath('portal')}
                className="text-primary-700 mt-2 inline-flex min-h-9 items-center text-sm font-semibold"
              >
                {t('Connect a patient portal')}
              </Link>
            </SourcesSection>

            <SourcesSection
              title={t('Devices and wearables')}
              description={t(
                'Continuous glucose monitors and other devices you import readings from.',
              )}
            >
              {deviceConnections && deviceConnections.length > 0 ? (
                <ul className="grid grid-cols-1">
                  {deviceConnections.map((item) => (
                    <ConnectionCard
                      key={item.id}
                      item={item}
                      baseUrl={item.get('location')}
                    />
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  {t(
                    'No devices yet. Import a FreeStyle Libre export or log device readings manually.',
                  )}
                </p>
              )}
              <Link
                to={taskPath('import')}
                className="text-primary-700 mt-2 inline-flex min-h-9 items-center text-sm font-semibold"
              >
                {t('Import a file')}
              </Link>
            </SourcesSection>

            <SourcesSection
              title={t('Source health / sync history')}
              description={t(
                'Last successful and attempted sync for every source.',
              )}
            >
              {list && list.length > 0 ? (
                <div
                  className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                  role="region"
                  aria-label={t('Source health / sync history')}
                  tabIndex={0}
                >
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 text-start">
                        {['Source', 'Last sync', 'Last attempt', 'Status'].map(
                          (label) => (
                            <th
                              key={label}
                              scope="col"
                              className="pb-2 pe-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
                            >
                              {t(label)}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((item) => (
                        <SyncHistoryRow key={item.id} item={item} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  {t('No sources yet.')}
                </p>
              )}
            </SourcesSection>
          </>
        ) : null}
      </div>

      <TenantSelectModal
        open={openSelectModal}
        setOpen={setOpenSelectModal}
        onClick={requestConnect}
      />
      <PreflightConnectModal
        pending={pending}
        open={showPreflight}
        setOpen={setShowPreflight}
        onConfirm={() => {
          commitRef.current?.();
        }}
      />
    </AppPage>
  );
};

export default ConnectionTab;

export interface SelectOption {
  id: string;
  name: string;
  baseUrl: string & Location;
  authUrl: string & Location;
  tokenUrl: string & Location;
  // set on unified "Search All" results so the right login flow can be started
  vendor?: EMRVendor;
  fhirVersion?: 'DSTU2' | 'R4';
}
