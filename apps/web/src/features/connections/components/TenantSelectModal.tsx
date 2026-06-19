/* eslint-disable react/jsx-no-useless-fragment */
import { memo, useEffect, useMemo, useReducer, useState } from 'react';
import { Link } from 'react-router-dom';

import { Combobox, Disclosure } from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { DSTU2Endpoint as CernerDSTU2Endpoint } from '@mere/cerner';
import { DSTU2Endpoint as EpicDSTU2Endpoint } from '@mere/epic';
import { DSTU2Endpoint as VeradigmDSTU2Endpoint } from '@mere/veradigm';
import { buildOnPatientAuthUrl } from '@mere/fhir-oauth';

import VeradigmLogo from '../../../assets/img/allscripts-logo.png';
import CernerLogo from '../../../assets/img/cerner-logo.png';
import EpicLogo from '../../../assets/img/mychart-logo.png';
import OnpatientLogo from '../../../assets/img/onpatient-logo-full.webp';
import { SelectOption } from '../ConnectionTab';
import { Routes } from '../../../Routes';
import { Modal } from '../../../shared/components/Modal';
import { ModalHeader } from '../../../shared/components/ModalHeader';
import { useNotificationDispatch } from '../../../app/providers/NotificationProvider';
import { useUserPreferences } from '../../../app/providers/UserPreferencesProvider';
import { getLoginUrl as getVaLoginUrl } from '../../../services/fhir/VA';
import {
  SkeletonTenantSelectModalResultItem,
  TenantSelectModelResultItem,
} from './TenantSelectModelResultItem';
import VALogo from '../../../assets/img/va-logo.png';
import HealowLogo from '../../../assets/img/eclinicalworks-logo.jpeg';
import { useConfig } from '../../../app/providers/AppConfigProvider';
import { isDemoMode } from '../../../shared/utils/demoMode';

export type EMRVendor =
  | 'epic'
  | 'cerner'
  | 'veradigm'
  | 'onpatient'
  | 'va'
  | 'healow'
  | 'any';

export type FhirVersion = 'DSTU2' | 'R4';

type VendorVersions = {
  epic: 'DSTU2' | 'R4';
  cerner: 'DSTU2' | 'R4';
  healow: 'R4';
  veradigm: 'DSTU2';
  onpatient: 'DSTU2';
  va: 'DSTU2';
  // 'any' hits the unified endpoint, which spans DSTU2 and R4 vendors;
  // the DSTU2 key is only the default lookup key for getApiPath
  any: 'DSTU2';
};

type VendorPaths = {
  [V in keyof VendorVersions]: Record<VendorVersions[V], string>;
};

const vendorPaths: VendorPaths = {
  epic: {
    R4: '/api/v1/epic/r4/tenants?',
    DSTU2: '/api/v1/epic/tenants?',
  },
  cerner: {
    R4: '/api/v1/cerner/r4/tenants?',
    DSTU2: '/api/v1/cerner/tenants?',
  },
  healow: {
    R4: '/api/v1/healow/tenants?',
  },
  veradigm: {
    DSTU2: '/api/v1/veradigm/tenants?',
  },
  onpatient: {
    DSTU2: '/api/v1/onpatient/tenants?',
  },
  va: {
    DSTU2: '/api/v1/va/tenants?',
  },
  any: {
    DSTU2: '/api/v1/tenants?',
  },
};

function getApiPath<V extends EMRVendor>(
  emrVendor: V,
  fhirVersion: VendorVersions[V],
): string {
  return vendorPaths[emrVendor][fhirVersion];
}

type UnifiedSearchVendor = 'EPIC' | 'CERNER' | 'VERADIGM' | 'HEALOW';

export type UnifiedDSTU2Endpoint = CernerDSTU2Endpoint &
  EpicDSTU2Endpoint &
  VeradigmDSTU2Endpoint & {
    // present on results from the unified /api/v1/tenants endpoint
    vendor?: UnifiedSearchVendor;
    version?: FhirVersion;
  };

