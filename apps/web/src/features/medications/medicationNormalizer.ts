import {
  MedicationAdherence,
  MedicationCategory,
  MedicationCode,
  MedicationHistoryEvent,
  MedicationHistoryEventType,
  MedicationReconciliationState,
  MedicationResourceType,
  MedicationSource,
  MedicationTimelineItem,
  MedicationTimelineStatus,
} from './types';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

type AnyRecord = any;

const RXNORM_SYSTEM = 'http://www.nlm.nih.gov/research/umls/rxnorm';

const MEDICATION_RESOURCE_TYPES: MedicationResourceType[] = [
  'MedicationStatement',
  'MedicationRequest',
  'MedicationOrder',
  'MedicationDispense',
  'MedicationAdministration',
];

export function isMedicationClinicalDocument(document: ClinicalDocument) {
  const resourceType = getMedicationResourceType(document);
  return resourceType !== undefined;
}

export function normalizeMedicationDocuments(
  documents: ClinicalDocument[],
): MedicationTimelineItem[] {
  return documents
    .map((document) => normalizeMedicationDocument(document))
    .filter((item): item is MedicationTimelineItem => Boolean(item))
    .sort(compareMedicationTimelineItems);
}

export function normalizeMedicationDocument(
  document: ClinicalDocument,
): MedicationTimelineItem | undefined {
  const resource = getResource(document);
  const resourceType = getMedicationResourceType(document, resource);

  if (!resourceType) return undefined;

  const codes = getMedicationCodes(resource);
  const notes = getNotes(resource);
  const sourceExcerpts = getSourceExcerpts(document, resource, notes);
  const status = normalizeStatus(resourceType, getRawStatus(resource));
  const startDate = getStartDate(document, resource);
  const stopDate = getStopDate(resource, status);
  const category = getCategory(resource);
  const adherence = getAdherence(resource, notes);
  const source = getSource(document, resource);

  const item: MedicationTimelineItem = {
    id: document.id,
    resourceType,
    document,
    name: getMedicationName(document, resource, codes),
    rxNorm: codes.find((code) => isRxNormSystem(code.system)),
    codes,
    status,
    rawStatus: getRawStatus(resource),
    category,
    dose: getDose(resource),
    route: getRoute(resource),
    frequency: getFrequency(resource),
    startDate,
    stopDate,
    stopReason: getStopReason(resource, notes),
    conditionReason: getConditionReason(resource),
    source,
    adherence,
    conditionalInstructions: getConditionalInstructions(resource, notes),
    notes,
    sourceExcerpts,
    history: getHistory(resourceType, resource, {
      status,
      startDate,
      stopDate,
      source,
      notes,
    }),
    reconciliationState: getReconciliationState(status, adherence, notes),
  };

  return item;
}

export function getMedicationResourceType(
  document: ClinicalDocument,
  resource = getResource(document),
): MedicationResourceType | undefined {
  const rawResourceType =
    resource?.resourceType || document.data_record?.resource_type;
  const normalized = String(rawResourceType || '').toLowerCase();

  return MEDICATION_RESOURCE_TYPES.find(
    (type) => type.toLowerCase() === normalized,
  );
}

function getResource(document: ClinicalDocument): AnyRecord {
  const raw = document.data_record?.raw as AnyRecord | undefined;
  return raw?.resource || raw || {};
}

function getMedicationName(
  document: ClinicalDocument,
  resource: AnyRecord,
  codes: MedicationCode[],
) {
  return (
    document.metadata?.display_name ||
    resource.medicationCodeableConcept?.text ||
    resource.medicationCodeableConcept?.coding?.[0]?.display ||
    resource.medicationReference?.display ||
    resource.medication?.display ||
    resource.medication?.text ||
    resource.contained?.find?.(
      (contained: AnyRecord) => contained?.resourceType === 'Medication',
    )?.code?.text ||
    codes.find((code) => code.display)?.display ||
    'Medication'
  );
}

