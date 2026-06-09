import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../../models/connection-document/ConnectionDocument.type';
import { getFhirResource } from '../../../shared/utils/fhirResource';
import { ConditionBundle, ConditionStatus, RelatedRecord } from '../types';
import { ConditionTopic, resolveConditionTopics } from './conditionTopics';
import {
  addressedConditionRefs,
  conceptCodes,
  firstText,
  summarizeRecord,
} from './recordSummary';

type FhirRecord = Record<string, unknown>;

export interface BundleInput {
  conditions: ClinicalDocument[];
  medications: ClinicalDocument[];
  observations: ClinicalDocument[];
  procedures: ClinicalDocument[];
  carePlans: ClinicalDocument[];
  goals: ClinicalDocument[];
  connectionsById: Map<string, ConnectionDocument>;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function conditionRefId(document: ClinicalDocument): string | undefined {
  const id = document.metadata?.id;
  return id?.match(/Condition\/(.+)$/)?.[1] || id;
}

function getConditionStatus(
  clinicalStatus: string | undefined,
  abatementDate: string | undefined,
): ConditionStatus {
  const normalized = clinicalStatus?.toLowerCase();
  if (abatementDate || normalized === 'resolved' || normalized === 'inactive') {
    return 'resolved';
  }
  if (
    normalized === 'active' ||
    normalized === 'recurrence' ||
    normalized === 'relapse'
  ) {
    return 'active';
  }
  return 'unknown';
}

function dateValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const period = value as FhirRecord;
    const start = period['start'];
    if (typeof start === 'string') return start;
  }
  return undefined;
}

function byDateDesc(a: RelatedRecord, b: RelatedRecord): number {
  return (b.date || '').localeCompare(a.date || '');
}

/** Build the per-condition pivot bundles from categorized clinical documents. */
export function buildConditionBundles(input: BundleInput): ConditionBundle[] {
  const { connectionsById } = input;

  // Pre-summarize candidate records once.
  const meds = input.medications.map((doc) => ({
    doc,
    summary: summarizeRecord(doc, 'medicationstatement'),
  }));
  const obs = input.observations.map((doc) => ({
    doc,
    summary: summarizeRecord(doc, 'observation'),
  }));
  const procs = input.procedures.map((doc) => ({
    doc,
    summary: summarizeRecord(doc, 'procedure'),
  }));

  return input.conditions.map((document) => {
    const resource = getFhirResource<FhirRecord>(document);
    const name =
      document.metadata?.display_name ||
      firstText(resource['code']) ||
      'Unnamed condition';
    const codes = conceptCodes(resource['code']);
    const clinicalStatus = firstText(resource['clinicalStatus']);
    const abatementDate = dateValue(
      resource['abatementDateTime'] || resource['abatementPeriod'],
    );
    const onsetDate = dateValue(
      resource['onsetDateTime'] || resource['onsetPeriod'],
    );
    const recordedDate =
      (typeof resource['recordedDate'] === 'string'
        ? (resource['recordedDate'] as string)
        : undefined) ||
      (typeof resource['dateRecorded'] === 'string'
        ? (resource['dateRecorded'] as string)
        : undefined) ||
      document.metadata?.date;

    const topics = resolveConditionTopics(codes, name);
    const refId = conditionRefId(document);
    const normalizedName = normalizeName(name);

    const related: RelatedRecord[] = [];
    const seen = new Set<string>();

    const add = (record: RelatedRecord) => {
      if (seen.has(record.document.id)) return;
      seen.add(record.document.id);
      related.push(record);
    };

    // 1. Explicit links: care plans / goals that address this condition.
    const matchesAddress = (doc: ClinicalDocument): boolean =>
      addressedConditionRefs(doc).some(
        (ref) =>
          (ref.id && refId && ref.id === refId) ||
          (ref.display && normalizeName(ref.display) === normalizedName),
      );

    input.carePlans.filter(matchesAddress).forEach((doc) => {
      const summary = summarizeRecord(doc, 'careplan');
      add({
        id: doc.id,
        document: doc,
        kind: 'careplan',
        name: summary.name === 'Untitled record' ? 'Care plan' : summary.name,
        date: summary.date,
        codes: summary.codes,
        reason: 'Care plan addresses this condition',
        confidence: 'linked',
      });
    });

    input.goals.filter(matchesAddress).forEach((doc) => {
      const summary = summarizeRecord(doc, 'goal');
      add({
        id: doc.id,
        document: doc,
        kind: 'goal',
        name: summary.name,
        date: summary.date,
        codes: summary.codes,
        reason: 'Goal set for this condition',
        confidence: 'linked',
      });
    });

    if (topics.length > 0) {
      const medKeywords = collect(topics, (t) => t.medKeywords);
      const labLoinc = new Set(collect(topics, (t) => t.labLoinc));
      const labKeywords = collect(topics, (t) => t.labKeywords);
      const procKeywords = collect(topics, (t) => t.procedureKeywords);
      const topicLabel = topics.map((t) => t.label).join(', ');

      // 2. Medications by name keyword.
      meds.forEach(({ doc, summary }) => {
        const lower = summary.name.toLowerCase();
        if (medKeywords.some((kw) => lower.includes(kw))) {
          add({
            id: doc.id,
            document: doc,
            kind: 'medication',
            name: summary.name,
            date: summary.date,
            codes: summary.codes,
            reason: `Commonly used for ${topicLabel}`,
            confidence: 'related',
          });
        }
      });

      // 3. Labs by LOINC or name keyword.
      obs.forEach(({ doc, summary }) => {
        const lower = summary.name.toLowerCase();
        const byLoinc = summary.loinc.some((code) => labLoinc.has(code));
        const byKeyword = labKeywords.some((kw) => lower.includes(kw));
        if (byLoinc || byKeyword) {
          add({
            id: doc.id,
            document: doc,
            kind: 'lab',
            name: summary.name,
            date: summary.date,
            codes: summary.codes,
            reason: `Related lab for ${topicLabel}`,
            confidence: 'related',
          });
        }
      });

      // 4. Procedures by name keyword.
      procs.forEach(({ doc, summary }) => {
        const lower = summary.name.toLowerCase();
        if (procKeywords.some((kw) => lower.includes(kw))) {
          add({
            id: doc.id,
            document: doc,
            kind: 'procedure',
            name: summary.name,
            date: summary.date,
            codes: summary.codes,
            reason: `Related procedure for ${topicLabel}`,
            confidence: 'related',
          });
        }
      });
    }

    related.sort(byDateDesc);

    return {
      id: document.id,
      document,
      name,
      status: getConditionStatus(clinicalStatus, abatementDate),
      codes,
      onsetDate,
      recordedDate,
      source:
        connectionsById.get(document.connection_record_id)?.name ||
        document.metadata?.source_name,
      topicLabels: topics.map((t) => t.label),
      related,
    };
  });
}

function collect(
  topics: ConditionTopic[],
  pick: (topic: ConditionTopic) => string[] | undefined,
): string[] {
  return Array.from(new Set(topics.flatMap((topic) => pick(topic) ?? []))).map(
    (value) => value.toLowerCase(),
  );
}
