import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../../models/connection-document/ConnectionDocument.type';
import { getFhirResource } from '../../../shared/utils/fhirResource';
import {
  ConditionBundle,
  ConditionNote,
  ConditionStatus,
  RelatedKind,
  RelatedRecord,
} from '../types';
import { ConditionTopic, resolveConditionTopics } from './conditionTopics';
import {
  addressedConditionRefs,
  conceptCodes,
  firstText,
  reasonConditionRefs,
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
  /** Referrals and orders (ServiceRequest). Optional so older callers keep working. */
  serviceRequests?: ClinicalDocument[];
  connectionsById: Map<string, ConnectionDocument>;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Every id a reference to this condition might use. Portal records keep
 * `Condition/{id}` in `metadata.id`; packaged records keep `manual:{id}` there
 * and the bare id on the resource — and a `reasonReference` written by the same
 * package says `Condition/{id}`. Matching on one form alone silently drops the
 * link.
 */
function conditionRefIds(
  document: ClinicalDocument,
  resource: FhirRecord,
): Set<string> {
  const ids = new Set<string>();
  const metaId = document.metadata?.id;
  if (metaId) {
    ids.add(metaId);
    const fromRef = metaId.match(/Condition\/(.+)$/)?.[1];
    if (fromRef) ids.add(fromRef);
    const fromManual = metaId.match(/^manual:(.+)$/)?.[1];
    if (fromManual) ids.add(fromManual);
  }
  if (typeof resource['id'] === 'string') ids.add(resource['id']);
  return ids;
}

function isCgmReading(document: ClinicalDocument): boolean {
  const category = getFhirResource<FhirRecord>(document)['category'];
  return firstText(category) === 'Continuous glucose monitoring';
}

function conditionNotes(resource: FhirRecord): ConditionNote[] {
  const notes = resource['note'];
  if (!Array.isArray(notes)) return [];
  return notes
    .filter((note): note is FhirRecord => typeof note === 'object' && !!note)
    .map((note) => {
      const authorRef = note['authorReference'];
      return {
        text: typeof note['text'] === 'string' ? note['text'] : '',
        author:
          (typeof note['authorString'] === 'string'
            ? note['authorString']
            : undefined) ||
          firstText(
            authorRef && typeof authorRef === 'object'
              ? (authorRef as FhirRecord)['display']
              : undefined,
          ),
        time: typeof note['time'] === 'string' ? note['time'] : undefined,
      };
    })
    .filter((note) => note.text.trim().length > 0);
}

function conditionAliases(resource: FhirRecord): string[] {
  const extensions = resource['extension'];
  if (!Array.isArray(extensions)) return [];
  return extensions
    .filter(
      (ext): ext is FhirRecord =>
        typeof ext === 'object' &&
        !!ext &&
        String((ext as FhirRecord)['url'] || '').endsWith('/condition-alias'),
    )
    .map((ext) => ext['valueString'])
    .filter((value): value is string => typeof value === 'string');
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
  // Individual CGM readings are thousands of points of one series; the Labs
  // page charts them. Listing each under "Type 2 diabetes" buried the
  // condition's real results (and its AGP summary) under 3,000 glucose rows.
  const obs = input.observations
    .filter((doc) => !isCgmReading(doc))
    .map((doc) => ({
      doc,
      summary: summarizeRecord(doc, 'observation'),
    }));
  const procs = input.procedures.map((doc) => ({
    doc,
    summary: summarizeRecord(doc, 'procedure'),
  }));
  const referrals = (input.serviceRequests ?? []).map((doc) => ({
    doc,
    summary: summarizeRecord(doc, 'servicerequest'),
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
    const refIds = conditionRefIds(document, resource);
    const aliases = conditionAliases(resource);
    const names = new Set(
      [name, ...aliases].map(normalizeName).filter(Boolean),
    );

    const related: RelatedRecord[] = [];
    const seen = new Set<string>();

    const add = (record: RelatedRecord) => {
      if (seen.has(record.document.id)) return;
      seen.add(record.document.id);
      related.push(record);
    };

    // 1. Explicit links: care plans / goals that address this condition.
    const matchesRef = (ref: { id?: string; display?: string }) =>
      (ref.id && refIds.has(ref.id)) ||
      (ref.display && names.has(normalizeName(ref.display)));
    const matchesAddress = (doc: ClinicalDocument): boolean =>
      addressedConditionRefs(doc).some(matchesRef);
    const matchesReason = (doc: ClinicalDocument): boolean =>
      reasonConditionRefs(doc).some(matchesRef);

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

    // 1b. Explicit links: medications, procedures and referrals whose
    // reasonReference names this condition.
    const linkByReason = (
      candidates: {
        doc: ClinicalDocument;
        summary: ReturnType<typeof summarizeRecord>;
      }[],
      kind: RelatedKind,
      reason: string,
    ) =>
      candidates
        .filter(({ doc }) => matchesReason(doc))
        .forEach(({ doc, summary }) =>
          add({
            id: doc.id,
            document: doc,
            kind,
            name: summary.name,
            date: summary.date,
            codes: summary.codes,
            reason,
            confidence: 'linked',
          }),
        );
    linkByReason(meds, 'medication', 'Prescribed for this condition');
    linkByReason(procs, 'procedure', 'Performed for this condition');
    linkByReason(referrals, 'referral', 'Follow-up for this condition');

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
      aliases,
      notes: conditionNotes(resource),
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