function getMedicationCodes(resource: AnyRecord): MedicationCode[] {
  const codeableConcepts = [
    resource.medicationCodeableConcept,
    resource.medication,
    resource.contained?.find?.(
      (contained: AnyRecord) => contained?.resourceType === 'Medication',
    )?.code,
  ].filter(Boolean);

  return uniqueCodes(
    codeableConcepts.flatMap((concept) =>
      (concept.coding || []).map((coding: AnyRecord) => ({
        system: coding.system,
        code: coding.code,
        display: coding.display,
      })),
    ),
  );
}

function uniqueCodes(codes: MedicationCode[]) {
  const seen = new Set<string>();
  return codes.filter((code) => {
    const key = [code.system, code.code, code.display].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(code.system || code.code || code.display);
  });
}

function normalizeStatus(
  resourceType: MedicationResourceType,
  status?: string,
): MedicationTimelineStatus {
  const normalized = String(status || '').toLowerCase();

  if (
    [
      'active',
      'on-hold',
      'stopped',
      'completed',
      'entered-in-error',
      'unknown',
    ].includes(normalized)
  ) {
    return normalized as MedicationTimelineStatus;
  }

  if (['draft', 'requested', 'intended', 'planned'].includes(normalized)) {
    return 'intended';
  }

  if (['cancelled', 'ended'].includes(normalized)) return 'stopped';
  if (['in-progress', 'not-taken'].includes(normalized)) return 'active';
  if (resourceType === 'MedicationRequest' || resourceType === 'MedicationOrder') {
    return normalized ? 'intended' : 'unknown';
  }

  return 'unknown';
}

function getRawStatus(resource: AnyRecord): string | undefined {
  return resource.status || resource.statusReason?.text;
}

function getCategory(resource: AnyRecord): MedicationCategory {
  const text = [
    resource.category?.text,
    resource.medication_category,
    resource.medicationCodeableConcept?.text,
    resource.medicationCodeableConcept?.coding?.[0]?.display,
    ...getNotes(resource),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\b(vitamin|b12|d3|folate|folic acid|thiamine|riboflavin)\b/.test(text)) {
    return 'vitamin';
  }
  if (/\b(supplement|magnesium|omega-?3|fish oil|zinc|calcium)\b/.test(text)) {
    return 'supplement';
  }
  if (/\b(herbal|turmeric|curcumin|ashwagandha|ginseng)\b/.test(text)) {
    return 'herbal';
  }
  if (/\b(otc|over the counter|non-prescription)\b/.test(text)) return 'otc';
  if (resource.medicationCodeableConcept || resource.medicationReference) {
    return 'prescription';
  }

  return 'unknown';
}

function getDose(resource: AnyRecord): string | undefined {
  const dosage = getPrimaryDosage(resource);
  const doseAndRate = dosage?.doseAndRate?.[0];
  const dose = doseAndRate?.doseQuantity || doseAndRate?.doseRange;

  if (dosage?.text) return dosage.text;
  if (dose?.value !== undefined) {
    return [dose.value, dose.unit || dose.code].filter(Boolean).join(' ');
  }
  if (dose?.low || dose?.high) {
    return [formatQuantity(dose.low), formatQuantity(dose.high)]
      .filter(Boolean)
      .join(' - ');
  }
  if (dosage?.doseQuantity?.value !== undefined) {
    return formatQuantity(dosage.doseQuantity);
  }

  return undefined;
}

function getRoute(resource: AnyRecord): string | undefined {
  const route = getPrimaryDosage(resource)?.route;
  return route?.text || route?.coding?.[0]?.display || route?.coding?.[0]?.code;
}

function getFrequency(resource: AnyRecord): string | undefined {
  const timing = getPrimaryDosage(resource)?.timing;
  const repeat = timing?.repeat;

  return (
    timing?.code?.text ||
    timing?.code?.coding?.[0]?.display ||
    repeat?.boundsPeriod?.start ||
    formatRepeat(repeat)
  );
}

function getPrimaryDosage(resource: AnyRecord): AnyRecord | undefined {
  if (Array.isArray(resource.dosageInstruction)) {
    return resource.dosageInstruction[0];
  }
  if (Array.isArray(resource.dosage)) {
    return resource.dosage[0];
  }
  if (resource.dosage) {
    return resource.dosage;
  }
  return undefined;
}

