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

export type ClinicalDemoSourceKind = 'open-dental-demo';

export interface ClinicalDemoSource extends BaseRecord {
  kind: ClinicalDemoSourceKind;
  name: string;
  sourcePath?: string;
  databaseVersion?: string;
  practiceName?: string;
  importedAt?: number;
  metadata?: Record<string, unknown>;
}

export type SourceCodeSystemKind =
  | 'CDT'
  | 'ICD9'
  | 'ICD10'
  | 'CPT'
  | 'HCPCS'
  | 'SNOMED'
  | 'LOINC'
  | 'CVX'
  | 'RxNorm'
  | 'UCUM'
  | 'OpenDentalProcedureCode'
  | 'OpenDentalDefinition'
  | 'other';

export interface SourceCodeSystem extends BaseRecord {
  demoSourceId?: AppId;
  kind: SourceCodeSystemKind;
  name: string;
  version?: string;
  sourceTable?: string;
  sourceColumn?: string;
  codeCount?: number;
  populated: boolean;
  metadata?: Record<string, unknown>;
}

export type DentalTerminologyJurisdiction = 'CA' | 'US' | 'global';

export interface DentalTerminologySet extends BaseRecord {
  jurisdiction: DentalTerminologyJurisdiction;
  name: string;
  source: string;
  sourceVersion?: string;
  sourcePath?: string;
  importedAt?: number;
  codeCount?: number;
  languageCoverage?: TerminologyLanguage[];
  license?: string;
  metadata?: Record<string, unknown>;
}

export interface DentalTerminologyCode extends BaseRecord {
  terminologySetId: AppId;
  jurisdiction: DentalTerminologyJurisdiction;
  system: SourceCodeSystemKind | string;
  sourceTable?: string;
  sourceCodeId?: string;
  code: string;
  display: string;
  abbreviatedDisplay?: string;
  category?: string;
  treatmentArea?: string;
  procedureTime?: string;
  defaultNote?: string;
  defaultClaimNote?: string;
  defaultTreatmentPlanNote?: string;
  laymanTerm?: string;
  medicalCode?: string;
  diagnosticCodes?: string[];
  alternateCode?: string;
  substitutionCode?: string;
  substitutionRule?: string;
  flags?: {
    noBillInsurance?: boolean;
    prosthesis?: boolean;
    hygiene?: boolean;
    taxed?: boolean;
    canadianLab?: boolean;
    preExisting?: boolean;
    multiVisit?: boolean;
    radiology?: boolean;
    areaAlsoToothRange?: boolean;
  };
  units?: {
    baseUnits?: number;
    canadaTimeUnits?: number;
  };
  visual?: {
    paintType?: string;
    graphicColor?: string;
    paintText?: string;
  };
  providerIdDefault?: string;
  revenueCodeDefault?: string;
  active: boolean;
  raw?: unknown;
}

export type DentalToothNumberingSystem =
  | 'universal'
  | 'iso-3950'
  | 'palmer'
  | 'open-dental';

export type DentalSurface =
  | 'M'
  | 'O'
  | 'D'
  | 'B'
  | 'L'
  | 'F'
  | 'I'
  | 'V'
  | 'P'
  | string;

export type DentalDentition = 'permanent' | 'deciduous' | 'mixed' | 'unknown';

export type DentalToothConditionKind =
  | 'sound'
  | 'filled'
  | 'compromised'
  | 'endo'
  | 'missing'
  | 'rotated'
  | 'displaced'
  | 'gum-recessed';

export interface DentalToothState {
  tooth: string;
  surfaces?: DentalSurface[];
  dentition?: DentalDentition;
  status?: DentalToothConditionKind | (string & {});
  sourceProcedureIds?: string[];
  notes?: string;
}

