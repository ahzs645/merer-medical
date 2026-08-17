import { useEffect, useState } from 'react';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { getFhirResource } from '../../../shared/utils/fhirResource';
import { useRecordChangeTick } from '../../../shared/utils/recordChangeSignal';
import {
  ClinicalTimelineData,
  DurationItem,
  MarkerItem,
  SeriesPoint,
  TimelineLane,
} from './types';

// ---- Minimal FHIR shapes we actually read --------------------------------

interface Coding {
  code?: string;
  display?: string;
  system?: string;
}
interface CodeableConcept {
  text?: string;
  coding?: Coding[];
}
interface Quantity {
  value?: number;
  unit?: string;
}
interface ReferenceRange {
  low?: Quantity;
  high?: Quantity;
  text?: string;
}
interface ObsComponent {
  code?: CodeableConcept;
  valueQuantity?: Quantity;
}
interface FhirObservation {
  resourceType?: string;
  status?: string;
  code?: CodeableConcept;
  category?: CodeableConcept[] | CodeableConcept;
  effectiveDateTime?: string;
  effectivePeriod?: { start?: string; end?: string };
  issued?: string;
  valueQuantity?: Quantity;
  interpretation?: CodeableConcept[] | CodeableConcept;
  referenceRange?: ReferenceRange[];
  component?: ObsComponent[];
  dataAbsentReason?: CodeableConcept;
}
interface FhirMedication {
  resourceType?: string;
  medicationCodeableConcept?: CodeableConcept;
  status?: string;
  effectivePeriod?: { start?: string; end?: string };
  effectiveDateTime?: string;
  authoredOn?: string;
  dateAsserted?: string;
}
interface FhirCondition {
  code?: CodeableConcept;
  clinicalStatus?: CodeableConcept;
  onsetDateTime?: string;
  abatementDateTime?: string;
  recordedDate?: string;
}
interface FhirEncounter {
  type?: CodeableConcept[];
  class?: Coding;
  period?: { start?: string; end?: string };
  reasonCode?: CodeableConcept[];
}

