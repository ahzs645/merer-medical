import { useMemo } from 'react';

import { AppConfig, useConfig } from '../../app/providers/AppConfigProvider';
import { useUserPreferences } from '../../app/providers/UserPreferencesProvider';

/**
 * Returns true when an env-backed config value is present and not an
 * unsubstituted placeholder (values that still start with `$` were never
 * filled in at deploy time).
 */
export function isConfigured(value: string | undefined): boolean {
  return !!value && !value.startsWith('$');
}

export type VendorAvailability = {
  /** Human friendly vendor name. */
  label: string;
  /** Whether the integration can be used on this deployment. */
  enabled: boolean;
  /** Only sandbox/test credentials are configured (no production access). */
  sandboxOnly?: boolean;
  /** Requires the proxy to be enabled before it can be used. */
  needsProxy?: boolean;
  /** Healow confidential vs public client mode. */
  confidentialMode?: boolean;
  /** Env var(s) an operator needs to set to enable this integration. */
  requiredEnv?: string;
};

export type IntegrationStatus = {
  /** PUBLIC_URL is the hard requirement for any portal connection. */
  publicUrlConfigured: boolean;
  /** Whether the sync proxy is currently enabled by the user. */
  proxyEnabled: boolean;
  epicR4: VendorAvailability;
  epicDstu2: VendorAvailability;
  cerner: VendorAvailability;
  healow: VendorAvailability;
  veradigm: VendorAvailability;
  va: VendorAvailability;
  onpatient: VendorAvailability;
  /** True when at least one portal vendor is usable on this deployment. */
  anyPortalEnabled: boolean;
};

/**
 * Computes integration/preflight availability from the deployment's instance
 * config and the user's proxy preference. Centralizes the logic that was
 * previously duplicated between TenantSelectModal and the developer settings.
 */
export function computeIntegrationStatus(
  config: AppConfig,
  proxyEnabled: boolean,
): IntegrationStatus {
  const publicUrlConfigured = isConfigured(config.PUBLIC_URL);

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
  const onpatientConfigured = isConfigured(config.ONPATIENT_CLIENT_ID);

  const epicR4: VendorAvailability = {
    label: 'MyChart (Epic R4)',
    enabled: epicR4Enabled,
    sandboxOnly: epicR4SandboxOnly,
    requiredEnv: 'EPIC_CLIENT_ID_R4 or EPIC_SANDBOX_CLIENT_ID_R4',
  };
  const epicDstu2: VendorAvailability = {
    label: 'MyChart Legacy (Epic DSTU2)',
    enabled: epicDstu2Enabled,
    sandboxOnly: epicDstu2SandboxOnly,
    requiredEnv: 'EPIC_CLIENT_ID_DSTU2 or EPIC_SANDBOX_CLIENT_ID_DSTU2',
  };

  return {
    publicUrlConfigured,
    proxyEnabled,
    epicR4,
    epicDstu2,
    cerner: {
      label: 'Cerner / Oracle Health',
      enabled: cernerEnabled,
      requiredEnv: 'CERNER_CLIENT_ID',
    },
    healow: {
      label: 'Healow (eClinicalWorks)',
      enabled: healowEnabled,
      confidentialMode: !!config.HEALOW_CONFIDENTIAL_MODE,
      requiredEnv: 'HEALOW_CLIENT_ID',
    },
    veradigm: {
      label: 'Allscripts / Veradigm',
      enabled: veradigmEnabled,
      requiredEnv: 'VERADIGM_CLIENT_ID',
    },
    va: {
      label: 'Veterans Affairs',
      enabled: vaEnabled,
      sandboxOnly: true,
      requiredEnv: 'VA_CLIENT_ID',
    },
    onpatient: {
      label: 'OnPatient (Dr. Chrono)',
      enabled: onpatientConfigured && proxyEnabled,
      needsProxy: onpatientConfigured && !proxyEnabled,
      requiredEnv: 'ONPATIENT_CLIENT_ID',
    },
    anyPortalEnabled:
      epicR4Enabled ||
      epicDstu2Enabled ||
      cernerEnabled ||
      veradigmEnabled ||
      vaEnabled ||
      healowEnabled ||
      (onpatientConfigured && proxyEnabled),
  };
}

/**
 * React hook wrapper around {@link computeIntegrationStatus} that reads from the
 * app config and the current user's proxy preference.
 */
export function useIntegrationStatus(): IntegrationStatus {
  const config = useConfig();
  const userPreferences = useUserPreferences();
  const proxyEnabled = !!userPreferences?.use_proxy;

  return useMemo(
    () => computeIntegrationStatus(config, proxyEnabled),
    [config, proxyEnabled],
  );
}