export interface DentalPatientProfile extends BaseRecord {
  userId?: AppId;
  demoSourceId?: AppId;
  sourcePatientId: string;
  chartNumber?: string;
  firstName?: string;
  lastName?: string;
  middleInitial?: string;
  preferredName?: string;
  birthDate?: string;
  gender?: string;
  status?: string;
  language?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  telecom?: {
    homePhone?: string;
    workPhone?: string;
    mobilePhone?: string;
    email?: string;
  };
  familyAccount?: {
    guarantorSourcePatientId?: string;
    responsiblePartySourcePatientId?: string;
    superFamilySourcePatientId?: string;
  };
  providerIds?: {
    primary?: string;
    secondary?: string;
  };
  raw?: unknown;
}

export interface DentalToothChart extends BaseRecord {
  userId?: AppId;
  dentalPatientProfileId: AppId;
  demoSourceId?: AppId;
  numberingSystem: DentalToothNumberingSystem;
  teeth: DentalToothState[];
  sourceProcedureIds?: string[];
  sourceTables?: string[];
  raw?: unknown;
}

export interface DentalProcedureRecord extends BaseRecord {
  userId?: AppId;
  dentalPatientProfileId: AppId;
  dentalToothChartId?: AppId;
  demoSourceId?: AppId;
  sourceProcedureId: string;
  sourceAppointmentId?: string;
  procedureDate?: string;
  completedAt?: string;
  status?: string;
  providerId?: string;
  code?: {
    system: SourceCodeSystemKind | string;
    code: string;
    display?: string;
    sourceCodeId?: string;
  };
  fee?: number;
  tooth?: string;
  surfaces?: DentalSurface[];
  toothRange?: string;
  diagnosisCodes?: Array<{
    system: SourceCodeSystemKind | string;
    code: string;
    display?: string;
  }>;
  notes?: string;
  raw?: unknown;
}

export interface DentalInsuranceRecord extends BaseRecord {
  userId?: AppId;
  dentalPatientProfileId: AppId;
  demoSourceId?: AppId;
  sourcePatPlanId?: string;
  sourceInsSubId?: string;
  sourcePlanId?: string;
  sourceCarrierId?: string;
  ordinal?: number;
  relationship?: string;
  subscriberSourcePatientId?: string;
  subscriberId?: string;
  effectiveDate?: string;
  terminationDate?: string;
  carrierName?: string;
  groupName?: string;
  groupNumber?: string;
  planType?: string;
  benefits?: DentalInsuranceBenefit[];
  benefitSummary?: unknown;
  raw?: unknown;
}

export interface DentalInsuranceBenefit {
  sourceBenefitId?: string;
  sourceCoverageCategoryId?: string;
  category?: string;
  benefitType?: string;
  percent?: number;
  monetaryAmount?: number;
  timePeriod?: string;
  quantityQualifier?: string;
  quantity?: number;
  code?: string;
  coverageLevel?: string;
  treatmentArea?: string;
  toothRange?: string;
  raw?: unknown;
}

export interface DentalProviderRecord extends BaseRecord {
  demoSourceId?: AppId;
  sourceProviderId: string;
  abbreviation?: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  suffix?: string;
  specialty?: string;
  npi?: string;
  stateLicense?: string;
  deaNumber?: string;
  taxonomyCode?: string;
  medicaidId?: string;
  isSecondary?: boolean;
  isHidden?: boolean;
  isNotPerson?: boolean;
  isErxEnabled?: boolean;
  feeScheduleId?: string;
  emailAddressId?: string;
  clinicIds?: string[];
  schedulingNote?: string;
  raw?: unknown;
}

export interface DentalClaimRecord extends BaseRecord {
  userId?: AppId;
  dentalPatientProfileId: AppId;
  demoSourceId?: AppId;
  sourceClaimId: string;
  sourcePlanId?: string;
  sourceInsSubId?: string;
  sourceCarrierId?: string;
  claimType?: string;
  status?: string;
  dateService?: string;
  dateSent?: string;
  dateReceived?: string;
  providerTreatingId?: string;
  providerBillingId?: string;
  clinicId?: string;
  claimFee?: number;
  insuranceEstimate?: number;
  insurancePaid?: number;
  writeOff?: number;
  patientRelation?: string;
  isOrtho?: boolean;
  orthoMonthsRemaining?: number;
  orthoDate?: string;
  narrative?: string;
  note?: string;
  attachmentIds?: AppId[];
  lines: DentalClaimLine[];
  payments?: DentalClaimPayment[];
  raw?: unknown;
}