function formatRepeat(repeat?: AnyRecord): string | undefined {
  if (!repeat) return undefined;
  if (repeat.frequency && repeat.period && repeat.periodUnit) {
    return `${repeat.frequency} every ${repeat.period} ${repeat.periodUnit}`;
  }
  if (repeat.frequency) return `${repeat.frequency} times`;
  return undefined;
}

function getStartDate(
  document: ClinicalDocument,
  resource: AnyRecord,
): string | undefined {
  return (
    resource.effectiveDateTime ||
    resource.effectivePeriod?.start ||
    resource.authoredOn ||
    resource.dateWritten ||
    resource.whenHandedOver ||
    resource.whenPrepared ||
    resource.occurrenceDateTime ||
    resource.occurrencePeriod?.start ||
    resource.performedDateTime ||
    resource.performedPeriod?.start ||
    document.metadata?.date
  );
}

function getStopDate(
  resource: AnyRecord,
  status: MedicationTimelineStatus,
): string | undefined {
  return (
    resource.effectivePeriod?.end ||
    resource.occurrencePeriod?.end ||
    resource.performedPeriod?.end ||
    (['stopped', 'completed', 'entered-in-error'].includes(status)
      ? resource.dateAsserted || resource.authoredOn
      : undefined)
  );
}

function getStopReason(
  resource: AnyRecord,
  notes: string[],
): string | undefined {
  return (
    getCodeableConceptText(resource.statusReason) ||
    getCodeableConceptText(resource.reasonEnded) ||
    notes.find((note) => /\b(stop|stopped|discontinue|discontinued)\b/i.test(note))
  );
}

function getConditionReason(resource: AnyRecord): string | undefined {
  return (
    getCodeableConceptText(resource.reasonCode?.[0]) ||
    resource.reasonReference?.[0]?.display ||
    getCodeableConceptText(resource.indication?.[0]) ||
    resource.reasonForUseReference?.[0]?.display
  );
}

function getSource(document: ClinicalDocument, resource: AnyRecord): MedicationSource {
  const label =
    resource.informationSource?.display ||
    resource.recorder?.display ||
    resource.requester?.display ||
    resource.performer?.[0]?.actor?.display ||
    resource.performer?.display ||
    resource.dispenser?.display ||
    (document.metadata as AnyRecord)?.source ||
    document.connection_record_id;

  return {
    label,
    type: inferSourceType(resource, label),
    connectionId: document.connection_record_id,
    documentId: document.id,
  };
}

function inferSourceType(
  resource: AnyRecord,
  label?: string,
): MedicationSource['type'] {
  const text = [label, resource.informationSource?.display, resource.recorder?.display]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\b(patient|self|reported)\b/.test(text)) return 'patient-reported';
  if (/\b(pharmacy|dispense|dispenser)\b/.test(text)) return 'pharmacy';
  if (resource.resourceType === 'MedicationDispense') return 'pharmacy';
  if (resource.resourceType === 'MedicationAdministration') return 'clinician';
  if (text) return 'clinician';
  return 'imported-record';
}

function getAdherence(
  resource: AnyRecord,
  notes: string[],
): MedicationAdherence {
  const wasNotTaken = resource.wasNotTaken;
  const taken = resource.taken;
  const text = notes.join(' ').toLowerCase();

  if (wasNotTaken === true || taken === 'n' || /\b(not taking|not taken)\b/.test(text)) {
    return 'not-taking';
  }
  if (/\b(taking differently|different than prescribed|changed dose)\b/.test(text)) {
    return 'taking-differently';
  }
  if (taken === 'y' || /\b(taking as prescribed|as prescribed)\b/.test(text)) {
    return 'taking-as-prescribed';
  }

  return 'unknown';
}

function getConditionalInstructions(
  resource: AnyRecord,
  notes: string[],
): string | undefined {
  const candidates = [
    resource.substitution?.reason?.text,
    getPrimaryDosage(resource)?.patientInstruction,
    getPrimaryDosage(resource)?.additionalInstruction?.[0]?.text,
    ...notes,
  ].filter(Boolean);

  return candidates.find((text) =>
    /\b(after|before|when|if|unless|conditional|start)\b/i.test(text),
  );
}

