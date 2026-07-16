import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { getFhirResource } from '../../../shared/utils/fhirResource';
import { formatDisplayText } from '../../../shared/utils/StyleUtils';
import { formatLabValue } from '../../labs/utils/labFormatters';
import {
  getInterpretationText,
  getReferenceRangeString,
  isOutOfRangeResult,
} from '../../timeline/utils/fhirpathParsers';
import { PacketItem, PacketSections } from '../types';

type LooseCoding = {
  code?: string;
  display?: string;
};

type LooseConcept = {
  coding?: LooseCoding[];
  code?: string;
  display?: string;
  text?: string;
};

type LooseResource = {
  abatementDateTime?: string;
  clinicalStatus?: LooseConcept | string;
  code?: LooseConcept;
  criticality?: string;
  dosage?: { text?: string }[];
  dosageInstruction?: { text?: string }[];
  medicationCodeableConcept?: LooseConcept;
  medicationReference?: { display?: string };
  reaction?: { manifestation?: LooseConcept[] }[];
  status?: string;
  substance?: LooseConcept;
  verificationStatus?: LooseConcept | string;
};

type LabDocumentForFormatters = Parameters<typeof formatLabValue>[0];

const RECENT_LIMIT = 8;
const RESOURCE_TYPE_LABELS: Record<string, string> = {
  allergyintolerance: 'Allergy intolerance',
  diagnosticreport: 'Diagnostic report',
  documentreference: 'Document reference',
  documentreference_attachment: 'Document attachment',
  imagingstudy: 'Imaging study',
  medicationadministration: 'Medication administration',
  medicationdispense: 'Medication dispense',
  medicationorder: 'Medication order',
  medicationrequest: 'Medication request',
  medicationstatement: 'Medication statement',
  questionnaireresponse: 'Questionnaire response',
  servicerequest: 'Service request',
  visionprescription: 'Vision prescription',
};

export function buildPacket(documents: ClinicalDocument[]): PacketSections {
  const byType = (types: string[]) =>
    documents.filter((document) =>
      types.includes(document.data_record.resource_type),
    );

  const observationDocs = byType(['observation']);

  return {
    problems: byType(['condition'])
      .filter(isActive)
      .slice(0, RECENT_LIMIT)
      .map(conditionItem),
    medications: byType([
      'medicationstatement',
      'medicationrequest',
      'medicationorder',
      'medicationdispense',
      'medicationadministration',
    ])
      .filter(isActive)
      .slice(0, RECENT_LIMIT)
      .map(medicationItem),
    allergies: byType(['allergyintolerance'])
      .filter(isMeaningfulAllergy)
      .slice(0, RECENT_LIMIT)
      .map(allergyItem),
    labs: observationDocs
      .filter(isAbnormalLab)
      .slice(0, RECENT_LIMIT)
      .map(labItem),
    documents: byType(['documentreference', 'documentreference_attachment'])
      .slice(0, RECENT_LIMIT)
      .map(genericItem),
    imaging: byType(['imagingstudy', 'media'])
      .slice(0, RECENT_LIMIT)
      .map(genericItem),
    procedures: byType(['procedure']).slice(0, RECENT_LIMIT).map(genericItem),
  };
}

function conditionItem(document: ClinicalDocument): PacketItem {
  const resource = getFhirResource<LooseResource>(document);
  return {
    ...baseItem(document),
    title: displayName(document, resource.code?.text || 'Condition'),
    detail: [resource.clinicalStatus, resource.verificationStatus]
      .map(displayConcept)
      .filter(Boolean)
      .join(' | '),
  };
}

function medicationItem(document: ClinicalDocument): PacketItem {
  const resource = getFhirResource<LooseResource>(document);
  const dosage =
    resource.dosage?.[0]?.text || resource.dosageInstruction?.[0]?.text;
  return {
    ...baseItem(document),
    title: displayName(
      document,
      resource.medicationCodeableConcept?.text ||
        resource.medicationReference?.display ||
        'Medication',
    ),
    detail: [resource.status, dosage].filter(Boolean).join(' | '),
  };
}

function allergyItem(document: ClinicalDocument): PacketItem {
  const resource = getFhirResource<LooseResource>(document);
  return {
    ...baseItem(document),
    title: displayName(
      document,
      resource.substance?.text || resource.code?.text || 'Allergy',
    ),
    detail: [
      resource.criticality,
      resource.reaction?.[0]?.manifestation?.[0]?.text,
    ]
      .filter(Boolean)
      .join(' | '),
  };
}

function labItem(document: ClinicalDocument): PacketItem {
  const labDocument = document as LabDocumentForFormatters;
  const interpretation = getInterpretationText(labDocument);
  const referenceRange = getReferenceRangeString(labDocument);
  return {
    ...baseItem(document),
    title: displayName(document, 'Lab result'),
    detail: [
      formatLabValue(labDocument),
      interpretation,
      referenceRange ? `Reference: ${referenceRange}` : undefined,
    ]
      .filter(Boolean)
      .join(' | '),
  };
}

function genericItem(document: ClinicalDocument): PacketItem {
  return {
    ...baseItem(document),
    title: displayName(
      document,
      labelForType(document.data_record.resource_type),
    ),
    detail: labelForType(document.data_record.resource_type),
  };
}

function baseItem(document: ClinicalDocument): PacketItem {
  return {
    id: document.id,
    title: document.metadata?.display_name || document.id,
    date: formatDisplayDate(document.metadata?.date),
  };
}

function formatDisplayDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function displayName(document: ClinicalDocument, fallback: string) {
  const resource = getFhirResource<LooseResource>(document);
  return (
    document.metadata?.display_name ||
    resource.code?.text ||
    resource.code?.coding?.[0]?.display ||
    fallback
  );
}

function isActive(document: ClinicalDocument) {
  const resource = getFhirResource<LooseResource>(document);
  const statusText = [
    resource.status,
    displayConcept(resource.clinicalStatus),
    displayConcept(resource.verificationStatus),
  ]
    .join(' ')
    .toLowerCase();

  return !/\b(inactive|resolved|entered-in-error|stopped|completed|cancelled)\b/.test(
    statusText,
  );
}

function isAbnormalLab(document: ClinicalDocument) {
  const labDocument = document as LabDocumentForFormatters;
  const interpretation = String(
    getInterpretationText(labDocument) || '',
  ).toLowerCase();
  return (
    isOutOfRangeResult(labDocument) ||
    /\b(abnormal|high|low|critical|positive|detected)\b/.test(interpretation)
  );
}

function isMeaningfulAllergy(document: ClinicalDocument) {
  const resource = getFhirResource<LooseResource>(document);
  const title = displayName(
    document,
    resource.substance?.text || resource.code?.text || '',
  ).toLowerCase();

  return !/\b(no known allergies|not on file|unknown)\b/.test(title);
}

function displayConcept(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return formatDisplayText(value);
  if (!isLooseConcept(value)) return undefined;
  return formatDisplayText(
    value.text || value.coding?.[0]?.display || value.coding?.[0]?.code,
  );
}

function isLooseConcept(value: unknown): value is LooseConcept {
  return typeof value === 'object' && value !== null;
}

function labelForType(type: string) {
  if (RESOURCE_TYPE_LABELS[type]) return RESOURCE_TYPE_LABELS[type];

  return type
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split('_')
    .join(' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