export interface DentalClaimLine {
  sourceClaimProcId?: string;
  sourceProcedureId?: string;
  procedureDate?: string;
  codeSent?: string;
  lineNumber?: number;
  feeBilled?: number;
  allowedAmount?: number;
  deductibleApplied?: number;
  deductibleEstimate?: number;
  insuranceEstimate?: number;
  insurancePaid?: number;
  writeOff?: number;
  copayAmount?: number;
  percentOverride?: number;
  status?: string;
  remarks?: string;
  raw?: unknown;
}

export interface DentalClaimPayment {
  sourceClaimPaymentId?: string;
  checkDate?: string;
  checkAmount?: number;
  checkNumber?: string;
  carrierName?: string;
  bankBranch?: string;
  note?: string;
  paymentType?: string;
  raw?: unknown;
}

export interface DentalRecallRecord extends BaseRecord {
  userId?: AppId;
  dentalPatientProfileId: AppId;
  demoSourceId?: AppId;
  sourceRecallId: string;
  sourceRecallTypeId?: string;
  type?: string;
  dueDateCalculated?: string;
  dueDate?: string;
  previousDate?: string;
  scheduledDate?: string;
  interval?: string;
  status?: string;
  priority?: string;
  disabled?: boolean;
  disabledUntilDate?: string;
  note?: string;
  procedures?: string[];
  raw?: unknown;
}

export interface DentalOrthoRecord extends BaseRecord {
  userId?: AppId;
  dentalPatientProfileId: AppId;
  demoSourceId?: AppId;
  sourceOrthoCaseId?: string;
  providerId?: string;
  clinicId?: string;
  orthoType?: string;
  isActive?: boolean;
  bandingDate?: string;
  debondDate?: string;
  expectedDebondDate?: string;
  isTransfer?: boolean;
  patientFee?: number;
  primaryInsuranceFee?: number;
  secondaryInsuranceFee?: number;
  lips?: 'competent' | 'incompetent' | 'potentially_competent' | (string & {});
  facialProfile?:
    | 'brachycephalic'
    | 'dolichocephalic'
    | 'mesocephalic'
    | (string & {});
  oralHygiene?: 'good' | 'moderate' | 'bad' | (string & {});
  skeletalRelationship?: number;
  molarRelationship?: number;
  canineRelationship?: number;
  overjetMm?: number;
  overbiteMm?: number;
  upperSpaceAvailableMm?: number;
  upperSpaceNeededMm?: number;
  lowerSpaceAvailableMm?: number;
  lowerSpaceNeededMm?: number;
  crossScissorBiteTeeth?: string[];
  problems?: string[];
  appliancePlan?: string[];
  nextVisitNotes?: string[];
  isStarted?: boolean;
  startedDate?: string;
  isFinished?: boolean;
  finishedDate?: string;
  visits?: Array<{
    id?: string;
    visitNumber?: number;
    date?: string;
    appliance?: string;
    target?: string;
    notes?: string;
    photoAttachmentIds?: AppId[];
    photos?: Array<{
      attachmentId?: AppId;
      view?: string;
      comment?: string;
    }>;
  }>;
  chartRows?: Array<{
    sourceOrthoChartRowId?: string;
    serviceDate?: string;
    providerId?: string;
    signature?: string;
    fields?: Array<{
      sourceOrthoChartId?: string;
      name?: string;
      value?: string;
    }>;
  }>;
  hardware?: Array<{
    sourceOrthoHardwareId?: string;
    examDate?: string;
    hardwareType?: string;
    description?: string;
    toothRange?: string;
    note?: string;
    hidden?: boolean;
  }>;
  schedule?: {
    sourceOrthoScheduleId?: string;
    bandingDateOverride?: string;
    debondDateOverride?: string;
    bandingAmount?: number;
    visitAmount?: number;
    debondAmount?: number;
  };
  raw?: unknown;
}

