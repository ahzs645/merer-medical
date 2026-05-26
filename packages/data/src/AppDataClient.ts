import type {
  AppId,
  Attachment,
  AttachmentOwnerType,
  ClinicalDocument,
  ClinicalResourceType,
  Connection,
  ConnectionSource,
  FhirFormat,
  InstanceConfig,
  SummaryPagePreferences,
  TableName,
  TerminologyDomain,
  TerminologyEntry,
  TerminologyLanguage,
  TerminologyLookupMode,
  TerminologyPack,
  TerminologyProfile,
  TerminologySearchIndex,
  User,
  UserPreferences,
} from '@mere/domain';

export type Unsubscribe = () => void;

export interface Observable<T> {
  get(): T;
  subscribe(listener: (value: T) => void): Unsubscribe;
}

export interface UserCommands {
  list(): Promise<User[]>;
  get(id: AppId): Promise<User | null>;
  getSelected(): Promise<User | null>;
  create(input: {
    firstName?: string;
    lastName?: string;
    email?: string;
    gender?: string;
    birthday?: string;
  }): Promise<User>;
  update(
    id: AppId,
    patch: Partial<Omit<User, 'id' | 'createdAt'>>,
  ): Promise<User>;
  setProfilePicture(
    id: AppId,
    file: { mime: string; bytes: Uint8Array; filename?: string },
  ): Promise<Attachment>;
  select(id: AppId): Promise<void>;
  delete(id: AppId): Promise<void>;
  observeSelected(): Observable<User | null>;
}

export interface UserPreferencesCommands {
  getForUser(userId: AppId): Promise<UserPreferences | null>;
  upsert(
    userId: AppId,
    patch: Partial<Omit<UserPreferences, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<UserPreferences>;
}

export interface ConnectionCommands {
  list(userId: AppId): Promise<Connection[]>;
  get(id: AppId): Promise<Connection | null>;
  bySource(userId: AppId, source: ConnectionSource): Promise<Connection[]>;
  create(
    input: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Connection>;
  update(
    id: AppId,
    patch: Partial<Omit<Connection, 'id' | 'createdAt' | 'userId'>>,
  ): Promise<Connection>;
  delete(id: AppId): Promise<void>;
  observe(userId: AppId): Observable<Connection[]>;
}

export interface ClinicalDocumentQuery {
  userId: AppId;
  connectionId?: AppId;
  resourceTypes?: ClinicalResourceType[];
  format?: FhirFormat;
  sinceUpdatedAt?: number;
  limit?: number;
  offset?: number;
}

export interface ClinicalDocumentCommands {
  query(q: ClinicalDocumentQuery): Promise<ClinicalDocument[]>;
  get(id: AppId): Promise<ClinicalDocument | null>;
  upsertBatch(
    docs: Array<
      Omit<ClinicalDocument, 'createdAt' | 'updatedAt'> & { id?: AppId }
    >,
  ): Promise<ClinicalDocument[]>;
  delete(id: AppId): Promise<void>;
  countByResource(userId: AppId): Promise<Record<ClinicalResourceType, number>>;
  observe(q: ClinicalDocumentQuery): Observable<ClinicalDocument[]>;
}

export interface AttachmentCommands {
  list(ownerType: AttachmentOwnerType, ownerId: AppId): Promise<Attachment[]>;
  get(id: AppId): Promise<Attachment | null>;
  read(id: AppId): Promise<{ meta: Attachment; bytes: Uint8Array } | null>;
  put(input: {
    ownerType: AttachmentOwnerType;
    ownerId: AppId;
    mime: string;
    bytes: Uint8Array;
    filename?: string;
  }): Promise<Attachment>;
  delete(id: AppId): Promise<void>;
}

export interface InstanceConfigCommands {
  get(): Promise<InstanceConfig | null>;
  update(
    patch: Partial<Omit<InstanceConfig, 'id' | 'createdAt'>>,
  ): Promise<InstanceConfig>;
}

export interface SummaryPagePreferencesCommands {
  getForUser(userId: AppId): Promise<SummaryPagePreferences | null>;
  upsert(
    userId: AppId,
    cards: SummaryPagePreferences['cards'],
  ): Promise<SummaryPagePreferences>;
}

export interface TerminologySearchQuery {
  profile: TerminologyProfile;
  domain: TerminologyDomain;
  query: string;
  language: TerminologyLanguage;
  lookupMode?: TerminologyLookupMode;
  remoteEnabled?: boolean;
  limit?: number;
}

export interface TerminologyCommands {
  listPacks(profile?: TerminologyProfile): Promise<TerminologyPack[]>;
  upsertPack(input: {
    pack: Omit<TerminologyPack, 'createdAt' | 'updatedAt'>;
    entries: Array<Omit<TerminologyEntry, 'createdAt' | 'updatedAt'>>;
    searchIndexes?: Array<
      Omit<TerminologySearchIndex, 'createdAt' | 'updatedAt'>
    >;
  }): Promise<TerminologyPack>;
  search(q: TerminologySearchQuery): Promise<TerminologyEntry[]>;
}

export type ExportProgress = {
  phase: 'tables' | 'attachments' | 'sealing' | 'done';
  done: number;
  total: number;
  table?: TableName | 'attachments';
};

export interface PackageCommands {
  /**
   * Export the entire local store as a .emrpkg buffer.
   * If `passphrase` is provided the output is encrypted (AES-GCM, PBKDF2).
   */
  export(opts?: {
    passphrase?: string;
    onProgress?: (p: ExportProgress) => void;
  }): Promise<Uint8Array>;

  /**
   * Import a .emrpkg buffer into the local store.
   * `merge: 'replace'` wipes existing tables first; `'upsert'` overlays by id.
   */
  import(
    bytes: Uint8Array,
    opts?: {
      passphrase?: string;
      merge?: 'replace' | 'upsert';
      onProgress?: (p: ExportProgress) => void;
    },
  ): Promise<{ counts: Partial<Record<TableName, number>> }>;

  /** Cheap header inspection: returns whether the file is encrypted and its version. */
  inspect(bytes: Uint8Array): Promise<{
    encrypted: boolean;
    formatVersion: number;
    appVersion?: string;
    createdAt?: number;
  }>;
}

export interface AppDataClient {
  readonly mode: 'local' | 'convex';
  users: UserCommands;
  userPreferences: UserPreferencesCommands;
  connections: ConnectionCommands;
  clinicalDocuments: ClinicalDocumentCommands;
  attachments: AttachmentCommands;
  instanceConfig: InstanceConfigCommands;
  summaryPagePreferences: SummaryPagePreferencesCommands;
  terminology: TerminologyCommands;
  package: PackageCommands;
  /** Close any underlying connections (Dexie open handles, websockets, etc.). */
  close(): Promise<void>;
}