function getNotes(resource: AnyRecord): string[] {
  const notes = [
    ...(resource.note || []).map((note: AnyRecord) => note.text),
    resource.text?.div,
    resource.patientInstruction,
    resource.comment,
  ];

  return notes.filter((note): note is string => Boolean(note));
}

function getSourceExcerpts(
  document: ClinicalDocument,
  resource: AnyRecord,
  notes: string[],
): string[] {
  return [
    document.metadata?.display_name,
    getPrimaryDosage(resource)?.text,
    ...notes,
  ].filter((excerpt): excerpt is string => Boolean(excerpt));
}

function getHistory(
  resourceType: MedicationResourceType,
  resource: AnyRecord,
  context: {
    status: MedicationTimelineStatus;
    startDate?: string;
    stopDate?: string;
    source: MedicationSource;
    notes: string[];
  },
): MedicationHistoryEvent[] {
  const events: MedicationHistoryEvent[] = [
    {
      type: getInitialHistoryType(resourceType),
      date: context.startDate,
      label: getInitialHistoryLabel(resourceType),
      source: context.source,
      notes: context.notes,
    },
  ];

  if (context.status === 'on-hold') {
    events.push({
      type: 'paused',
      date: context.stopDate || context.startDate,
      label: 'Paused or on hold',
      source: context.source,
    });
  }

  if (['stopped', 'completed', 'entered-in-error'].includes(context.status)) {
    events.push({
      type: 'stopped',
      date: context.stopDate || context.startDate,
      label: context.status === 'completed' ? 'Completed' : 'Stopped',
      source: context.source,
    });
  }

  if (resource.dosageInstruction?.length > 1 || resource.dosage?.length > 1) {
    events.push({
      type: 'dose-changed',
      date: context.startDate,
      label: 'Multiple dosage instructions recorded',
      source: context.source,
    });
  }

  return events;
}

function getInitialHistoryType(
  resourceType: MedicationResourceType,
): MedicationHistoryEventType {
  switch (resourceType) {
    case 'MedicationRequest':
    case 'MedicationOrder':
      return 'prescribed';
    case 'MedicationDispense':
      return 'dispensed';
    case 'MedicationAdministration':
      return 'administered';
    case 'MedicationStatement':
      return 'patient-reported';
    default:
      return 'source-imported';
  }
}

function getInitialHistoryLabel(resourceType: MedicationResourceType): string {
  switch (resourceType) {
    case 'MedicationRequest':
    case 'MedicationOrder':
      return 'Prescribed or ordered';
    case 'MedicationDispense':
      return 'Dispensed';
    case 'MedicationAdministration':
      return 'Administered';
    case 'MedicationStatement':
      return 'Medication statement recorded';
    default:
      return 'Imported';
  }
}

function getReconciliationState(
  status: MedicationTimelineStatus,
  adherence: MedicationAdherence,
  notes: string[],
): MedicationReconciliationState {
  const text = notes.join(' ').toLowerCase();

  if (adherence === 'not-taking') return 'patient-says-not-taking';
  if (/\b(conflict|conflicting|discrepancy|duplicate)\b/.test(text)) {
    return 'conflicting-sources';
  }
  if (/\b(verified|reconciled|confirmed)\b/.test(text)) return 'verified';
  if (status === 'unknown' || adherence === 'unknown') return 'needs-review';
  return 'unknown';
}

function getCodeableConceptText(concept?: AnyRecord): string | undefined {
  return concept?.text || concept?.coding?.[0]?.display || concept?.coding?.[0]?.code;
}

function formatQuantity(quantity?: AnyRecord): string | undefined {
  if (!quantity || quantity.value === undefined) return undefined;
  return [quantity.value, quantity.unit || quantity.code].filter(Boolean).join(' ');
}

function isRxNormSystem(system?: string) {
  return String(system || '').toLowerCase() === RXNORM_SYSTEM;
}

function compareMedicationTimelineItems(
  left: MedicationTimelineItem,
  right: MedicationTimelineItem,
) {
  const leftDate = left.startDate || left.stopDate || '';
  const rightDate = right.startDate || right.stopDate || '';
  return rightDate.localeCompare(leftDate);
}
