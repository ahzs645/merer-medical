/**
 * Translators between the legacy snake_case document shapes (RxDB) and the
 * camelCase domain shapes (@mere/domain). The legacy schemas are the source
 * of truth for callers, so all repository return values reconstruct the
 * snake_case form.
 */

import type {
  ClinicalDocument as DomainClinicalDocument,
  Connection,
  ConnectionSource,
  User,
  UserPreferences,
} from '@mere/domain';
import type { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import type { UserDocument } from '../../models/user-document/UserDocument.type';
import type { UserPreferencesDocument } from '../../models/user-preferences/UserPreferences.type';
import type { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';

// ─── User ────────────────────────────────────────────────────────────────────

export function userToDomain(
  input: UserDocument,
): Omit<User, 'createdAt' | 'updatedAt'> {
  return {
    id: input.id,
    firstName: input.first_name,
    lastName: input.last_name,
    email: input.email,
    gender: input.gender,
    birthday: input.birthday,
    isSelected: input.is_selected_user,
    isDefault: input.is_default_user,
    // profile_picture lives on UserDocument as embedded base64; attachments
    // are stored separately in Dexie so we drop it here. UserCard reads it
    // through a different path that the bridge does not touch yet.
  };
}

export function userToLegacy(input: User): UserDocument {
  return {
    id: input.id,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    gender: input.gender,
    birthday: input.birthday,
    is_selected_user: input.isSelected,
    is_default_user: input.isDefault,
  };
}

export function userPatchToDomain(
  patch: Partial<UserDocument>,
): Partial<Omit<User, 'id' | 'createdAt'>> {
  const out: Partial<Omit<User, 'id' | 'createdAt'>> = {};
  if ('first_name' in patch) out.firstName = patch.first_name;
  if ('last_name' in patch) out.lastName = patch.last_name;
  if ('email' in patch) out.email = patch.email;
  if ('gender' in patch) out.gender = patch.gender;
  if ('birthday' in patch) out.birthday = patch.birthday;
  if ('is_selected_user' in patch) out.isSelected = patch.is_selected_user;
  if ('is_default_user' in patch) out.isDefault = patch.is_default_user;
  return out;
}

// ─── UserPreferences ─────────────────────────────────────────────────────────

export function userPrefsToLegacy(
  input: UserPreferences,
): UserPreferencesDocument {
  return {
    id: input.id,
    user_id: input.userId,
    use_proxy: input.useProxy,
  };
}

export function userPrefsToDomain(
  input: UserPreferencesDocument,
): Partial<Omit<UserPreferences, 'id' | 'userId' | 'createdAt'>> {
  return { useProxy: input.use_proxy };
}

// ─── Connection ──────────────────────────────────────────────────────────────

// ConnectionDocument has many subtype variants (Epic/Cerner/etc.) — we pass
// through the union of optional fields. Callers cast to the variant they need.
type AnyConnectionLike = ConnectionDocument &
  Partial<{
    auth_uri: string | Location;
    token_uri: string | Location;
    client_id: string;
    tenant_id: string;
    patient: string;
    fhir_version: 'DSTU2' | 'R4';
  }>;

function locationToString(loc: string | Location | undefined): string {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  return loc.toString();
}

function toMillis(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = Date.parse(s);
  return Number.isFinite(n) ? n : undefined;
}

function fromMillis(n: number | undefined): string | undefined {
  if (n === undefined) return undefined;
  return new Date(n).toISOString();
}

export function connectionToDomain(
  input: AnyConnectionLike,
): Omit<Connection, 'createdAt' | 'updatedAt'> {
  return {
    id: input.id,
    userId: input.user_id,
    source: input.source as ConnectionSource,
    name: input.name,
    location: locationToString(input.location),
    accessToken: input.access_token,
    refreshToken: input.refresh_token,
    idToken: input.id_token,
    scope: input.scope,
    expiresAt: input.expires_at,
    lastRefreshedAt: toMillis(
      typeof input.last_refreshed === 'string'
        ? input.last_refreshed
        : undefined,
    ),
    lastSyncAttemptAt: toMillis(
      typeof input.last_sync_attempt === 'string'
        ? input.last_sync_attempt
        : undefined,
    ),
    lastSyncWasError: input.last_sync_was_error,
    authUri: locationToString(input.auth_uri),
    tokenUri: locationToString(input.token_uri),
    clientId: input.client_id,
    tenantId: input.tenant_id,
    patient: input.patient,
    fhirVersion: input.fhir_version,
  };
}

export function connectionToLegacy(input: Connection): AnyConnectionLike {
  const out: AnyConnectionLike = {
    id: input.id,
    user_id: input.userId,
    source: input.source,
    name: input.name,
    location: input.location,
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
    id_token: input.idToken,
    scope: input.scope,
    expires_at: input.expiresAt,
    last_refreshed: fromMillis(input.lastRefreshedAt),
    last_sync_attempt: fromMillis(input.lastSyncAttemptAt),
    last_sync_was_error: input.lastSyncWasError,
  };
  if (input.authUri) out.auth_uri = input.authUri;
  if (input.tokenUri) out.token_uri = input.tokenUri;
  if (input.clientId) out.client_id = input.clientId;
  if (input.tenantId) out.tenant_id = input.tenantId;
  if (input.patient) out.patient = input.patient;
  if (input.fhirVersion) out.fhir_version = input.fhirVersion;
  return out;
}

export function connectionPatchToDomain(
  patch: Partial<AnyConnectionLike>,
): Partial<Omit<Connection, 'id' | 'createdAt' | 'userId'>> {
  const out: Partial<Omit<Connection, 'id' | 'createdAt' | 'userId'>> = {};
  if ('source' in patch) out.source = patch.source as ConnectionSource;
  if ('name' in patch) out.name = patch.name;
  if ('location' in patch) out.location = locationToString(patch.location);
  if ('access_token' in patch) out.accessToken = patch.access_token;
  if ('refresh_token' in patch) out.refreshToken = patch.refresh_token;
  if ('id_token' in patch) out.idToken = patch.id_token;
  if ('scope' in patch) out.scope = patch.scope;
  if ('expires_at' in patch) out.expiresAt = patch.expires_at;
  if ('last_refreshed' in patch) {
    out.lastRefreshedAt = toMillis(
      typeof patch.last_refreshed === 'string'
        ? patch.last_refreshed
        : undefined,
    );
  }
  if ('last_sync_attempt' in patch) {
    out.lastSyncAttemptAt = toMillis(
      typeof patch.last_sync_attempt === 'string'
        ? patch.last_sync_attempt
        : undefined,
    );
  }
  if ('last_sync_was_error' in patch) {
    out.lastSyncWasError = patch.last_sync_was_error;
  }
  if ('auth_uri' in patch) out.authUri = locationToString(patch.auth_uri);
  if ('token_uri' in patch) out.tokenUri = locationToString(patch.token_uri);
  if ('client_id' in patch) out.clientId = patch.client_id;
  if ('tenant_id' in patch) out.tenantId = patch.tenant_id;
  if ('patient' in patch) out.patient = patch.patient;
  if ('fhir_version' in patch) out.fhirVersion = patch.fhir_version;
  return out;
}

// ─── ClinicalDocument ───────────────────────────────────────────────────────

export function clinicalDocumentId(input: {
  connection_record_id: string;
  user_id: string;
  metadata?: { id?: string };
}): string {
  return `${input.connection_record_id}|${input.user_id}|${input.metadata?.id ?? ''}`;
}

export function clinicalDocumentToDomain<T>(
  input: ClinicalDocument<T>,
): Omit<DomainClinicalDocument<T>, 'createdAt' | 'updatedAt'> {
  return {
    id: input.id || clinicalDocumentId(input),
    userId: input.user_id,
    connectionId: input.connection_record_id,
    format: input.data_record.format,
    contentType: input.data_record.content_type,
    resourceType: input.data_record.resource_type,
    raw: input.data_record.raw,
    versionHistory: input.data_record.version_history,
    attachmentIds: input.attachment_ids,
    metadata: {
      sourceId: input.metadata?.id,
      date: input.metadata?.date,
      displayName: input.metadata?.display_name,
      loincCoding: input.metadata?.loinc_coding,
      terminologyProfile: input.metadata?.terminology_profile as any,
      terminologySource: input.metadata?.terminology_source,
      terminologySourceVersion: input.metadata?.terminology_source_version,
      manualUncoded: input.metadata?.manual_uncoded,
    },
  };
}

export function clinicalDocumentToLegacy<T>(
  input: DomainClinicalDocument<T>,
): ClinicalDocument<T> {
  return {
    id: input.id,
    user_id: input.userId,
    connection_record_id: input.connectionId,
    data_record: {
      raw: input.raw,
      format: input.format,
      content_type: input.contentType,
      resource_type: input.resourceType,
      version_history: input.versionHistory ?? [],
    },
    attachment_ids: input.attachmentIds,
    metadata: {
      id: input.metadata?.sourceId,
      date: input.metadata?.date,
      display_name: input.metadata?.displayName,
      loinc_coding: input.metadata?.loincCoding,
      terminology_profile: input.metadata?.terminologyProfile,
      terminology_source: input.metadata?.terminologySource,
      terminology_source_version: input.metadata?.terminologySourceVersion,
      manual_uncoded: input.metadata?.manualUncoded,
    },
  };
}
