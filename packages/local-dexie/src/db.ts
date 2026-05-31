import Dexie, { type Table } from 'dexie';
import type {
  Attachment,
  ClinicalDocument,
  ClinicalDemoSource,
  Connection,
  DentalAppointmentRecord,
  DentalClaimRecord,
  DentalFeeSchedule,
  DentalFormRecord,
  DentalImagingRecord,
  DentalInsuranceRecord,
  DentalLabCase,
  DentalOperatoryRecord,
  DentalOrthoRecord,
  DentalPatientProfile,
  DentalPerioExam,
  DentalProcedureRecord,
  DentalProviderRecord,
  DentalRecallRecord,
  DentalScheduleRecord,
  DentalTerminologyCode,
  DentalTerminologySet,
  DentalToothConditionRecord,
  DentalToothChart,
  DentalTreatmentPlan,
  InstanceConfig,
  SourceCodeSystem,
  SummaryPagePreferences,
  TerminologyEntry,
  TerminologyPack,
  TerminologySearchIndex,
  User,
  UserPreferences,
  WorkflowRecord,
} from '@mere/domain';

export interface AttachmentBlob {
  id: string;
  bytes: Uint8Array;
}

export class MereDb extends Dexie {
  users!: Table<User, string>;
  user_preferences!: Table<UserPreferences, string>;
  connections!: Table<Connection, string>;
  clinical_documents!: Table<ClinicalDocument, string>;
  clinical_demo_sources!: Table<ClinicalDemoSource, string>;
  source_code_systems!: Table<SourceCodeSystem, string>;
  dental_terminology_sets!: Table<DentalTerminologySet, string>;
  dental_terminology_codes!: Table<DentalTerminologyCode, string>;
  dental_provider_records!: Table<DentalProviderRecord, string>;
  dental_patient_profiles!: Table<DentalPatientProfile, string>;
  dental_tooth_charts!: Table<DentalToothChart, string>;
  dental_procedure_records!: Table<DentalProcedureRecord, string>;
  dental_insurance_records!: Table<DentalInsuranceRecord, string>;
  dental_claim_records!: Table<DentalClaimRecord, string>;
  dental_recall_records!: Table<DentalRecallRecord, string>;
  dental_ortho_records!: Table<DentalOrthoRecord, string>;
  dental_tooth_condition_records!: Table<DentalToothConditionRecord, string>;
  dental_perio_exams!: Table<DentalPerioExam, string>;
  dental_treatment_plans!: Table<DentalTreatmentPlan, string>;
  dental_fee_schedules!: Table<DentalFeeSchedule, string>;
  dental_imaging_records!: Table<DentalImagingRecord, string>;
  dental_lab_cases!: Table<DentalLabCase, string>;
  dental_form_records!: Table<DentalFormRecord, string>;
  dental_appointment_records!: Table<DentalAppointmentRecord, string>;
  dental_operatory_records!: Table<DentalOperatoryRecord, string>;
  dental_schedule_records!: Table<DentalScheduleRecord, string>;
  attachments!: Table<Attachment, string>;
  attachment_blobs!: Table<AttachmentBlob, string>;
  instance_config!: Table<InstanceConfig, string>;
  summary_page_preferences!: Table<SummaryPagePreferences, string>;
  terminology_packs!: Table<TerminologyPack, string>;
  terminology_entries!: Table<TerminologyEntry, string>;
  terminology_search_index!: Table<TerminologySearchIndex, string>;
  workflow_records!: Table<WorkflowRecord, string>;

