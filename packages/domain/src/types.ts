import type { AppId } from './ids';

export interface BaseRecord {
  id: AppId;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface User extends BaseRecord {
  firstName?: string;
  lastName?: string;
  email?: string;
  gender?: string;
  birthday?: string;
  isSelected?: boolean;
  isDefault?: boolean;
  profilePictureAttachmentId?: AppId;
}

export interface UserPreferences extends BaseRecord {
  userId: AppId;
  useProxy: boolean;
}

export type TerminologyProfile = 'canada' | 'us' | 'global';
export type TerminologyLookupMode = 'local-only' | 'hybrid' | 'server-first';
export type TerminologyLanguage = 'en' | 'fr';
export type TerminologyDomain =
  | 'condition'
  | 'medication'
  | 'immunization'
  | 'procedure'
  | 'allergy'
  | 'encounter'
  | 'lab'
  | 'vital';

export interface TerminologyPack extends BaseRecord {
  profile: TerminologyProfile;
  name: string;
  source: string;
  sourceUrl: string;
  sourceVersion: string;
  license: string;
  languageCoverage: TerminologyLanguage[];
  importedAt: number;
  checksum?: string;
  bundled?: boolean;
}

export interface TerminologyEntry extends BaseRecord {
  packId: AppId;
  profile: TerminologyProfile;
  domain: TerminologyDomain;
  system: string;
  code: string;
  displayEn: string;
  displayFr?: string;
  aliasesEn?: string[];
  aliasesFr?: string[];
  units?: string[];
  defaultUnit?: string;
  source: string;
  sourceVersion: string;
  license: string;
  active: boolean;
}

export interface TerminologySearchIndex extends BaseRecord {
  packId: AppId;
  profile: TerminologyProfile;
  domain: TerminologyDomain;
  language: TerminologyLanguage;
  serializedIndex: unknown;
}

export type ConnectionSource =
  | 'epic'
  | 'onpatient'
  | 'cerner'
  | 'veradigm'
  | 'va'
  | 'healow'
  | 'freestyle_libre'
  | 'manual';

export interface Connection extends BaseRecord {
  userId: AppId;
  source: ConnectionSource;
  name: string;
  location: string;
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  scope?: string;
  expiresAt: number;
  lastRefreshedAt?: number;
  lastSyncAttemptAt?: number;
  lastSyncWasError?: boolean;
  authUri?: string;
  tokenUri?: string;
  clientId?: string;
  tenantId?: string;
  patient?: string;
  fhirVersion?: 'DSTU2' | 'R4';
}

export type FhirFormat = 'FHIR.DSTU2' | 'FHIR.R4';

export type ClinicalResourceType =
  | 'allergyintolerance'
  | 'appointment'
  | 'careplan'
  | 'careteam'
  | 'condition'
  | 'consent'
  | 'contract'
  | 'coverage'
  | 'device'
  | 'diagnosticreport'
  | 'documentreference'
  | 'documentreference_attachment'
  | 'encounter'
  | 'familymemberhistory'
  | 'goal'
  | 'immunization'
  | 'insuranceplan'
  | 'imagingstudy'
  | 'location'
  | 'media'
  | 'medication'
  | 'medicationadministration'
  | 'medicationdispense'
  | 'medicationorder'
  | 'medicationrequest'
  | 'medicationstatement'
  | 'nutritionorder'
  | 'observation'
  | 'organization'
  | 'patient'
  | 'person'
  | 'practitioner'
  | 'practitionerrole'
  | 'procedure'
  | 'provenance'
  | 'questionnaire'
  | 'questionnaireresponse'
  | 'relatedperson'
  | 'schedule'
  | 'servicerequest'
  | 'slot'
  | 'specimen'
  | 'visionprescription';

export interface ClinicalDocument<T = unknown> extends BaseRecord {
  userId: AppId;
  connectionId: AppId;
  format: FhirFormat;
  contentType: string;
  resourceType: ClinicalResourceType;
  raw: T;
  versionHistory?: T[];
  attachmentIds?: AppId[];
  metadata?: {
    sourceId?: string;
    date?: string;
    displayName?: string;
    loincCoding?: string[];
    terminologyProfile?: TerminologyProfile;
    terminologySource?: string;
    terminologySourceVersion?: string;
    manualUncoded?: boolean;
    manualSpecialty?: string;
    manualSubtype?: string;
    manualSpecialtyDetails?: unknown;
    manualImagingDetails?: {
      modality?: string;
      bodySite?: string;
      laterality?: string;
      studyType?: string;
      accessionId?: string;
      studyId?: string;
    };
    sourceName?: string;
    sourceType?: string;
    sourceLocation?: string;
    retrievedAt?: string;
    entryMethod?:
      | 'portal-sync'
      | 'manual-entry'
      | 'file-import'
      | 'device-import';
    originalFilename?: string;
    mappingConfidence?: 'source' | 'mapped' | 'manual' | 'unknown';
    provenanceNotes?: string;
  };
}

export type AttachmentOwnerType =
  | 'clinical_document'
  | 'user_profile'
  | 'note'
  | 'other';

export interface Attachment extends BaseRecord {
  ownerType: AttachmentOwnerType;
  ownerId: AppId;
  filename?: string;
  mime: string;
  size: number;
  sha256?: string;
}

export interface InstanceConfig extends BaseRecord {
  experimental?: Record<string, boolean>;
  tutorialCompletedAt?: number;
  setupCompletedAt?: number;
  terminologyProfile?: TerminologyProfile;
  terminologyLookupMode?: TerminologyLookupMode;
  terminologyLanguage?: TerminologyLanguage;
  terminologyRemoteEnabled?: boolean;
}

export interface SummaryPagePreferences extends BaseRecord {
  userId: AppId;
  cards: Array<{ id: string; visible: boolean; order: number }>;
}

export type WorkflowRecordKind =
  | 'audit-log-entry'
  | 'care-task'
  | 'tracker-entry'
  | 'sharing-state';

export interface WorkflowRecord<TPayload = unknown> extends BaseRecord {
  userId: AppId;
  kind: WorkflowRecordKind;
  payload: TPayload;
}

export const ALL_TABLES = [
  'users',
  'user_preferences',
  'connections',
  'clinical_documents',
  'attachments',
  'instance_config',
  'summary_page_preferences',
  'workflow_records',
] as const;

export type TableName = (typeof ALL_TABLES)[number];

export type RecordOf<T extends TableName> = T extends 'users'
  ? User
  : T extends 'user_preferences'
    ? UserPreferences
    : T extends 'connections'
      ? Connection
      : T extends 'clinical_documents'
        ? ClinicalDocument
        : T extends 'attachments'
          ? Attachment
          : T extends 'instance_config'
            ? InstanceConfig
            : T extends 'summary_page_preferences'
              ? SummaryPagePreferences
              : T extends 'workflow_records'
                ? WorkflowRecord
                : never;
