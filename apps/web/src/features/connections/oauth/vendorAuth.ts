import { RxDocument } from 'rxdb';

import {
  createEpicClient,
  createCernerClient,
  createSessionManager,
  buildEpicOAuthConfig,
  buildCernerOAuthConfig,
  buildOnPatientAuthUrl,
  EPIC_DEFAULT_SCOPES,
  CERNER_DEFAULT_SCOPES,
  createVeradigmClient,
  buildVeradigmOAuthConfig,
  createHealowClient,
  buildHealowOAuthConfig,
} from '@mere/fhir-oauth';
import { signJwt } from '@mere/crypto/browser';
import { isEpicSandbox } from '../../../services/fhir/EpicUtils';
import { ConnectionDocument } from '../../../models/connection-document/ConnectionDocument.type';
import { AppConfig } from '../../../app/providers/AppConfigProvider';
import {
  getEpicClientId,
  getDSTU2Url,
  getR4Url,
} from '../../../services/fhir/Epic';
import { getLoginUrl as getVaLoginUrl } from '../../../services/fhir/VA';
import { Routes } from '../../../Routes';
import { normalizeEpicBaseUrl } from './epicUrls';

const epicClient = createEpicClient({ signJwt });
const cernerClient = createCernerClient();
const veradigmClient = createVeradigmClient();
const healowClient = createHealowClient();
const epicSession = createSessionManager('epic');
const cernerSession = createSessionManager('cerner');
const healowSession = createSessionManager('healow');

/**
 * Initiates OAuth authorization flow for Epic MyChart connections.
 * Generates PKCE challenge, stores session state, and returns the authorization URL.
 * The callback page will use the stored session to complete the token exchange.
 *
 * @param config - App configuration containing Epic client IDs and public URL
 * @param baseUrl - Epic FHIR server base URL
 * @param authUrl - OAuth authorization endpoint URL
 * @param tokenUrl - OAuth token endpoint URL
 * @param name - Display name for the connection
 * @param id - Epic tenant identifier
 * @param fhirVersion - FHIR version (DSTU2 or R4)
 * @returns Authorization URL to redirect the user to in order to initiate auth
 */
export async function initiateEpicAuth(
  config: AppConfig,
  baseUrl: string,
  authUrl: string,
  tokenUrl: string,
  name: string,
  id: string,
  fhirVersion: 'DSTU2' | 'R4',
): Promise<string> {
  const isSandbox = isEpicSandbox(id);
  const clientId = getEpicClientId(config, fhirVersion, isSandbox);
  if (!clientId || !config.PUBLIC_URL) {
    throw new Error('Epic OAuth configuration is incomplete');
  }

  const fhirBaseUrl =
    fhirVersion === 'R4' ? getR4Url(baseUrl) : getDSTU2Url(baseUrl);

  const oauthConfig = buildEpicOAuthConfig({
    clientId,
    publicUrl: config.PUBLIC_URL,
    redirectPath: Routes.EpicCallback,
    scopes: EPIC_DEFAULT_SCOPES,
    tenant: {
      id,
      name,
      authUrl,
      tokenUrl,
      fhirBaseUrl,
      fhirVersion,
    },
  });

  const { url, session } = await epicClient.initiateAuth(oauthConfig);
  await epicSession.save(session);
  return url;
}

/**
 * Initiates OAuth authorization flow for Cerner connections.
 * Generates PKCE challenge, stores session state, and returns the authorization URL.
 * The callback page will use the stored session to complete the token exchange.
 *
 * @param config - App configuration containing Cerner client ID and public URL
 * @param baseUrl - Cerner FHIR server base URL
 * @param authUrl - OAuth authorization endpoint URL
 * @param tokenUrl - OAuth token endpoint URL
 * @param name - Display name for the connection
 * @param id - Cerner tenant identifier
 * @param fhirVersion - FHIR version (DSTU2 or R4)
 * @returns Authorization URL to redirect the user to
 */
export async function initiateCernerAuth(
  config: AppConfig,
  baseUrl: string,
  authUrl: string,
  tokenUrl: string,
  name: string,
  id: string,
  fhirVersion: 'DSTU2' | 'R4',
): Promise<string> {
  if (!config.CERNER_CLIENT_ID || !config.PUBLIC_URL) {
    throw new Error('Cerner OAuth configuration is incomplete');
  }

  const oauthConfig = buildCernerOAuthConfig({
    clientId: config.CERNER_CLIENT_ID,
    publicUrl: config.PUBLIC_URL,
    redirectPath: Routes.CernerCallback,
    scopes: CERNER_DEFAULT_SCOPES,
    tenant: {
      id,
      name,
      authUrl,
      tokenUrl,
      fhirBaseUrl: baseUrl,
      fhirVersion,
    },
  });

  const { url, session } = await cernerClient.initiateAuth(oauthConfig);
  await cernerSession.save(session);
  return url;
}

/**
 * Returns the OnPatient OAuth authorization URL.
 * OnPatient uses a confidential client flow where the backend handles token exchange,
 * so no PKCE or session storage is needed on the frontend.
 *
 * @param config - App configuration containing OnPatient client ID and public URL
 * @returns Authorization URL to redirect the user to
 */
