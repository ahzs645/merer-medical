import { RxDocument } from 'rxdb';

import { ConnectionDocument } from '../../../models/connection-document/ConnectionDocument.type';
import { CernerLocalStorageKeys } from '../../../services/fhir/Cerner';
import { EpicLocalStorageKeys } from '../../../services/fhir/Epic';
import { VeradigmLocalStorageKeys } from '../../../services/fhir/Veradigm';
import { HealowLocalStorageKeys } from '../../../services/fhir/Healow';
import { normalizeEpicBaseUrl } from './epicUrls';

export function setTenantUrlBySource(
  item: RxDocument<ConnectionDocument>,
): void {
  switch (item.get('source')) {
    case 'epic': {
      const fhirVersion = item.get('fhir_version') || 'DSTU2';
      const baseUrl = normalizeEpicBaseUrl(item.get('location'), fhirVersion);

      let authUrl = item.get('auth_uri');
      if (authUrl === undefined) {
        authUrl = baseUrl + '/oauth2/authorize';
      }

      let tokenUrl = item.get('token_uri');
      if (tokenUrl === undefined) {
        tokenUrl = baseUrl + '/oauth2/token';
      }

      setTenantEpicUrl(
        baseUrl as string & Location,
        authUrl,
        tokenUrl,
        item.get('name'),
        item.get('tenant_id'),
        fhirVersion,
      );
      break;
    }
    case 'cerner': {
      setTenantCernerUrl(
        item.get('location'),
        item.get('auth_uri'),
        item.get('token_uri'),
        item.get('name'),
        item.get('id'),
        item.get('fhir_version') || 'DSTU2',
      );
      break;
    }
    case 'veradigm': {
      setTenantVeradigmUrl(
        item.get('location'),
        item.get('auth_uri'),
        item.get('token_uri'),
        item.get('name'),
        item.get('tenant_id'),
      );
      break;
    }
    case 'healow': {
      setTenantHealowUrl(
        item.get('location'),
        item.get('auth_uri'),
        item.get('token_uri'),
        item.get('name'),
        item.get('tenant_id'),
      );
      break;
    }
    default: {
      break;
    }
  }
}

export function setTenantEpicUrl(
  s: string & Location,
  a: string & Location,
  t: string & Location,
  name: string,
  id: string,
  fhirVersion: 'DSTU2' | 'R4',
): void {
  localStorage.setItem(EpicLocalStorageKeys.EPIC_BASE_URL, s);
  localStorage.setItem(EpicLocalStorageKeys.EPIC_AUTH_URL, a);
  localStorage.setItem(EpicLocalStorageKeys.EPIC_TOKEN_URL, t);
  localStorage.setItem(EpicLocalStorageKeys.EPIC_NAME, name);
  localStorage.setItem(EpicLocalStorageKeys.EPIC_ID, id);
  localStorage.setItem(EpicLocalStorageKeys.FHIR_VERSION, fhirVersion);
}

export function setTenantCernerUrl(
  base: string & Location,
  auth: string & Location,
  token: string & Location,
  name: string,
  id: string,
  fhirVersion: 'DSTU2' | 'R4',
): void {
  localStorage.setItem(CernerLocalStorageKeys.CERNER_BASE_URL, base);
  localStorage.setItem(CernerLocalStorageKeys.CERNER_AUTH_URL, auth);
  localStorage.setItem(CernerLocalStorageKeys.CERNER_TOKEN_URL, token);
  localStorage.setItem(CernerLocalStorageKeys.CERNER_NAME, name);
  localStorage.setItem(CernerLocalStorageKeys.CERNER_ID, id);
  localStorage.setItem(CernerLocalStorageKeys.FHIR_VERSION, fhirVersion);
}

export function setTenantVeradigmUrl(
  base: string & Location,
  auth: string & Location,
  token: string & Location,
  name: string,
  id: string,
): void {
  localStorage.setItem(VeradigmLocalStorageKeys.VERADIGM_BASE_URL, base);
  localStorage.setItem(VeradigmLocalStorageKeys.VERADIGM_AUTH_URL, auth);
  localStorage.setItem(VeradigmLocalStorageKeys.VERADIGM_TOKEN_URL, token);
  localStorage.setItem(VeradigmLocalStorageKeys.VERADIGM_NAME, name);
  localStorage.setItem(VeradigmLocalStorageKeys.VERADIGM_ID, id);
}

export function setTenantHealowUrl(
  base: string & Location,
  auth: string & Location,
  token: string & Location,
  name: string,
  id: string,
): void {
  localStorage.setItem(HealowLocalStorageKeys.HEALOW_BASE_URL, base);
  localStorage.setItem(HealowLocalStorageKeys.HEALOW_AUTH_URL, auth);
  localStorage.setItem(HealowLocalStorageKeys.HEALOW_TOKEN_URL, token);
  localStorage.setItem(HealowLocalStorageKeys.HEALOW_NAME, name);
  localStorage.setItem(HealowLocalStorageKeys.HEALOW_ID, id);
}
