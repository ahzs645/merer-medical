import { createId } from '@mere/domain';
import type {
  ClinicalDemoSource,
  DentalClaimRecord,
  DentalFeeSchedule,
  DentalFormRecord,
  DentalImagingRecord,
  DentalInsuranceRecord,
  DentalLabCase,
  DentalOrthoRecord,
  DentalPatientProfile,
  DentalPerioExam,
  DentalProcedureRecord,
  DentalProviderRecord,
  DentalRecallRecord,
  DentalTerminologyCode,
  DentalTerminologySet,
  DentalToothConditionRecord,
  DentalToothChart,
  DentalTreatmentPlan,
  SourceCodeSystem,
} from '@mere/domain';
import type { AppDataClient } from '@mere/data';

import type { MereDb } from '../db';
import { now } from './common';

function prepare<T extends { id: string; createdAt: number; updatedAt: number }>(
  row: Omit<T, 'createdAt' | 'updatedAt'> & { id?: string },
  prefix: string,
): T {
  const t = now();
  return {
    ...(row as T),
    id: row.id ?? createId(prefix),
    createdAt: (row as Partial<T>).createdAt ?? t,
    updatedAt: t,
  };
}

export function createClinicalDemoCommands(
  db: MereDb,
): AppDataClient['clinicalDemo'] {
  const listByPatient = async <T>(
    tableName: string,
    dentalPatientProfileId: string,
  ): Promise<T[]> =>
    db
      .table(tableName)
      .where('dentalPatientProfileId')
      .equals(dentalPatientProfileId)
      .toArray() as Promise<T[]>;

  const listByDemo = async <T>(
    tableName: string,
    demoSourceId?: string,
  ): Promise<T[]> => {
    if (!demoSourceId) return db.table(tableName).toArray() as Promise<T[]>;
    return db
      .table(tableName)
      .where('demoSourceId')
      .equals(demoSourceId)
      .toArray() as Promise<T[]>;
  };

  const upsertRows = async <
    T extends { id: string; createdAt: number; updatedAt: number },
  >(
    tableName: string,
    rows: Array<Omit<T, 'createdAt' | 'updatedAt'> & { id?: string }>,
    prefix: string,
  ): Promise<T[]> => {
    const prepared = rows.map((row) => prepare<T>(row, prefix));
    await db.table(tableName).bulkPut(prepared);
    return prepared;
  };

  return {
    async listSources(kind) {
      const rows = kind
        ? await db.clinical_demo_sources.where('kind').equals(kind).toArray()
        : await db.clinical_demo_sources.toArray();
      return rows.filter((row) => !row.deletedAt);
    },
    async upsertSource(input) {
      const row = prepare<ClinicalDemoSource>(input, 'demo');
      await db.clinical_demo_sources.put(row);
      return row;
    },
    async listCodeSystems(demoSourceId) {
      const rows = demoSourceId
        ? await db.source_code_systems
            .where('demoSourceId')
            .equals(demoSourceId)
            .toArray()
        : await db.source_code_systems.toArray();
      return rows.filter((row) => !row.deletedAt);
    },
    async upsertCodeSystems(rows) {
      const prepared = rows.map((row) =>
        prepare<SourceCodeSystem>(row, 'codesys'),
      );
      await db.source_code_systems.bulkPut(prepared);
      return prepared;
    },
    async listTerminologySets(jurisdiction) {
      const rows = jurisdiction
        ? await db.dental_terminology_sets
            .where('jurisdiction')
            .equals(jurisdiction)
            .toArray()
        : await db.dental_terminology_sets.toArray();
      return rows.filter((row) => !row.deletedAt);
    },
    async upsertTerminologySet(input) {
      const row = prepare<DentalTerminologySet>(input, 'dtermset');
      await db.dental_terminology_sets.put(row);
      return row;
    },
    async queryTerminologyCodes(q = {}) {
      let rows: DentalTerminologyCode[];
      if (q.terminologySetId) {
        rows = await db.dental_terminology_codes
          .where('terminologySetId')
          .equals(q.terminologySetId)
          .toArray();
      } else if (q.jurisdiction && q.system) {
        rows = await db.dental_terminology_codes
          .where('[jurisdiction+system]')
          .equals([q.jurisdiction, q.system])
          .toArray();
      } else if (q.jurisdiction) {
        rows = await db.dental_terminology_codes
          .where('jurisdiction')
          .equals(q.jurisdiction)
          .toArray();
      } else {
        rows = await db.dental_terminology_codes.toArray();
      }
      if (q.system) rows = rows.filter((row) => row.system === q.system);
      if (q.query) {
        const needle = q.query.toLowerCase();
        rows = rows.filter(
          (row) =>
            row.code.toLowerCase().includes(needle) ||
            row.display.toLowerCase().includes(needle) ||
            row.abbreviatedDisplay?.toLowerCase().includes(needle) ||
            row.category?.toLowerCase().includes(needle),
        );
      }
      rows = rows.filter((row) => row.active && !row.deletedAt);
      return rows.slice(0, q.limit ?? rows.length);
    },
    upsertTerminologyCodes: (rows) =>
      upsertRows<DentalTerminologyCode>(
        'dental_terminology_codes',
        rows,
        'dterm',
      ),
    listProviders: (demoSourceId) =>
      listByDemo<DentalProviderRecord>('dental_provider_records', demoSourceId),
    upsertProviders: (rows) =>
      upsertRows<DentalProviderRecord>(
        'dental_provider_records',
        rows,
        'dprov',
      ),
    async listDentalPatients(q = {}) {
      let rows = q.demoSourceId
        ? await db.dental_patient_profiles
            .where('demoSourceId')
            .equals(q.demoSourceId)
            .toArray()
        : await db.dental_patient_profiles.toArray();
      if (q.userId) rows = rows.filter((row) => row.userId === q.userId);
      return rows.filter((row) => !row.deletedAt);
    },
    async upsertDentalPatients(rows) {
      const prepared = rows.map((row) =>
        prepare<DentalPatientProfile>(row, 'dpat'),
      );
      await db.dental_patient_profiles.bulkPut(prepared);
      return prepared;
    },
    async listToothCharts(dentalPatientProfileId) {
      return db.dental_tooth_charts
        .where('dentalPatientProfileId')
        .equals(dentalPatientProfileId)
        .toArray();
    },
    async upsertToothChart(row) {
      const prepared = prepare<DentalToothChart>(row, 'tchart');
      await db.dental_tooth_charts.put(prepared);
      return prepared;
    },
    async listDentalProcedures(dentalPatientProfileId) {
      return db.dental_procedure_records
        .where('dentalPatientProfileId')
        .equals(dentalPatientProfileId)
        .toArray();
    },
    async upsertDentalProcedures(rows) {
      const prepared = rows.map((row) =>
        prepare<DentalProcedureRecord>(row, 'dproc'),
      );
      await db.dental_procedure_records.bulkPut(prepared);
      return prepared;
    },
    async listDentalInsurance(dentalPatientProfileId) {
      return db.dental_insurance_records
        .where('dentalPatientProfileId')
        .equals(dentalPatientProfileId)
        .toArray();
    },
    async upsertDentalInsurance(rows) {
      const prepared = rows.map((row) =>
        prepare<DentalInsuranceRecord>(row, 'dins'),
      );
      await db.dental_insurance_records.bulkPut(prepared);
      return prepared;
    },
    listClaims: (dentalPatientProfileId) =>
      listByPatient<DentalClaimRecord>(
        'dental_claim_records',
        dentalPatientProfileId,
      ),
    upsertClaims: (rows) =>
      upsertRows<DentalClaimRecord>('dental_claim_records', rows, 'dclaim'),
    listRecalls: (dentalPatientProfileId) =>
      listByPatient<DentalRecallRecord>(
        'dental_recall_records',
        dentalPatientProfileId,
      ),
    upsertRecalls: (rows) =>
      upsertRows<DentalRecallRecord>('dental_recall_records', rows, 'drecall'),
    listOrthoRecords: (dentalPatientProfileId) =>
      listByPatient<DentalOrthoRecord>(
        'dental_ortho_records',
        dentalPatientProfileId,
      ),
    upsertOrthoRecords: (rows) =>
      upsertRows<DentalOrthoRecord>('dental_ortho_records', rows, 'dortho'),
    listToothConditions: (dentalPatientProfileId) =>
      listByPatient<DentalToothConditionRecord>(
        'dental_tooth_condition_records',
        dentalPatientProfileId,
      ),
    upsertToothConditions: (rows) =>
      upsertRows<DentalToothConditionRecord>(
        'dental_tooth_condition_records',
        rows,
        'tcond',
      ),
    listPerioExams: (dentalPatientProfileId) =>
      listByPatient<DentalPerioExam>(
        'dental_perio_exams',
        dentalPatientProfileId,
      ),
    upsertPerioExams: (rows) =>
      upsertRows<DentalPerioExam>('dental_perio_exams', rows, 'perio'),
    listTreatmentPlans: (dentalPatientProfileId) =>
      listByPatient<DentalTreatmentPlan>(
        'dental_treatment_plans',
        dentalPatientProfileId,
      ),
    upsertTreatmentPlans: (rows) =>
      upsertRows<DentalTreatmentPlan>(
        'dental_treatment_plans',
        rows,
        'dtp',
      ),
    listFeeSchedules: (demoSourceId) =>
      listByDemo<DentalFeeSchedule>('dental_fee_schedules', demoSourceId),
    upsertFeeSchedules: (rows) =>
      upsertRows<DentalFeeSchedule>('dental_fee_schedules', rows, 'dfs'),
    listImagingRecords: (dentalPatientProfileId) =>
      listByPatient<DentalImagingRecord>(
        'dental_imaging_records',
        dentalPatientProfileId,
      ),
    upsertImagingRecords: (rows) =>
      upsertRows<DentalImagingRecord>(
        'dental_imaging_records',
        rows,
        'dimg',
      ),
    listLabCases: (dentalPatientProfileId) =>
      listByPatient<DentalLabCase>('dental_lab_cases', dentalPatientProfileId),
    upsertLabCases: (rows) =>
      upsertRows<DentalLabCase>('dental_lab_cases', rows, 'dlab'),
    async listFormRecords(q = {}) {
      let rows = await listByDemo<DentalFormRecord>(
        'dental_form_records',
        q.demoSourceId,
      );
      if (q.userId) rows = rows.filter((row) => row.userId === q.userId);
      return rows.filter((row) => !row.deletedAt);
    },
    upsertFormRecords: (rows) =>
      upsertRows<DentalFormRecord>('dental_form_records', rows, 'dform'),
  };
}