export function initiateOnPatientAuth(config: AppConfig): string {
  if (!config.ONPATIENT_CLIENT_ID || !config.PUBLIC_URL) {
    throw new Error('OnPatient OAuth configuration is incomplete');
  }

  return buildOnPatientAuthUrl({
    clientId: config.ONPATIENT_CLIENT_ID,
    publicUrl: config.PUBLIC_URL,
    redirectPath: '/api/v1/onpatient/callback',
  });
}

/**
 * Initiates OAuth authorization flow for Veradigm (Allscripts) connections.
 * Veradigm does not use PKCE, so no session storage is needed.
 *
 * @param config - App configuration containing Veradigm client ID and public URL
 * @param baseUrl - Veradigm FHIR server base URL
 * @param authUrl - OAuth authorization endpoint URL
 * @param tokenUrl - OAuth token endpoint URL
 * @param name - Display name for the connection
 * @returns Authorization URL to redirect the user to
 */
export async function initiateVeradigmAuth(
  config: AppConfig,
  baseUrl: string,
  authUrl: string,
  tokenUrl: string,
  name: string,
): Promise<string> {
  if (!config.VERADIGM_CLIENT_ID || !config.PUBLIC_URL) {
    throw new Error('Veradigm OAuth configuration is incomplete');
  }

  const oauthConfig = buildVeradigmOAuthConfig({
    clientId: config.VERADIGM_CLIENT_ID,
    publicUrl: config.PUBLIC_URL,
    redirectPath: Routes.VeradigmCallback,
    tenant: {
      id: baseUrl,
      name,
      authUrl,
      tokenUrl,
      fhirBaseUrl: baseUrl,
    },
  });

  const { url } = await veradigmClient.initiateAuth(oauthConfig);
  return url;
}

/**
 * Initiates OAuth authorization flow for Healow connections.
 * Generates PKCE challenge, stores session state, and returns the authorization URL.
 * The callback page will use the stored session to complete the token exchange.
 *
 * @param config - App configuration containing Healow client ID and public URL
 * @param baseUrl - Healow FHIR server base URL
 * @param authUrl - OAuth authorization endpoint URL
 * @param tokenUrl - OAuth token endpoint URL
 * @param name - Display name for the connection
 * @param id - Healow tenant identifier
 * @returns Authorization URL to redirect the user to
 */
export async function initiateHealowAuth(
  config: AppConfig,
  baseUrl: string,
  authUrl: string,
  tokenUrl: string,
  name: string,
  id: string,
): Promise<string> {
  if (!config.HEALOW_CLIENT_ID || !config.PUBLIC_URL) {
    throw new Error('Healow OAuth configuration is incomplete');
  }

  const oauthConfig = buildHealowOAuthConfig({
    clientId: config.HEALOW_CLIENT_ID,
    publicUrl: config.PUBLIC_URL,
    redirectPath: Routes.HealowCallback,
    confidentialMode: config.HEALOW_CONFIDENTIAL_MODE,
    tenant: {
      id,
      name,
      authUrl,
      tokenUrl,
      fhirBaseUrl: baseUrl,
    },
  });

  const { url, session } = await healowClient.initiateAuth(oauthConfig);
  await healowSession.save(session);
  return url;
}

export async function getLoginUrlBySource(
  config: AppConfig,
  item: RxDocument<ConnectionDocument>,
): Promise<string & Location> {
  switch (item.get('source')) {
    case 'epic': {
      const fhirVersion = (item.get('fhir_version') || 'DSTU2') as
        | 'DSTU2'
        | 'R4';
      const baseUrl = normalizeEpicBaseUrl(item.get('location'), fhirVersion);

      let authUrl = item.get('auth_uri');
      if (authUrl === undefined) {
        authUrl = baseUrl + '/oauth2/authorize';
      }

      let tokenUrl = item.get('token_uri');
      if (tokenUrl === undefined) {
        tokenUrl = baseUrl + '/oauth2/token';
      }

      const url = await initiateEpicAuth(
        config,
        baseUrl,
        authUrl,
        tokenUrl,
        item.get('name'),
        item.get('tenant_id'),
        fhirVersion,
      );
      return url as string & Location;
    }
    case 'cerner': {
      const fhirVersion = (item.get('fhir_version') || 'DSTU2') as
        | 'DSTU2'
        | 'R4';
      const url = await initiateCernerAuth(
        config,
        item.get('location'),
        item.get('auth_uri'),
        item.get('token_uri'),
        item.get('name'),
        item.get('id'),
        fhirVersion,
      );
      return url as string & Location;
    }
    case 'veradigm': {
      return initiateVeradigmAuth(
        config,
        item.get('location'),
        item.get('auth_uri'),
        item.get('token_uri'),
        item.get('name'),
      ).then((url) => url as string & Location);
    }
    case 'onpatient': {
      return Promise.resolve(
        initiateOnPatientAuth(config) as string & Location,
      );
    }
    case 'va': {
      return getVaLoginUrl(config);
    }
    case 'healow': {
      return initiateHealowAuth(
        config,
        item.get('location'),
        item.get('auth_uri'),
        item.get('token_uri'),
        item.get('name'),
        item.get('tenant_id'),
      ).then((url) => url as string & Location);
    }
    default: {
      return '' as string & Location;
    }
  }
}