export interface DentalToothConditionRecord extends BaseRecord {
  userId?: AppId;
  dentalPatientProfileId: AppId;
  dentalToothChartId?: AppId;
  demoSourceId?: AppId;
  sourceToothInitialId?: string;
  tooth: string;
  conditionType?: DentalToothConditionKind | (string & {});
  displayLabel?: string;
  displayColor?: string;
  actionLevel?: 'watch' | 'active' | 'planned' | 'complete' | (string & {});
  movement?: number;
  drawingSegment?: string;
  drawColor?: string;
  drawText?: string;
  recordedAt?: string;
  raw?: unknown;
}

export interface DentalPerioExam extends BaseRecord {
  userId?: AppId;
  dentalPatientProfileId: AppId;
  demoSourceId?: AppId;
  sourcePerioExamId: string;
  examDate?: string;
  providerId?: string;
  note?: string;
  measurements: DentalPerioMeasurement[];
  raw?: unknown;
}

export interface DentalPerioMeasurement {
  sourcePerioMeasureId?: string;
  sequenceType?: string;
  tooth: string;
  toothValue?: number;
  values?: {
    MB?: number;
    B?: number;
    DB?: number;
    ML?: number;
    L?: number;
    DL?: number;
  };
  raw?: unknown;
}

export interface DentalTreatmentPlan extends BaseRecord {
  userId?: AppId;
  dentalPatientProfileId: AppId;
  demoSourceId?: AppId;
  sourceTreatmentPlanId: string;
  heading?: string;
  note?: string;
  status?: string;
  dateCreated?: string;
  datePresented?: string;
  responsiblePartySourcePatientId?: string;
  procedures: DentalTreatmentPlanProcedure[];
  raw?: unknown;
}

export interface DentalTreatmentPlanProcedure {
  sourceProcTpId?: string;
  sourceProcedureId?: string;
  itemOrder?: number;
  priority?: string;
  tooth?: string;
  surfaces?: DentalSurface[];
  code?: string;
  description?: string;
  fee?: number;
  primaryInsuranceEstimate?: number;
  secondaryInsuranceEstimate?: number;
  patientAmount?: number;
  discount?: number;
  prognosis?: string;
  providerId?: string;
  clinicId?: string;
  plannedDate?: string;
  raw?: unknown;
}

export interface DentalFeeSchedule extends BaseRecord {
  demoSourceId?: AppId;
  sourceFeeScheduleId: string;
  description: string;
  scheduleType?: string;
  isHidden?: boolean;
  isGlobal?: boolean;
  entries: DentalFeeScheduleEntry[];
  raw?: unknown;
}

export interface DentalFeeScheduleEntry {
  sourceFeeId?: string;
  sourceCodeId?: string;
  code?: string;
  amount?: number;
  clinicId?: string;
  providerId?: string;
  effectiveDate?: string;
  useDefaultFee?: boolean;
  raw?: unknown;
}