// ---- Helpers --------------------------------------------------------------

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function toEpoch(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const ms = new Date(date).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

function conceptName(concept: CodeableConcept | undefined): string | undefined {
  if (!concept) return undefined;
  return (
    concept.text ||
    concept.coding?.map((c) => c.display).find(Boolean) ||
    undefined
  );
}

function isVitalSign(resource: FhirObservation): boolean {
  return asArray(resource.category).some((category) =>
    (category.coding || []).some((coding) => coding.code === 'vital-signs'),
  );
}

function isLaboratory(resource: FhirObservation): boolean {
  return asArray(resource.category).some((category) => {
    const text = String(category.text || '').toLowerCase();
    const codes = (category.coding || []).map((coding) =>
      String(coding.code || coding.display || '').toLowerCase(),
    );
    return (
      text.includes('lab') ||
      codes.includes('laboratory') ||
      codes.includes('lab')
    );
  });
}

const ABNORMAL_CODES = new Set([
  'h',
  'hh',
  'l',
  'll',
  'a',
  'aa',
  'high',
  'low',
  'abnormal',
  'critical',
  '>',
  '<',
]);

function isAbnormal(
  resource: FhirObservation,
  value: number | undefined,
  refLow: number | undefined,
  refHigh: number | undefined,
): boolean {
  const flagged = asArray(resource.interpretation).some(
    (concept) =>
      (concept.coding || []).some((coding) =>
        ABNORMAL_CODES.has(String(coding.code || '').toLowerCase()),
      ) || ABNORMAL_CODES.has(String(concept.text || '').toLowerCase()),
  );
  if (flagged) return true;
  if (value === undefined) return false;
  if (refLow !== undefined && value < refLow) return true;
  if (refHigh !== undefined && value > refHigh) return true;
  return false;
}

/** Working accumulator for a series (lab/vital) lane being assembled. */
interface SeriesBuilder {
  id: string;
  title: string;
  category: 'labs' | 'vitals';
  unit?: string;
  refLow?: number;
  refHigh?: number;
  points: SeriesPoint[];
  missingDates: number[];
}

function getBuilder(
  map: Map<string, SeriesBuilder>,
  key: string,
  title: string,
  category: 'labs' | 'vitals',
): SeriesBuilder {
  let builder = map.get(key);
  if (!builder) {
    builder = {
      id: `${category}-${key}`,
      title,
      category,
      points: [],
      missingDates: [],
    };
    map.set(key, builder);
  }
  return builder;
}

function pushSeriesLane(
  map: Map<string, SeriesBuilder>,
  key: string,
  title: string,
  category: 'labs' | 'vitals',
  t: number,
  value: number,
  unit: string | undefined,
  abnormal: boolean,
  refLow: number | undefined,
  refHigh: number | undefined,
  amended: boolean,
) {
  const builder = getBuilder(map, key, title, category);
  if (unit && !builder.unit) builder.unit = unit;
  if (refLow !== undefined && builder.refLow === undefined)
    builder.refLow = refLow;
  if (refHigh !== undefined && builder.refHigh === undefined)
    builder.refHigh = refHigh;
  builder.points.push({
    t,
    value,
    display: unit ? `${value} ${unit}` : `${value}`,
    abnormal,
    amended: amended || undefined,
  });
}

/** Heuristic lab sub-grouping for the picker, from the analyte name. */
function deriveLabGroup(name: string): string {
  const n = name.toLowerCase();
  const has = (...words: string[]) => words.some((w) => n.includes(w));
  if (
    has(
      'hemoglobin',
      'hematocrit',
      'leukocyte',
      'platelet',
      'erythrocyte',
      'wbc',
      'rbc',
      'mcv',
      'mch',
      'neutrophil',
      'lymphocyte',
      'monocyte',
      'eosinophil',
      'basophil',
    )
  )
    return 'Hematology';
  if (has('cholesterol', 'hdl', 'ldl', 'triglyceride', 'lipid'))
    return 'Lipids';
  if (
    has(
      'alanine',
      'aspartate',
      'alkaline phosphatase',
      'bilirubin',
      'albumin',
      'globulin',
      'protein',
      'a/g',
      ' alt',
      ' ast',
      'ggt',
    )
  )
    return 'Liver';
  if (
    has(
      'creatinine',
      'urea',
      'egfr',
      'e-gfr',
      'gfr',
      'sodium',
      'potassium',
      'chloride',
      'bicarbonate',
      'calcium',
      'phosph',
      'magnesium',
    )
  )
    return 'Renal & Electrolytes';
  if (has('glucose', 'a1c', 'hba1c', 'insulin', 'tsh', 'thyroid', 'cortisol'))
    return 'Endocrine';
  return 'Other';
}

// BP component LOINCs.
const SYSTOLIC = '8480-6';
const DIASTOLIC = '8462-4';

// ---- Hook -----------------------------------------------------------------

export function useClinicalTimelineData(): ClinicalTimelineData {
  const db = useRxDb();
  const user = useUser();
  // Refetch when records land — a portal sync or an .emrpkg import
  // writes straight to the collection, and this page reads it once.
  const recordChangeTick = useRecordChangeTick();
  const [data, setData] = useState<ClinicalTimelineData>({
    lanes: [],
    allTimestamps: [],
    extent: null,
    status: 'loading',
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      setData((prev) => ({ ...prev, status: 'loading' }));

      const [obsDocs, medDocs, conditionDocs, encounterDocs] =
        await Promise.all([
          db.clinical_documents
            .find({
              selector: {
                user_id: user.id,
                'data_record.resource_type': 'observation',
              },
            })
            .exec(),
          db.clinical_documents
            .find({
              selector: {
                user_id: user.id,
                'data_record.resource_type': {
                  $in: [
                    'medicationstatement',
                    'medicationrequest',
                    'medication',
                  ],
                },
              },
            })
            .exec(),
          db.clinical_documents
            .find({
              selector: {
                user_id: user.id,
                'data_record.resource_type': 'condition',
              },
            })
            .exec(),
          db.clinical_documents
            .find({
              selector: {
                user_id: user.id,
                'data_record.resource_type': 'encounter',
              },
            })
            .exec(),
        ]);

      if (!mounted) return;

      const labMap = new Map<string, SeriesBuilder>();
      const vitalMap = new Map<string, SeriesBuilder>();

      for (const doc of obsDocs) {
        const d = doc.toMutableJSON() as ClinicalDocument;
        const resource = getFhirResource<FhirObservation>(d);
        const t =
          toEpoch(resource.effectiveDateTime) ??
          toEpoch(resource.effectivePeriod?.start) ??
          toEpoch(resource.issued) ??
          toEpoch(d.metadata?.date);
        if (t === undefined) continue;

        const vital = isVitalSign(resource);
        const lab = isLaboratory(resource);
        if (!vital && !lab) continue;

        const name =
          conceptName(resource.code) || d.metadata?.display_name || 'Result';
        const loinc = resource.code?.coding?.map((c) => c.code).find(Boolean);
        const range = (resource.referenceRange || []).find(
          (r) => r.low?.value !== undefined || r.high?.value !== undefined,
        );
        const refLow = range?.low?.value;
        const refHigh = range?.high?.value;
        const key = (loinc || name).toLowerCase();
        const status = String(resource.status || '').toLowerCase();
        const amended = status === 'amended' || status === 'corrected';
        const isMissing =
          status === 'cancelled' ||
          status === 'entered-in-error' ||
          resource.dataAbsentReason !== undefined;

        // Blood pressure → split into systolic / diastolic lanes.
        const components = resource.component || [];
        const systolic = components.find((c) =>
          (c.code?.coding || []).some((coding) => coding.code === SYSTOLIC),
        )?.valueQuantity;
        const diastolic = components.find((c) =>
          (c.code?.coding || []).some((coding) => coding.code === DIASTOLIC),
        )?.valueQuantity;

        if (
          vital &&
          (systolic?.value !== undefined || diastolic?.value !== undefined)
        ) {
          if (systolic?.value !== undefined) {
            pushSeriesLane(
              vitalMap,
              'bp-systolic',
              'Systolic Blood Pressure',
              'vitals',
              t,
              systolic.value,
              systolic.unit || 'mmHg',
              false,
              undefined,
              undefined,
              amended,
            );
          }
          if (diastolic?.value !== undefined) {
            pushSeriesLane(
              vitalMap,
              'bp-diastolic',
              'Diastolic Blood Pressure',
              'vitals',
              t,
              diastolic.value,
              diastolic.unit || 'mmHg',
              false,
              undefined,
              undefined,
              amended,
            );
          }
          continue;
        }

        // Cancelled / not-available result → record as a "missing" mark.
        if (isMissing) {
          getBuilder(
            vital ? vitalMap : labMap,
            key,
            name,
            vital ? 'vitals' : 'labs',
          ).missingDates.push(t);
          continue;
        }

        const value = resource.valueQuantity?.value;
        if (value === undefined) continue;
        const unit = resource.valueQuantity?.unit;
        const abnormal = isAbnormal(resource, value, refLow, refHigh);
        pushSeriesLane(
          vital ? vitalMap : labMap,
          key,
          name,
          vital ? 'vitals' : 'labs',
          t,
          value,
          unit,
          abnormal,
          refLow,
          refHigh,
          amended,
        );
      }

      const lanes: TimelineLane[] = [];

      const finalizeSeries = (map: Map<string, SeriesBuilder>) => {
        for (const builder of map.values()) {
          if (builder.points.length === 0) continue;
          builder.points.sort((a, b) => a.t - b.t);
          lanes.push({
            id: builder.id,
            title: builder.title,
            subtitle: builder.unit,
            kind: 'series',
            category: builder.category,
            series: builder.points,
            refLow: builder.refLow,
            refHigh: builder.refHigh,
            unit: builder.unit,
            missingDates: builder.missingDates.length
              ? builder.missingDates
              : undefined,
            labGroup:
              builder.category === 'labs'
                ? deriveLabGroup(builder.title)
                : undefined,
          });
        }
      };
      finalizeSeries(labMap);
      finalizeSeries(vitalMap);

      // Medications → a single duration lane.
      const medItems: DurationItem[] = [];
      for (const doc of medDocs) {
        const d = doc.toMutableJSON() as ClinicalDocument;
        const resource = getFhirResource<FhirMedication>(d);
        const name =
          conceptName(resource.medicationCodeableConcept) ||
          d.metadata?.display_name ||
          'Medication';
        const start =
          toEpoch(resource.effectivePeriod?.start) ??
          toEpoch(resource.effectiveDateTime) ??
          toEpoch(resource.authoredOn) ??
          toEpoch(resource.dateAsserted) ??
          toEpoch(d.metadata?.date);
        if (start === undefined) continue;
        const end = toEpoch(resource.effectivePeriod?.end);
        const ongoing =
          end === undefined &&
          String(resource.status || '').toLowerCase() === 'active';
        medItems.push({
          start,
          end: end ?? start,
          label: name,
          ongoing,
          detail: resource.status ? `Status: ${resource.status}` : undefined,
        });
      }
      if (medItems.length > 0) {
        medItems.sort((a, b) => a.start - b.start);
        lanes.push({
          id: 'medications',
          title: 'Medications',
          subtitle: `${medItems.length} medication${medItems.length === 1 ? '' : 's'}`,
          kind: 'duration',
          category: 'medications',
          durations: medItems,
        });
      }

      // Conditions → a single duration lane (onset → abatement, else a point).
      const conditionItems: DurationItem[] = [];
      for (const doc of conditionDocs) {
        const d = doc.toMutableJSON() as ClinicalDocument;
        const resource = getFhirResource<FhirCondition>(d);
        const name =
          conceptName(resource.code) || d.metadata?.display_name || 'Condition';
        const start =
          toEpoch(resource.onsetDateTime) ??
          toEpoch(resource.recordedDate) ??
          toEpoch(d.metadata?.date);
        if (start === undefined) continue;
        const end = toEpoch(resource.abatementDateTime);
        const status = conceptName(resource.clinicalStatus);
        const ongoing =
          end === undefined &&
          (status === undefined || status.toLowerCase() === 'active');
        conditionItems.push({
          start,
          end: end ?? start,
          label: name,
          ongoing,
          detail: status ? `Status: ${status}` : undefined,
        });
      }
      if (conditionItems.length > 0) {
        conditionItems.sort((a, b) => a.start - b.start);
        lanes.push({
          id: 'conditions',
          title: 'Conditions',
          subtitle: `${conditionItems.length} condition${conditionItems.length === 1 ? '' : 's'}`,
          kind: 'duration',
          category: 'conditions',
          durations: conditionItems,
        });
      }

      // Encounters → a single marker lane.
      const encounterItems: MarkerItem[] = [];
      for (const doc of encounterDocs) {
        const d = doc.toMutableJSON() as ClinicalDocument;
        const resource = getFhirResource<FhirEncounter>(d);
        const t = toEpoch(resource.period?.start) ?? toEpoch(d.metadata?.date);
        if (t === undefined) continue;
        const label =
          conceptName(resource.type?.[0]) ||
          resource.class?.display ||
          d.metadata?.display_name ||
          'Encounter';
        const reason = conceptName(resource.reasonCode?.[0]);
        encounterItems.push({ t, label, detail: reason });
      }
      if (encounterItems.length > 0) {
        encounterItems.sort((a, b) => a.t - b.t);
        lanes.push({
          id: 'encounters',
          title: 'Encounters',
          subtitle: `${encounterItems.length} visit${encounterItems.length === 1 ? '' : 's'}`,
          kind: 'marker',
          category: 'encounters',
          markers: encounterItems,
        });
      }

      // Global timestamps + extent.
      const allTimestamps: number[] = [];
      for (const lane of lanes) {
        lane.series?.forEach((p) => allTimestamps.push(p.t));
        lane.missingDates?.forEach((t) => allTimestamps.push(t));
        lane.durations?.forEach((dItem) => {
          allTimestamps.push(dItem.start);
          allTimestamps.push(dItem.end);
        });
        lane.markers?.forEach((m) => allTimestamps.push(m.t));
      }
      const extent: [number, number] | null =
        allTimestamps.length > 0
          ? [Math.min(...allTimestamps), Math.max(...allTimestamps)]
          : null;

      // Flag "new" analytes — those whose first reading lands in the most
      // recent 15% of the record (i.e. a recently-introduced test).
      if (extent) {
        const [emin, emax] = extent;
        const spanMs = emax - emin;
        if (spanMs > 0) {
          for (const lane of lanes) {
            if (
              lane.kind === 'series' &&
              lane.series &&
              lane.series.length > 0
            ) {
              if (lane.series[0].t >= emin + spanMs * 0.85) lane.isNew = true;
            }
          }
        }
      }

      setData({ lanes, allTimestamps, extent, status: 'success' });
    }

    load();
    return () => {
      mounted = false;
    };
  }, [db, user.id, recordChangeTick]);

  return data;
}