const unifiedSearchVendors: Record<UnifiedSearchVendor, EMRVendor> = {
  EPIC: 'epic',
  CERNER: 'cerner',
  VERADIGM: 'veradigm',
  HEALOW: 'healow',
};

const unifiedSearchVendorLabels: Record<UnifiedSearchVendor, string> = {
  EPIC: 'MyChart',
  CERNER: 'Cerner',
  VERADIGM: 'Allscripts',
  HEALOW: 'Healow',
};

type TenantSelectState = {
  query: string;
  items: UnifiedDSTU2Endpoint[];
  emrVendor: EMRVendor;
  fhirVersion?: 'DSTU2' | 'R4';
  hasSelectedEmrVendor: boolean;
  isLoadingResults: boolean;
};

type TenantSelectAction =
  | { type: 'setQuery'; payload: string }
  | { type: 'setItems'; payload: UnifiedDSTU2Endpoint[] }
  | {
      type: 'setEmrVendor';
      payload: { vendor: EMRVendor; fhirVersion?: 'DSTU2' | 'R4' };
    }
  | { type: 'goBackToEMRVendorSelect' }
  | { type: 'hasClosedModal' }
  | { type: 'isLoadingResults'; payload: boolean };

// Search-first default: the unified "Search All" flow is active immediately so
// users land on a single search box rather than a grid of portal tiles.
const defaultState = {
  query: '',
  items: [],
  emrVendor: 'any',
  hasSelectedEmrVendor: true,
  isLoadingResults: true,
} as TenantSelectState;

type SourceItem = {
  title: string;
  vendor: EMRVendor;
  source: string;
  alt?: string;
  href?: string;
  enabled: boolean;
  disabledMessage?: string;
  customHandleClick?: () => void;
  id: number;
  fhirVersion?: 'DSTU2' | 'R4';
};

function isConfigured(value: string | undefined): boolean {
  return !!value && !value.startsWith('$');
}

