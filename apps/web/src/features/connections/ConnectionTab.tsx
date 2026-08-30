import React, { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircleIcon,
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
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useNotificationDispatch } from '../../app/providers/NotificationProvider';
import { useUserPreferences } from '../../app/providers/UserPreferencesProvider';
import { useIntegrationStatus } from '../sources/integrationStatus';
import { IntegrationStatusPanel } from '../sources/components/IntegrationStatusPanel';
import { ImportRecordsPanel } from '../sources/components/ImportRecordsPanel';
import { SharedPackagePanel } from '../sources/components/SharedPackagePanel';
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
    <section className="mb-8">
      <h2 className="text-xl font-extrabold text-gray-900">{title}</h2>
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

const ConnectionTab: React.FC = () => {
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

  return (
    <AppPage banner={<GenericBanner text={t('Sources')} />}>
      <div className="mx-auto flex max-w-4xl flex-col gap-x-4 px-4 pb-20 pt-6 sm:px-6 sm:pb-6 lg:px-8">
        {/* Above everything, not down beside the file picker. Someone arriving
            on a shared link came for this one decision, and on a phone the
            import card is four sections and a scroll away. */}
        <SharedPackagePanel />

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-600">
            {t(
              'Bring records together from patient portals, files, devices, and manual entry. Everything is stored locally on this device.',
            )}
          </p>
        </div>

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
            <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              {t('No portals connected yet.')}
            </p>
          )}
          <button
            className="bg-primary hover:bg-primary-600 active:bg-primary-700 mt-4 w-full rounded-lg p-4 text-white duration-75 active:scale-[98%]"
            onClick={() => setOpenSelectModal(true)}
          >
            <p className="font-bold">{t('Add a portal')}</p>
          </button>
          {/* The panel's own heading is an <h3>, so it has to sit under an <h2>
              rather than above the first one for the outline to stay in order. */}
          <div className="mt-4">
            <IntegrationStatusPanel status={integrationStatus} />
          </div>
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
            <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              {t(
                'No devices yet. Import a FreeStyle Libre export or log device readings manually.',
              )}
            </p>
          )}
        </SourcesSection>

        <SourcesSection
          title={t('Import records')}
          description={t(
            'Move records in and out of the app as files — useful when your provider is unsupported.',
          )}
        >
          <ImportRecordsPanel />
        </SourcesSection>

        <SourcesSection
          title={t('Add manually')}
          description={t(
            'Enter records by hand, including dedicated dental and optometry modes.',
          )}
        >
          <div className="flex flex-wrap gap-3">
            <Link
              to={Routes.AddRecord}
              className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold text-white shadow-sm"
            >
              <PlusIcon className="h-4 w-4" />
              {t('Add a record')}
            </Link>
            <Link
              to={Routes.Dental}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-800 shadow-sm hover:bg-gray-50"
            >
              <PencilSquareIcon className="h-4 w-4" />
              {t('Dental records')}
            </Link>
            <Link
              to={Routes.Optometry}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-800 shadow-sm hover:bg-gray-50"
            >
              <PencilSquareIcon className="h-4 w-4" />
              {t('Optometry records')}
            </Link>
          </div>
        </SourcesSection>

        <SourcesSection
          title={t('Source health / sync history')}
          description={t(
            'Last successful and attempted sync for every source.',
          )}
        >
          {list && list.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-start">
                    <th className="pb-2 pe-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t('Source')}
                    </th>
                    <th className="pb-2 pe-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t('Last sync')}
                    </th>
                    <th className="pb-2 pe-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t('Last attempt')}
                    </th>
                    <th className="pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t('Status')}
                    </th>
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
            <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              {t('No sources yet.')}
            </p>
          )}
        </SourcesSection>
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