export interface DentalImagingRecord extends BaseRecord {
  userId?: AppId;
  dentalPatientProfileId: AppId;
  demoSourceId?: AppId;
  clinicalDocumentId?: AppId;
  attachmentIds?: AppId[];
  sourceDocumentId?: string;
  sourceMountId?: string;
  sourceMountItemId?: string;
  description?: string;
  imageRole?:
    | 'intraoral'
    | 'extraoral'
    | 'radiograph'
    | 'document'
    | 'other'
    | (string & {});
  modality?: string;
  acquisitionDate?: string;
  toothNumbers?: string[];
  galleryPosition?: number;
  thumbnailAttachmentId?: AppId;
  previewAttachmentId?: AppId;
  orientation?: {
    rotatedDegrees?: number;
    flippedHorizontal?: boolean;
    flippedVertical?: boolean;
    crop?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  mount?: {
    description?: string;
    itemOrder?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
  };
  annotations?: Array<{
    sourceImageDrawId?: string;
    drawType?: string;
    color?: string;
    text?: string;
    details?: string;
  }>;
  raw?: unknown;
}

export interface DentalLabCase extends BaseRecord {
  userId?: AppId;
  dentalPatientProfileId: AppId;
  demoSourceId?: AppId;
  sourceLabCaseId: string;
  sourceAppointmentId?: string;
  sourcePlannedAppointmentId?: string;
  caseTitle?: string;
  caseDetails?: string;
  laboratoryName?: string;
  laboratoryContact?: string;
  providerId?: string;
  operatingProviderIds?: string[];
  involvedTeeth?: string[];
  dueAt?: string;
  createdAtSource?: string;
  sent?: boolean;
  sentAt?: string;
  received?: boolean;
  receivedAt?: string;
  checkedAt?: string;
  instructions?: string;
  price?: number;
  labFee?: number;
  paid?: boolean;
  paidAt?: string;
  invoiceNumber?: string;
  raw?: unknown;
}

export interface DentalFormRecord extends BaseRecord {
  userId?: AppId;
  dentalPatientProfileId?: AppId;
  demoSourceId?: AppId;
  clinicalDocumentId?: AppId;
  sourceSheetId?: string;
  sourceSheetDefId?: string;
  sourceDocumentId?: string;
  sheetType?: string;
  description?: string;
  completedAt?: string;
  internalNote?: string;
  fields: Array<{
    sourceSheetFieldId?: string;
    fieldType?: string;
    name?: string;
    value?: string;
    reportableName?: string;
    required?: boolean;
    signedAt?: string;
  }>;
  raw?: unknown;
}

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
  apiConfig?: Record<string, string | boolean>;
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
  'clinical_demo_sources',
  'source_code_systems',
  'dental_terminology_sets',
  'dental_terminology_codes',
  'dental_provider_records',
  'dental_patient_profiles',
  'dental_tooth_charts',
  'dental_procedure_records',
  'dental_insurance_records',
  'dental_claim_records',
  'dental_recall_records',
  'dental_ortho_records',
  'dental_tooth_condition_records',
  'dental_perio_exams',
  'dental_treatment_plans',
  'dental_fee_schedules',
  'dental_imaging_records',
  'dental_lab_cases',
  'dental_form_records',
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
        : T extends 'clinical_demo_sources'
          ? ClinicalDemoSource
          : T extends 'source_code_systems'
            ? SourceCodeSystem
            : T extends 'dental_terminology_sets'
              ? DentalTerminologySet
              : T extends 'dental_terminology_codes'
                ? DentalTerminologyCode
                : T extends 'dental_provider_records'
                  ? DentalProviderRecord
                  : T extends 'dental_patient_profiles'
                    ? DentalPatientProfile
                    : T extends 'dental_tooth_charts'
                      ? DentalToothChart
                      : T extends 'dental_procedure_records'
                        ? DentalProcedureRecord
                        : T extends 'dental_insurance_records'
                          ? DentalInsuranceRecord
                          : T extends 'dental_claim_records'
                            ? DentalClaimRecord
                            : T extends 'dental_recall_records'
                              ? DentalRecallRecord
                              : T extends 'dental_ortho_records'
                                ? DentalOrthoRecord
                                : T extends 'dental_tooth_condition_records'
                                  ? DentalToothConditionRecord
                                  : T extends 'dental_perio_exams'
                                    ? DentalPerioExam
                                    : T extends 'dental_treatment_plans'
                                      ? DentalTreatmentPlan
                                      : T extends 'dental_fee_schedules'
                                        ? DentalFeeSchedule
                                        : T extends 'dental_imaging_records'
                                          ? DentalImagingRecord
                                          : T extends 'dental_lab_cases'
                                            ? DentalLabCase
                                            : T extends 'dental_form_records'
                                              ? DentalFormRecord
                                              : T extends 'attachments'
                                                ? Attachment
                                                : T extends 'instance_config'
                                                  ? InstanceConfig
                                                  : T extends 'summary_page_preferences'
                                                    ? SummaryPagePreferences
                                                    : T extends 'workflow_records'
                                                      ? WorkflowRecord
                                                      : never;