export function TenantSelectModal({
  open,
  setOpen,
  onClick,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onClick: (
    base: string & Location,
    auth: string & Location,
    token: string & Location,
    name: string,
    id: string,
    vendor: EMRVendor,
    fhirVersion?: 'DSTU2' | 'R4',
  ) => void;
}) {
  const userPreferences = useUserPreferences(),
    notifyDispatch = useNotificationDispatch();
  const config = useConfig();

  const epicR4ProductionConfigured =
    isConfigured(config.EPIC_CLIENT_ID_R4) ||
    isConfigured(config.EPIC_CLIENT_ID);
  const epicR4SandboxConfigured =
    isConfigured(config.EPIC_SANDBOX_CLIENT_ID_R4) ||
    isConfigured(config.EPIC_SANDBOX_CLIENT_ID);
  const epicR4Enabled = epicR4ProductionConfigured || epicR4SandboxConfigured;
  const epicR4SandboxOnly =
    epicR4SandboxConfigured && !epicR4ProductionConfigured;

  const epicDstu2ProductionConfigured =
    isConfigured(config.EPIC_CLIENT_ID_DSTU2) ||
    isConfigured(config.EPIC_CLIENT_ID);
  const epicDstu2SandboxConfigured =
    isConfigured(config.EPIC_SANDBOX_CLIENT_ID_DSTU2) ||
    isConfigured(config.EPIC_SANDBOX_CLIENT_ID);
  const epicDstu2Enabled =
    epicDstu2ProductionConfigured || epicDstu2SandboxConfigured;
  const epicDstu2SandboxOnly =
    epicDstu2SandboxConfigured && !epicDstu2ProductionConfigured;

  const cernerEnabled = isConfigured(config.CERNER_CLIENT_ID);
  const veradigmEnabled = isConfigured(config.VERADIGM_CLIENT_ID);
  const vaEnabled = isConfigured(config.VA_CLIENT_ID);
  const healowEnabled = isConfigured(config.HEALOW_CLIENT_ID);
  const publicUrlConfigured = isConfigured(config.PUBLIC_URL);
  const searchablePortalEnabled =
    epicR4Enabled ||
    epicDstu2Enabled ||
    cernerEnabled ||
    veradigmEnabled ||
    healowEnabled;
  const portalSearchUnavailableReason = !publicUrlConfigured
    ? 'This browser build is running without portal API configuration. Local records still work in this browser; portal OAuth needs PUBLIC_URL and server config.'
    : !searchablePortalEnabled
      ? 'Portal search is not configured on this deployment. Local records still work in this browser; portal sync needs at least one portal client ID.'
      : undefined;

  const [state, dispatch] = useReducer(
    (
      state: TenantSelectState,
      action: TenantSelectAction,
    ): TenantSelectState => {
      switch (action.type) {
        case 'setQuery':
          return { ...state, query: action.payload };
        case 'setItems':
          return { ...state, items: action.payload, isLoadingResults: false };
        case 'setEmrVendor':
          return {
            ...state,
            emrVendor: action.payload.vendor,
            fhirVersion: action.payload.fhirVersion,
            hasSelectedEmrVendor: true,
            isLoadingResults: true,
          };
        case 'goBackToEMRVendorSelect':
          return defaultState;
        case 'hasClosedModal':
          // Reset back to the search-first "All portals" state.
          return {
            ...defaultState,
          };
        default:
          return state;
      }
    },
    defaultState,
  );

  const [vaUrl, setVaUrl] = useState<string & Location>(
    '' as string & Location,
  );
  const selectedEmrVendor = state.emrVendor;
  const selectedFhirVersion = state.fhirVersion;
  const selectedQuery = state.query;
  const hasSelectedEmrVendor = state.hasSelectedEmrVendor;

  useEffect(() => {
    getVaLoginUrl(config).then((url) => {
      setVaUrl(url);
    });
  }, [config]);

  const ConnectionSources: SourceItem[] = useMemo(() => {
    const sources = [
      {
        title: 'MyChart',
        vendor: 'epic',
        source: EpicLogo,
        alt: epicR4SandboxOnly
          ? 'Sandbox only - set EPIC_CLIENT_ID_R4 for production'
          : undefined,
        enabled: epicR4Enabled,
        disabledMessage:
          'Provide EPIC_CLIENT_ID_R4 or EPIC_SANDBOX_CLIENT_ID_R4 env var to enable',
        id: 1,
        fhirVersion: 'R4',
      },
      {
        title: 'Cerner',
        vendor: 'cerner',
        source: CernerLogo,
        enabled: cernerEnabled,
        disabledMessage: 'Provide CERNER_CLIENT_ID env var to enable',
        id: 2,
        fhirVersion: 'R4',
      },
      {
        title: 'Allscripts',
        vendor: 'veradigm',
        source: VeradigmLogo,
        alt: 'Veradigm',
        enabled: veradigmEnabled,
        disabledMessage: 'Provide VERADIGM_CLIENT_ID env var to enable',
        id: 3,
      },
      {
        title: 'OnPatient',
        vendor: 'onpatient',
        source: OnpatientLogo,
        alt: 'Dr. Chrono',
        href: buildOnPatientAuthUrl({
          clientId: config.ONPATIENT_CLIENT_ID || '',
          publicUrl: config.PUBLIC_URL || '',
          redirectPath: '/api/v1/onpatient/callback',
        }),
        enabled:
          isConfigured(config.ONPATIENT_CLIENT_ID) &&
          !!userPreferences?.use_proxy,
        disabledMessage: !isConfigured(config.ONPATIENT_CLIENT_ID)
          ? 'Provide ONPATIENT_CLIENT_ID env var to enable'
          : undefined,
        id: 4,
      },
      {
        title: 'Veterans Affairs',
        vendor: 'va',
        source: VALogo,
        alt: 'Sandbox Only',
        href: vaUrl,
        enabled: vaEnabled,
        disabledMessage: 'Provide VA_CLIENT_ID env var to enable',
        id: 4,
      },
      {
        title: 'Healow',
        vendor: 'healow',
        source: HealowLogo,
        alt: 'eClinicalWorks',
        enabled: healowEnabled,
        disabledMessage: 'Provide HEALOW_CLIENT_ID env var to enable',
        id: 9,
        fhirVersion: 'R4',
      },
      {
        title: 'Search All',
        vendor: 'any',
        source: '',
        alt: 'Search all supported health systems',
        enabled: true,
        id: 5,
      },
      {
        title: 'Cerner Legacy',
        vendor: 'cerner',
        source: CernerLogo,
        enabled: cernerEnabled,
        disabledMessage: 'Provide CERNER_CLIENT_ID env var to enable',
        id: 6,
        fhirVersion: 'DSTU2',
      },
      {
        title: 'MyChart Legacy',
        vendor: 'epic',
        source: EpicLogo,
        alt: epicDstu2SandboxOnly
          ? 'Sandbox only - set EPIC_CLIENT_ID_DSTU2 for production'
          : undefined,
        enabled: epicDstu2Enabled,
        disabledMessage:
          'Provide EPIC_CLIENT_ID_DSTU2 or EPIC_SANDBOX_CLIENT_ID_DSTU2 env var to enable',
        id: 8,
        fhirVersion: 'DSTU2',
      },
    ];

    return sources as SourceItem[];
  }, [
    config,
    userPreferences?.use_proxy,
    vaUrl,
    epicR4Enabled,
    epicR4SandboxOnly,
    epicDstu2Enabled,
    epicDstu2SandboxOnly,
    cernerEnabled,
    veradigmEnabled,
    vaEnabled,
    healowEnabled,
  ]);

  useEffect(() => {
    const abortController = new AbortController();

    if (open && hasSelectedEmrVendor) {
      if (portalSearchUnavailableReason) {
        dispatch({ type: 'setItems', payload: [] });
        return;
      }

      const fhirVersion = selectedFhirVersion ?? 'DSTU2';
      const apiPath = getApiPath(
        selectedEmrVendor,
        fhirVersion as VendorVersions[typeof selectedEmrVendor],
      );

      // Epic provides separate client ids for sandbox only, we detect it here so we can provide conditional rendering later depending on which env variables are provided
      const epicSandboxOnly =
        selectedEmrVendor === 'epic' &&
        ((selectedFhirVersion === 'R4' && epicR4SandboxOnly) ||
          (selectedFhirVersion === 'DSTU2' && epicDstu2SandboxOnly));

      const isUnifiedVendorEnabled = (vendor: UnifiedSearchVendor): boolean => {
        switch (vendor) {
          case 'EPIC':
            return epicR4Enabled || epicDstu2Enabled;
          case 'CERNER':
            return cernerEnabled;
          case 'VERADIGM':
            return veradigmEnabled;
          case 'HEALOW':
            return healowEnabled;
        }
      };

      const isUnifiedResultEnabled = (item: UnifiedDSTU2Endpoint): boolean => {
        // results without a vendor cannot be routed to a login flow
        if (!item.vendor) return false;
        if (item.vendor === 'EPIC') {
          return item.version === 'DSTU2' ? epicDstu2Enabled : epicR4Enabled;
        }
        return isUnifiedVendorEnabled(item.vendor);
      };

      // The same org can appear under both DSTU2 and R4 in unified results;
      // keep one entry, preferring the modern R4 connection
      const dedupeUnifiedResults = (
        items: UnifiedDSTU2Endpoint[],
      ): UnifiedDSTU2Endpoint[] => {
        const byVendorAndId = new Map<string, UnifiedDSTU2Endpoint>();
        for (const item of items) {
          const key = `${item.vendor}-${item.id}`;
          const existing = byVendorAndId.get(key);
          if (
            !existing ||
            (existing.version === 'DSTU2' && item.version === 'R4')
          ) {
            byVendorAndId.set(key, item);
          }
        }
        return Array.from(byVendorAndId.values());
      };

      const params = new URLSearchParams({ query: selectedQuery });
      if (epicSandboxOnly) {
        params.set('sandboxOnly', 'true');
      }
      if (selectedEmrVendor === 'any') {
        (Object.keys(unifiedSearchVendors) as UnifiedSearchVendor[])
          .filter(isUnifiedVendorEnabled)
          .forEach((vendor) => params.append('vendor', vendor));
      }

      fetch((config.PUBLIC_URL || '') + apiPath + params, {
        signal: abortController.signal,
      })
        .then((x) => x.json())
        .then((x: UnifiedDSTU2Endpoint[]) =>
          dispatch({
            type: 'setItems',
            payload:
              selectedEmrVendor === 'any'
                ? dedupeUnifiedResults(x.filter(isUnifiedResultEnabled))
                : x,
          }),
        )
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
          notifyDispatch({
            type: 'set_notification',
            message: `Unable to search for health systems`,
            variant: 'error',
          });
          dispatch({ type: 'setItems', payload: [] });
        });
    }

    return () => {
      abortController.abort();
    };
  }, [
    open,
    selectedEmrVendor,
    selectedQuery,
    notifyDispatch,
    hasSelectedEmrVendor,
    selectedFhirVersion,
    config.PUBLIC_URL,
    portalSearchUnavailableReason,
    epicR4SandboxOnly,
    epicDstu2SandboxOnly,
    epicR4Enabled,
    epicDstu2Enabled,
    cernerEnabled,
    veradigmEnabled,
    healowEnabled,
  ]);

  const portalChips: Array<{
    label: string;
    vendor: EMRVendor;
    fhirVersion?: 'DSTU2' | 'R4';
    enabled: boolean;
  }> = [
    {
      label: 'All portals',
      vendor: 'any',
      fhirVersion: undefined,
      enabled: true,
    },
    {
      label: 'MyChart',
      vendor: 'epic',
      fhirVersion: 'R4',
      enabled: epicR4Enabled,
    },
    {
      label: 'Cerner',
      vendor: 'cerner',
      fhirVersion: 'R4',
      enabled: cernerEnabled,
    },
    {
      label: 'Healow',
      vendor: 'healow',
      fhirVersion: 'R4',
      enabled: healowEnabled,
    },
    {
      label: 'Allscripts',
      vendor: 'veradigm',
      fhirVersion: 'DSTU2',
      enabled: veradigmEnabled,
    },
  ];

  const legacyChips: Array<{
    label: string;
    vendor: EMRVendor;
    fhirVersion?: 'DSTU2' | 'R4';
    enabled: boolean;
  }> = [
    {
      label: 'MyChart Legacy',
      vendor: 'epic',
      fhirVersion: 'DSTU2',
      enabled: epicDstu2Enabled,
    },
    {
      label: 'Cerner Legacy',
      vendor: 'cerner',
      fhirVersion: 'DSTU2',
      enabled: cernerEnabled,
    },
  ];

  const chipIsActive = (chip: {
    vendor: EMRVendor;
    fhirVersion?: 'DSTU2' | 'R4';
  }) =>
    state.emrVendor === chip.vendor &&
    (chip.vendor === 'any' || state.fhirVersion === chip.fhirVersion);

  const onpatientSource = ConnectionSources.find(
    (s) => s.vendor === 'onpatient',
  );
  const vaSource = ConnectionSources.find((s) => s.vendor === 'va');

  const selectChip = (chip: {
    vendor: EMRVendor;
    fhirVersion?: 'DSTU2' | 'R4';
  }) =>
    dispatch({
      type: 'setEmrVendor',
      payload: { vendor: chip.vendor, fhirVersion: chip.fhirVersion },
    });

  const chipClass = (active: boolean, enabled: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
      !enabled
        ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
        : active
          ? 'border-primary bg-primary text-white'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
    }`;

  const launchHrefSource = (source?: SourceItem) => {
    if (!source || !source.enabled || !source.href) return;
    if (isDemoMode()) {
      notifyDispatch({
        type: 'set_notification',
        message: 'Adding new connections is disabled in demo mode',
        variant: 'error',
      });
      return;
    }
    window.location.href = source.href;
  };

  return (
    <Modal
      open={open}
      setOpen={setOpen}
      afterLeave={() => {
        dispatch({ type: 'hasClosedModal' });
      }}
      overflowXHidden
      flex
    >
      <>
        {
          <>
            <ModalHeader
              title={'Search for your hospital, clinic, or patient portal'}
              setClose={() => setOpen((x) => !x)}
            />
            <div className="px-4 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                {portalChips
                  .filter((chip) => chip.enabled || chip.vendor === 'any')
                  .map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      disabled={!chip.enabled}
                      onClick={() => selectChip(chip)}
                      className={chipClass(chipIsActive(chip), chip.enabled)}
                    >
                      {chip.label}
                    </button>
                  ))}
              </div>
              {legacyChips.some((chip) => chip.enabled) && (
                <Disclosure as="div" className="mt-2">
                  {({ open: legacyOpen }) => (
                    <>
                      <Disclosure.Button className="flex items-center gap-1 py-1 text-sm font-medium text-gray-500 hover:text-gray-700">
                        <span>Show legacy connections</span>
                        <svg
                          className={`h-4 w-4 ${legacyOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </Disclosure.Button>
                      <Disclosure.Panel>
                        <div className="flex flex-wrap items-center gap-2 pb-1">
                          {legacyChips
                            .filter((chip) => chip.enabled)
                            .map((chip) => (
                              <button
                                key={chip.label}
                                type="button"
                                onClick={() => selectChip(chip)}
                                className={chipClass(
                                  chipIsActive(chip),
                                  chip.enabled,
                                )}
                              >
                                {chip.label}
                              </button>
                            ))}
                        </div>
                      </Disclosure.Panel>
                    </>
                  )}
                </Disclosure>
              )}
            </div>
            {state.isLoadingResults ? (
              <Combobox>
                <Combobox.Options
                  static
                  className="max-h-full scroll-py-3 overflow-y-scroll p-3 sm:max-h-96"
                >
                  <SkeletonTenantSelectModalResultItem />
                  <SkeletonTenantSelectModalResultItem />
                  <SkeletonTenantSelectModalResultItem />
                  <SkeletonTenantSelectModalResultItem />
                  <SkeletonTenantSelectModalResultItem />
                  <SkeletonTenantSelectModalResultItem />
                  <SkeletonTenantSelectModalResultItem />
                  <SkeletonTenantSelectModalResultItem />
                  <SkeletonTenantSelectModalResultItem />
                  <SkeletonTenantSelectModalResultItem />
                  <SkeletonTenantSelectModalResultItem />
                </Combobox.Options>
              </Combobox>
            ) : (
              <>
                {portalSearchUnavailableReason ? (
                  <PortalSearchUnavailableNotice
                    reason={portalSearchUnavailableReason}
                    onNavigate={() => setOpen(false)}
                  />
                ) : (
                  <Combobox
                    onChange={(s: SelectOption) => {
                      const vendor = s.vendor ?? state.emrVendor;
                      if (vendor === 'any') {
                        notifyDispatch({
                          type: 'set_notification',
                          message:
                            'Unable to determine which patient portal this health system uses',
                          variant: 'error',
                        });
                        return;
                      }
                      onClick(
                        s.baseUrl,
                        s.authUrl,
                        s.tokenUrl,
                        s.name,
                        s.id,
                        vendor,
                        s.fhirVersion ?? state.fhirVersion,
                      );
                      setOpen(false);
                    }}
                  >
                    <div className="relative px-4">
                      <MagnifyingGlassIcon
                        className="pointer-events-none absolute left-8 top-3.5 h-5 w-5 text-gray-700"
                        aria-hidden="true"
                      />
                      <Combobox.Input
                        title="tenant-search-bar"
                        className="focus:ring-primary-700 h-12 w-full divide-y-2 rounded-xl border-0 bg-gray-100 bg-transparent pl-11 pr-4 text-gray-800 placeholder-gray-400 hover:border-gray-200 focus:ring-2 sm:text-sm"
                        placeholder="Search for your health system"
                        onChange={(event) =>
                          dispatch({
                            type: 'setQuery',
                            payload: event.target.value,
                          })
                        }
                        autoFocus={true}
                      />
                    </div>
                    {state.items.length > 0 && (
                      <Combobox.Options
                        static
                        className="max-h-full scroll-py-3 overflow-y-scroll p-3 sm:max-h-96"
                      >
                        {state.items.map((item) => (
                          <MemoizedResultItem
                            key={`${item.vendor ?? state.emrVendor}-${item.version ?? ''}-${item.id}`}
                            id={item.id}
                            name={item.name}
                            baseUrl={item.url}
                            tokenUrl={item.token}
                            authUrl={item.authorize}
                            vendor={
                              item.vendor
                                ? unifiedSearchVendors[item.vendor]
                                : undefined
                            }
                            fhirVersion={item.version}
                            vendorLabel={
                              state.emrVendor === 'any' && item.vendor
                                ? unifiedSearchVendorLabels[item.vendor]
                                : undefined
                            }
                          />
                        ))}
                      </Combobox.Options>
                    )}
                    {state.query !== '' && state.items.length === 0 && (
                      <div className="px-6 py-14 text-center text-sm sm:px-14">
                        <ExclamationCircleIcon
                          type="outline"
                          name="exclamation-circle"
                          className="mx-auto h-6 w-6 text-gray-700"
                        />
                        <p className="mt-4 font-semibold text-gray-900">
                          No results found
                        </p>
                        <p className="mt-2 text-gray-800">
                          No health system found for this search term. Please
                          try again.
                        </p>
                      </div>
                    )}
                  </Combobox>
                )}
              </>
            )}
            <div className="px-4 pb-6 pt-2">
              {(onpatientSource?.enabled || vaSource?.enabled) && (
                <div className="mt-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Other ways to connect
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {onpatientSource?.enabled && (
                      <button
                        type="button"
                        onClick={() => launchHrefSource(onpatientSource)}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        OnPatient
                      </button>
                    )}
                    {vaSource?.enabled && (
                      <button
                        type="button"
                        onClick={() => launchHrefSource(vaSource)}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Veterans Affairs
                      </button>
                    )}
                  </div>
                </div>
              )}
              <Disclosure as="div" className="mt-4">
                {({ open: helpOpen }) => (
                  <>
                    <Disclosure.Button className="text-primary hover:text-primary-500 flex items-center gap-1 text-sm font-medium">
                      <span>I can&apos;t find my provider</span>
                      <svg
                        className={`h-4 w-4 ${helpOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </Disclosure.Button>
                    <Disclosure.Panel className="mt-2 text-sm text-gray-600">
                      <p>
                        Not every health system is supported, and some are only
                        available on certain deployments. If you can&apos;t find
                        yours, you can still add records manually or import a
                        file.
                      </p>
                      <Link
                        to={Routes.AddRecord}
                        onClick={() => setOpen(false)}
                        className="text-primary hover:text-primary-500 mt-1 inline-block underline"
                      >
                        Add records manually or import a file
                      </Link>
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            </div>
          </>
        }
      </>
    </Modal>
  );
}

const MemoizedResultItem = memo(TenantSelectModelResultItem);

function PortalSearchUnavailableNotice({
  reason,
  onNavigate,
}: {
  reason: string;
  onNavigate: () => void;
}) {
  return (
    <div className="px-6 py-12 text-center text-sm sm:px-14">
      <ExclamationCircleIcon className="mx-auto h-7 w-7 text-gray-500" />
      <p className="mt-4 font-semibold text-gray-900">
        Portal search unavailable
      </p>
      <p className="mt-2 text-gray-700">{reason}</p>
      <Link
        to={Routes.AddRecord}
        onClick={onNavigate}
        className="text-primary hover:text-primary-500 mt-4 inline-flex font-semibold underline"
      >
        Add records manually or import a file
      </Link>
    </div>
  );
}