  constructor(name = 'mere') {
    super(name);

    // Indexes mirror the queries we expect to port to Convex later.
    // Convention: primary key first, then secondary indexes.
    this.version(1).stores({
      users: 'id, updatedAt, isSelected, deletedAt',
      user_preferences: 'id, userId, updatedAt',
      connections: 'id, userId, source, updatedAt, deletedAt',
      clinical_documents:
        'id, userId, connectionId, resourceType, updatedAt, deletedAt, [userId+resourceType], [userId+connectionId]',
      attachments: 'id, ownerType, ownerId, updatedAt, [ownerType+ownerId]',
      attachment_blobs: 'id',
      instance_config: 'id, updatedAt',
      summary_page_preferences: 'id, userId, updatedAt',
    });

    this.version(2).stores({
      users: 'id, updatedAt, isSelected, deletedAt',
      user_preferences: 'id, userId, updatedAt',
      connections: 'id, userId, source, updatedAt, deletedAt',
      clinical_documents:
        'id, userId, connectionId, resourceType, updatedAt, deletedAt, [userId+resourceType], [userId+connectionId]',
      attachments: 'id, ownerType, ownerId, updatedAt, [ownerType+ownerId]',
      attachment_blobs: 'id',
      instance_config: 'id, updatedAt',
      summary_page_preferences: 'id, userId, updatedAt',
      terminology_packs:
        'id, profile, source, sourceVersion, importedAt, [profile+source]',
      terminology_entries:
        'id, packId, profile, domain, system, code, active, [profile+domain], [system+code]',
      terminology_search_index:
        'id, packId, profile, domain, language, [profile+domain+language]',
    });

    this.version(3).stores({
      users: 'id, updatedAt, isSelected, deletedAt',
      user_preferences: 'id, userId, updatedAt',
      connections: 'id, userId, source, updatedAt, deletedAt',
      clinical_documents:
        'id, userId, connectionId, resourceType, updatedAt, deletedAt, [userId+resourceType], [userId+connectionId]',
      attachments: 'id, ownerType, ownerId, updatedAt, [ownerType+ownerId]',
      attachment_blobs: 'id',
      instance_config: 'id, updatedAt',
      summary_page_preferences: 'id, userId, updatedAt',
      terminology_packs:
        'id, profile, source, sourceVersion, importedAt, [profile+source]',
      terminology_entries:
        'id, packId, profile, domain, system, code, active, [profile+domain], [system+code]',
      terminology_search_index:
        'id, packId, profile, domain, language, [profile+domain+language]',
      workflow_records: 'id, userId, kind, updatedAt, [userId+kind]',
    });

    this.version(4).stores({
      users: 'id, updatedAt, isSelected, deletedAt',
      user_preferences: 'id, userId, updatedAt',
      connections: 'id, userId, source, updatedAt, deletedAt',
      clinical_documents:
        'id, userId, connectionId, resourceType, updatedAt, deletedAt, [userId+resourceType], [userId+connectionId]',
      clinical_demo_sources: 'id, kind, name, importedAt, updatedAt, deletedAt',
      source_code_systems:
        'id, demoSourceId, kind, name, populated, updatedAt, [demoSourceId+kind]',
      dental_patient_profiles:
        'id, userId, demoSourceId, sourcePatientId, lastName, updatedAt, deletedAt, [demoSourceId+sourcePatientId], [userId+demoSourceId]',
      dental_tooth_charts:
        'id, userId, dentalPatientProfileId, demoSourceId, numberingSystem, updatedAt, [dentalPatientProfileId+numberingSystem]',
      dental_procedure_records:
        'id, userId, dentalPatientProfileId, dentalToothChartId, demoSourceId, sourceProcedureId, sourceAppointmentId, procedureDate, status, tooth, updatedAt, [dentalPatientProfileId+procedureDate], [demoSourceId+sourceProcedureId]',
      dental_insurance_records:
        'id, userId, dentalPatientProfileId, demoSourceId, sourcePatPlanId, sourceInsSubId, sourcePlanId, sourceCarrierId, ordinal, updatedAt, [dentalPatientProfileId+ordinal]',
      attachments: 'id, ownerType, ownerId, updatedAt, [ownerType+ownerId]',
      attachment_blobs: 'id',
      instance_config: 'id, updatedAt',
      summary_page_preferences: 'id, userId, updatedAt',
      terminology_packs:
        'id, profile, source, sourceVersion, importedAt, [profile+source]',
      terminology_entries:
        'id, packId, profile, domain, system, code, active, [profile+domain], [system+code]',
      terminology_search_index:
        'id, packId, profile, domain, language, [profile+domain+language]',
      workflow_records: 'id, userId, kind, updatedAt, [userId+kind]',
    });

    this.version(5).stores({
      users: 'id, updatedAt, isSelected, deletedAt',
      user_preferences: 'id, userId, updatedAt',
      connections: 'id, userId, source, updatedAt, deletedAt',
      clinical_documents:
        'id, userId, connectionId, resourceType, updatedAt, deletedAt, [userId+resourceType], [userId+connectionId]',
      clinical_demo_sources: 'id, kind, name, importedAt, updatedAt, deletedAt',
      source_code_systems:
        'id, demoSourceId, kind, name, populated, updatedAt, [demoSourceId+kind]',
      dental_patient_profiles:
        'id, userId, demoSourceId, sourcePatientId, lastName, updatedAt, deletedAt, [demoSourceId+sourcePatientId], [userId+demoSourceId]',
      dental_tooth_charts:
        'id, userId, dentalPatientProfileId, demoSourceId, numberingSystem, updatedAt, [dentalPatientProfileId+numberingSystem]',
      dental_procedure_records:
        'id, userId, dentalPatientProfileId, dentalToothChartId, demoSourceId, sourceProcedureId, sourceAppointmentId, procedureDate, status, tooth, updatedAt, [dentalPatientProfileId+procedureDate], [demoSourceId+sourceProcedureId]',
      dental_insurance_records:
        'id, userId, dentalPatientProfileId, demoSourceId, sourcePatPlanId, sourceInsSubId, sourcePlanId, sourceCarrierId, ordinal, updatedAt, [dentalPatientProfileId+ordinal]',
      dental_tooth_condition_records:
        'id, userId, dentalPatientProfileId, dentalToothChartId, demoSourceId, sourceToothInitialId, tooth, recordedAt, updatedAt, [dentalPatientProfileId+tooth]',
      dental_perio_exams:
        'id, userId, dentalPatientProfileId, demoSourceId, sourcePerioExamId, examDate, providerId, updatedAt, [dentalPatientProfileId+examDate]',
      dental_treatment_plans:
        'id, userId, dentalPatientProfileId, demoSourceId, sourceTreatmentPlanId, status, dateCreated, datePresented, updatedAt, [dentalPatientProfileId+status]',
      dental_fee_schedules:
        'id, demoSourceId, sourceFeeScheduleId, description, scheduleType, updatedAt, [demoSourceId+sourceFeeScheduleId]',
      dental_imaging_records:
        'id, userId, dentalPatientProfileId, demoSourceId, clinicalDocumentId, sourceDocumentId, sourceMountId, acquisitionDate, updatedAt, [dentalPatientProfileId+acquisitionDate]',
      dental_lab_cases:
        'id, userId, dentalPatientProfileId, demoSourceId, sourceLabCaseId, sourceAppointmentId, dueAt, updatedAt, [dentalPatientProfileId+dueAt]',
      dental_form_records:
        'id, userId, dentalPatientProfileId, demoSourceId, clinicalDocumentId, sourceSheetId, sourceSheetDefId, completedAt, updatedAt, [dentalPatientProfileId+completedAt]',
      attachments: 'id, ownerType, ownerId, updatedAt, [ownerType+ownerId]',
      attachment_blobs: 'id',
      instance_config: 'id, updatedAt',
      summary_page_preferences: 'id, userId, updatedAt',
      terminology_packs:
        'id, profile, source, sourceVersion, importedAt, [profile+source]',
      terminology_entries:
        'id, packId, profile, domain, system, code, active, [profile+domain], [system+code]',
      terminology_search_index:
        'id, packId, profile, domain, language, [profile+domain+language]',
      workflow_records: 'id, userId, kind, updatedAt, [userId+kind]',
    });

    this.version(6).stores({
      users: 'id, updatedAt, isSelected, deletedAt',
      user_preferences: 'id, userId, updatedAt',
      connections: 'id, userId, source, updatedAt, deletedAt',
      clinical_documents:
        'id, userId, connectionId, resourceType, updatedAt, deletedAt, [userId+resourceType], [userId+connectionId]',
      clinical_demo_sources: 'id, kind, name, importedAt, updatedAt, deletedAt',
      source_code_systems:
        'id, demoSourceId, kind, name, populated, updatedAt, [demoSourceId+kind]',
      dental_terminology_sets:
        'id, jurisdiction, source, sourceVersion, importedAt, updatedAt',
      dental_terminology_codes:
        'id, terminologySetId, jurisdiction, system, code, display, category, treatmentArea, active, updatedAt, [jurisdiction+system], [terminologySetId+code]',
      dental_patient_profiles:
        'id, userId, demoSourceId, sourcePatientId, lastName, updatedAt, deletedAt, [demoSourceId+sourcePatientId], [userId+demoSourceId]',
      dental_tooth_charts:
        'id, userId, dentalPatientProfileId, demoSourceId, numberingSystem, updatedAt, [dentalPatientProfileId+numberingSystem]',
      dental_procedure_records:
        'id, userId, dentalPatientProfileId, dentalToothChartId, demoSourceId, sourceProcedureId, sourceAppointmentId, procedureDate, status, tooth, updatedAt, [dentalPatientProfileId+procedureDate], [demoSourceId+sourceProcedureId]',
      dental_insurance_records:
        'id, userId, dentalPatientProfileId, demoSourceId, sourcePatPlanId, sourceInsSubId, sourcePlanId, sourceCarrierId, ordinal, updatedAt, [dentalPatientProfileId+ordinal]',
      dental_tooth_condition_records:
        'id, userId, dentalPatientProfileId, dentalToothChartId, demoSourceId, sourceToothInitialId, tooth, recordedAt, updatedAt, [dentalPatientProfileId+tooth]',
      dental_perio_exams:
        'id, userId, dentalPatientProfileId, demoSourceId, sourcePerioExamId, examDate, providerId, updatedAt, [dentalPatientProfileId+examDate]',
      dental_treatment_plans:
        'id, userId, dentalPatientProfileId, demoSourceId, sourceTreatmentPlanId, status, dateCreated, datePresented, updatedAt, [dentalPatientProfileId+status]',
      dental_fee_schedules:
        'id, demoSourceId, sourceFeeScheduleId, description, scheduleType, updatedAt, [demoSourceId+sourceFeeScheduleId]',
      dental_imaging_records:
        'id, userId, dentalPatientProfileId, demoSourceId, clinicalDocumentId, sourceDocumentId, sourceMountId, acquisitionDate, updatedAt, [dentalPatientProfileId+acquisitionDate]',
      dental_lab_cases:
        'id, userId, dentalPatientProfileId, demoSourceId, sourceLabCaseId, sourceAppointmentId, dueAt, updatedAt, [dentalPatientProfileId+dueAt]',
      dental_form_records:
        'id, userId, dentalPatientProfileId, demoSourceId, clinicalDocumentId, sourceSheetId, sourceSheetDefId, completedAt, updatedAt, [dentalPatientProfileId+completedAt]',
      attachments: 'id, ownerType, ownerId, updatedAt, [ownerType+ownerId]',
      attachment_blobs: 'id',
      instance_config: 'id, updatedAt',
      summary_page_preferences: 'id, userId, updatedAt',
      terminology_packs:
        'id, profile, source, sourceVersion, importedAt, [profile+source]',
      terminology_entries:
        'id, packId, profile, domain, system, code, active, [profile+domain], [system+code]',
      terminology_search_index:
        'id, packId, profile, domain, language, [profile+domain+language]',
      workflow_records: 'id, userId, kind, updatedAt, [userId+kind]',
    });

    this.version(7).stores({
      users: 'id, updatedAt, isSelected, deletedAt',
      user_preferences: 'id, userId, updatedAt',
      connections: 'id, userId, source, updatedAt, deletedAt',
      clinical_documents:
        'id, userId, connectionId, resourceType, updatedAt, deletedAt, [userId+resourceType], [userId+connectionId]',
      clinical_demo_sources: 'id, kind, name, importedAt, updatedAt, deletedAt',
      source_code_systems:
        'id, demoSourceId, kind, name, populated, updatedAt, [demoSourceId+kind]',
      dental_terminology_sets:
        'id, jurisdiction, source, sourceVersion, importedAt, updatedAt',
      dental_terminology_codes:
        'id, terminologySetId, jurisdiction, system, code, display, category, treatmentArea, active, updatedAt, [jurisdiction+system], [terminologySetId+code]',
      dental_provider_records:
        'id, demoSourceId, sourceProviderId, lastName, specialty, npi, updatedAt, [demoSourceId+sourceProviderId]',
      dental_patient_profiles:
        'id, userId, demoSourceId, sourcePatientId, lastName, updatedAt, deletedAt, [demoSourceId+sourcePatientId], [userId+demoSourceId]',
      dental_tooth_charts:
        'id, userId, dentalPatientProfileId, demoSourceId, numberingSystem, updatedAt, [dentalPatientProfileId+numberingSystem]',
      dental_procedure_records:
        'id, userId, dentalPatientProfileId, dentalToothChartId, demoSourceId, sourceProcedureId, sourceAppointmentId, procedureDate, status, tooth, updatedAt, [dentalPatientProfileId+procedureDate], [demoSourceId+sourceProcedureId]',
      dental_insurance_records:
        'id, userId, dentalPatientProfileId, demoSourceId, sourcePatPlanId, sourceInsSubId, sourcePlanId, sourceCarrierId, ordinal, updatedAt, [dentalPatientProfileId+ordinal]',
      dental_claim_records:
        'id, userId, dentalPatientProfileId, demoSourceId, sourceClaimId, sourcePlanId, sourceInsSubId, status, dateService, dateSent, isOrtho, updatedAt, [dentalPatientProfileId+dateService], [demoSourceId+sourceClaimId]',
      dental_recall_records:
        'id, userId, dentalPatientProfileId, demoSourceId, sourceRecallId, sourceRecallTypeId, dueDate, scheduledDate, status, updatedAt, [dentalPatientProfileId+dueDate]',
      dental_ortho_records:
        'id, userId, dentalPatientProfileId, demoSourceId, sourceOrthoCaseId, providerId, isActive, bandingDate, debondDate, updatedAt, [dentalPatientProfileId+isActive]',
      dental_tooth_condition_records:
        'id, userId, dentalPatientProfileId, dentalToothChartId, demoSourceId, sourceToothInitialId, tooth, recordedAt, updatedAt, [dentalPatientProfileId+tooth]',
      dental_perio_exams:
        'id, userId, dentalPatientProfileId, demoSourceId, sourcePerioExamId, examDate, providerId, updatedAt, [dentalPatientProfileId+examDate]',
      dental_treatment_plans:
        'id, userId, dentalPatientProfileId, demoSourceId, sourceTreatmentPlanId, status, dateCreated, datePresented, updatedAt, [dentalPatientProfileId+status]',
      dental_fee_schedules:
        'id, demoSourceId, sourceFeeScheduleId, description, scheduleType, updatedAt, [demoSourceId+sourceFeeScheduleId]',
      dental_imaging_records:
        'id, userId, dentalPatientProfileId, demoSourceId, clinicalDocumentId, sourceDocumentId, sourceMountId, acquisitionDate, updatedAt, [dentalPatientProfileId+acquisitionDate]',
      dental_lab_cases:
        'id, userId, dentalPatientProfileId, demoSourceId, sourceLabCaseId, sourceAppointmentId, dueAt, updatedAt, [dentalPatientProfileId+dueAt]',
      dental_form_records:
        'id, userId, dentalPatientProfileId, demoSourceId, clinicalDocumentId, sourceSheetId, sourceSheetDefId, completedAt, updatedAt, [dentalPatientProfileId+completedAt]',
      attachments: 'id, ownerType, ownerId, updatedAt, [ownerType+ownerId]',
      attachment_blobs: 'id',
      instance_config: 'id, updatedAt',
      summary_page_preferences: 'id, userId, updatedAt',
      terminology_packs:
        'id, profile, source, sourceVersion, importedAt, [profile+source]',
      terminology_entries:
        'id, packId, profile, domain, system, code, active, [profile+domain], [system+code]',
      terminology_search_index:
        'id, packId, profile, domain, language, [profile+domain+language]',
      workflow_records: 'id, userId, kind, updatedAt, [userId+kind]',
    });
  }
}

let _db: MereDb | null = null;

export function getDb(name = 'mere'): MereDb {
  if (_db && _db.name === name) return _db;
  if (_db) {
    _db.close();
    _db = null;
  }
  _db = new MereDb(name);
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_db) {
    _db.close();
    _db = null;
  }
}
