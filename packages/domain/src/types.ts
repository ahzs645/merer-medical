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

export type ConnectionSource =
  | 'epic'
  | 'onpatient'
  | 'cerner'
  | 'veradigm'
  | 'va'
  | 'healow'
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
  | 'specimen';

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
}

export interface SummaryPagePreferences extends BaseRecord {
  userId: AppId;
  cards: Array<{ id: string; visible: boolean; order: number }>;
}

export const ALL_TABLES = [
  'users',
  'user_preferences',
  'connections',
  'clinical_documents',
  'attachments',
  'instance_config',
  'summary_page_preferences',
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
              : never;
