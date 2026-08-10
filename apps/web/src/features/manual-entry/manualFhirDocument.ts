import uuid4 from '../../shared/utils/UUIDUtils';
import {
  ClinicalDocument,
  ClinicalDocumentResourceType,
} from '../../models/clinical-document/ClinicalDocument.type';
import {
  ManualObservationAbsentReason,
  ManualObservationComparator,
  ManualObservationValueKind,
  TerminologyEntry,
} from './clinicalTerminology';
import { ClinicalManualRecordKind } from './manualRecordTypes';
import {
  ManualImagingDetails,
  ManualSpecialtyDetails,
} from './manualSpecialtyDetails';

function buildVisionLensSpecification(details?: ManualSpecialtyDetails) {
  if (!details) return undefined;
  const lenses = [
    {
      eye: 'right',
      sphere: details.odSphere,
      cylinder: details.odCylinder,
      axis: details.odAxis,
      add: details.odAdd,
    },
    {
      eye: 'left',
      sphere: details.osSphere,
      cylinder: details.osCylinder,
      axis: details.osAxis,
      add: details.osAdd,
    },
  ]
    .map((lens) => ({
      eye: lens.eye,
      sphere: parseNumber(lens.sphere),
      cylinder: parseNumber(lens.cylinder),
      axis: parseNumber(lens.axis),
      add: parseNumber(lens.add),
    }))
    .filter(
      (lens) =>
        lens.sphere !== undefined ||
        lens.cylinder !== undefined ||
        lens.axis !== undefined ||
        lens.add !== undefined,
    );
  return lenses.length ? lenses : undefined;
}

function buildDentalBodySite(details?: ManualSpecialtyDetails) {
  if (details?.specialty !== 'dental') return undefined;
  const parts = [
    details.toothNumber && `tooth ${details.toothNumber}`,
    details.dentalTeeth && `teeth ${details.dentalTeeth}`,
    details.toothRange && `range ${details.toothRange}`,
    details.dentalQuadrant && `quadrant ${details.dentalQuadrant}`,
    details.dentalArch && `arch ${details.dentalArch}`,
    details.dentition && `dentition ${details.dentition}`,
    details.dentalSurfaces?.length &&
      `surfaces ${details.dentalSurfaces.join('/')}`,
  ].filter(Boolean);
  return parts.length ? [{ text: parts.join('; ') }] : undefined;
}

const OBSERVATION_CATEGORY_SYSTEM =
  'http://terminology.hl7.org/CodeSystem/observation-category';

// Every page that lists observations selects on this coding, never on our
// `manual_kind`: a hand-entered "Body weight 72 kg" carried no category at all,
// so it reached the Timeline and then no other page in the app — VitalsTab
// filters on `vital-signs`, and the results chart on `vital-signs`/`laboratory`.
const OBSERVATION_CATEGORIES: Partial<
  Record<ClinicalManualRecordKind, { code: string; display: string }>
> = {
  vital: { code: 'vital-signs', display: 'Vital Signs' },
  lab: { code: 'laboratory', display: 'Laboratory' },
  socialhistory: { code: 'social-history', display: 'Social History' },
};

function buildObservationCategory(
  recordType: ClinicalManualRecordKind,
  details?: ManualSpecialtyDetails,
) {
  const standard = OBSERVATION_CATEGORIES[recordType];
  // The specialty entry stays alongside the standard coding rather than
  // instead of it: the dental and optometry pages search the serialized
  // category, so dropping it would hide a tooth finding from its own tab.
  const categories = [
    standard && {
      text: standard.display,
      coding: [
        {
          system: OBSERVATION_CATEGORY_SYSTEM,
          code: standard.code,
          display: standard.display,
        },
      ],
    },
    details?.specialty && { text: details.specialty },
  ].filter(Boolean);
  return categories.length ? categories : undefined;
}

function parseNumber(value?: string) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildClinicalDocument({
  connectionId,
  userId,
  recordType,
  recordDate,
  title,
  notes,
  fileData,
  fileName,
  fileContentType,
  specialtyDetails,
  imagingDetails,
  observation,
  medication,
  coverage,
  familyRelationship,
  linkedDocumentId,
  linkedAttachmentId,
  terminology,
  loadedDocument,
}: {
  connectionId: string;
  userId: string;
  recordType: ClinicalManualRecordKind;
  recordDate: string;
  title: string;
  notes: string;
  fileData?: string;
  fileName: string;
  fileContentType: string;
  specialtyDetails?: ManualSpecialtyDetails;
  imagingDetails?: ManualImagingDetails;
  observation?: {
    valueKind: ManualObservationValueKind;
    comparator: string;
    value: string;
    unit: string;
    rangeLow: string;
    rangeHigh: string;
    rangeText: string;
    interpretation: string;
    absentReason: ManualObservationAbsentReason;
  };
  medication?: {
    dose: string;
    frequency: string;
    route: string;
  };
  coverage?: ManualCoverageInput;
  familyRelationship?: string;
  linkedDocumentId?: string;
  linkedAttachmentId?: string;
  terminology?: TerminologyEntry;
  loadedDocument?: ClinicalDocument | null;
}): ClinicalDocument {
  const nextRecordId =
    loadedDocument?.metadata?.id?.replace(/^manual:/, '') || uuid4();
  const resourceType = getClinicalResourceType(recordType);
  const raw =
    recordType === 'document'
      ? fileData || ''
      : buildManualFhirEntry(
          nextRecordId,
          recordType,
          title,
          notes,
          recordDate,
          observation,
          medication,
          terminology,
          specialtyDetails,
          coverage,
          familyRelationship,
        );

  return {
    id: loadedDocument?.id || '',
    connection_record_id: connectionId,
    user_id: userId,
    data_record: {
      raw,
      format:
        recordType === 'careplan' ||
        recordType === 'coverage' ||
        // DSTU2 has no ServiceRequest at all (it was ReferralRequest), so
        // labelling one DSTU2 would be a lie about the shape we just wrote.
        recordType === 'servicerequest'
          ? 'FHIR.R4'
          : 'FHIR.DSTU2',
      content_type:
        recordType === 'document'
          ? fileContentType || 'application/octet-stream'
          : 'application/json',
      resource_type: resourceType,
      version_history: loadedDocument ? [loadedDocument.data_record.raw] : [],
    },
    metadata: {
      id: `manual:${nextRecordId}`,
      date: recordDate,
      display_name: title.trim() || fileName,
      loinc_coding:
        terminology?.system === 'http://loinc.org' ? [terminology.code] : [],
      terminology_profile: terminology?.profile,
      terminology_source: terminology?.source,
      terminology_source_version: terminology?.sourceVersion,
      manual_uncoded: recordType !== 'document' && !terminology,
      manual_specialty: specialtyDetails?.specialty,
      manual_subtype: specialtyDetails?.subtype,
      manual_specialty_details: specialtyDetails,
      manual_imaging_details: imagingDetails,
      source_document_id: linkedDocumentId,
      source_attachment_id: linkedAttachmentId,
      source_name: 'Manual entry',
      source_type: 'manual',
      source_location: 'manual://local',
      retrieved_at: new Date().toISOString(),
      entry_method: recordType === 'document' ? 'file-import' : 'manual-entry',
      original_filename: fileName || undefined,
      mapping_confidence: recordType === 'document' ? 'source' : 'manual',
      provenance_notes:
        recordType === 'document'
          ? 'Original file preserved as a local document record.'
          : undefined,
    },
  };
}

export type ManualCoverageInput = {
  memberId: string;
  groupNumber: string;
  planType: string;
  relationship: string;
  status: 'active' | 'cancelled';
  periodStart: string;
  periodEnd: string;
  phone: string;
  address: string;
};

function buildManualCoverageEntry(
  id: string,
  title: string,
  notes: string,
  coverage: ManualCoverageInput,
) {
  // Coverage class entries carry plan group, payer phone, and mailing address
  // using the same text keys the Insurance tab reads back.
  const classes = [
    coverage.groupNumber.trim() && {
      type: { text: 'group' },
      value: coverage.groupNumber.trim(),
    },
    coverage.phone.trim() && {
      type: { text: 'phone' },
      value: coverage.phone.trim(),
    },
    coverage.address.trim() && {
      type: { text: 'address' },
      value: coverage.address.trim(),
    },
  ].filter(Boolean);
  const start = coverage.periodStart.trim();
  const end = coverage.periodEnd.trim();
  return {
    fullUrl: `manual:${id}`,
    manual_kind: 'coverage',
    manual_uncoded: true,
    resource: {
      resourceType: 'Coverage',
      id,
      status: coverage.status,
      subscriberId: coverage.memberId.trim() || undefined,
      type: coverage.planType.trim()
        ? { text: coverage.planType.trim() }
        : undefined,
      relationship: coverage.relationship.trim()
        ? { text: coverage.relationship.trim() }
        : undefined,
      payor: [{ display: title.trim() }],
      period:
        start || end
          ? { start: start || undefined, end: end || undefined }
          : undefined,
      class: classes.length ? classes : undefined,
      text: notes.trim()
        ? { status: 'generated', div: notes.trim() }
        : undefined,
    },
  };
}

function buildManualFhirEntry(
  id: string,
  recordType: ClinicalManualRecordKind,
  title: string,
  notes: string,
  date: string,
  observation?: {
    valueKind: ManualObservationValueKind;
    comparator: string;
    value: string;
    unit: string;
    rangeLow: string;
    rangeHigh: string;
    rangeText: string;
    interpretation: string;
    absentReason: ManualObservationAbsentReason;
  },
  medication?: {
    dose: string;
    frequency: string;
    route: string;
  },
  terminology?: TerminologyEntry,
  specialtyDetails?: ManualSpecialtyDetails,
  coverage?: ManualCoverageInput,
  familyRelationship?: string,
) {
  if (recordType === 'coverage' && coverage) {
    return buildManualCoverageEntry(id, title, notes, coverage);
  }
  if (recordType === 'familymemberhistory') {
    return buildManualFamilyHistoryEntry(
      id,
      title,
      notes,
      date,
      familyRelationship || '',
      terminology,
    );
  }
  if (recordType === 'servicerequest') {
    return buildManualReferralEntry(
      id,
      title,
      notes,
      date,
      terminology,
      specialtyDetails,
    );
  }
  const resourceType = toFhirResourceType(recordType);
  const observationData = observation ?? {
    valueKind: 'quantity' as ManualObservationValueKind,
    comparator: '',
    value: '',
    unit: '',
    rangeLow: '',
    rangeHigh: '',
    rangeText: '',
    interpretation: '',
    absentReason: 'pending' as ManualObservationAbsentReason,
  };
  const medicationData = medication ?? { dose: '', frequency: '', route: '' };
  const hasMedicationDetail =
    recordType === 'medicationstatement' &&
    (medicationData.dose.trim() ||
      medicationData.frequency.trim() ||
      medicationData.route.trim());
  const observationValue = buildObservationValue(observationData);
  return {
    fullUrl: `manual:${id}`,
    manual_kind: recordType,
    manual_uncoded: !terminology,
    terminology_profile: terminology?.profile,
    terminology_source: terminology?.source,
    terminology_source_version: terminology?.sourceVersion,
    resource: {
      resourceType,
      id,
      category: buildObservationCategory(recordType, specialtyDetails),
      code: {
        text: title.trim(),
        coding: terminology
          ? [
              {
                system: terminology.system,
                code: terminology.code,
                display: terminology.display,
              },
            ]
          : specialtyDetails?.specialty === 'dental' &&
              specialtyDetails.procedureCode
            ? [
                {
                  code: specialtyDetails.procedureCode,
                  display: title.trim(),
                },
              ]
            : undefined,
      },
      text: notes.trim()
        ? {
            status: 'generated',
            div: notes.trim(),
          }
        : undefined,
      note: notes.trim() ? [{ text: notes.trim() }] : undefined,
      bodySite: buildDentalBodySite(specialtyDetails),
      method: specialtyDetails?.examMethod
        ? { text: specialtyDetails.examMethod }
        : undefined,
      severity:
        specialtyDetails?.specialty === 'dental' &&
        specialtyDetails.dentalSeverity
          ? { text: specialtyDetails.dentalSeverity }
          : undefined,
      performer:
        specialtyDetails?.specialty === 'dental' &&
        specialtyDetails.dentalProvider
          ? [{ display: specialtyDetails.dentalProvider }]
          : specialtyDetails?.specialty === 'optometry' &&
              specialtyDetails.surgerySurgeon
            ? [{ display: specialtyDetails.surgerySurgeon }]
            : undefined,
      lensSpecification:
        recordType === 'visionprescription'
          ? buildVisionLensSpecification(specialtyDetails)
          : undefined,
      recordedDate: date,
      effectiveDateTime: date,
      date,
      issued: date,
      status: recordType === 'careplan' ? 'active' : 'final',
      class: recordType === 'encounter' ? 'manual' : undefined,
      location:
        specialtyDetails?.specialty === 'dental' &&
        specialtyDetails.dentalLocation
          ? [{ location: { display: specialtyDetails.dentalLocation } }]
          : recordType === 'encounter' && notes.trim()
            ? [{ location: { display: notes.trim() } }]
            : undefined,
      title: recordType === 'careplan' ? title.trim() : undefined,
      // Goal resources describe their target in `description` and track state
      // in `lifecycleStatus`/`startDate` (read back by the Goals tab).
      description: recordType === 'goal' ? { text: title.trim() } : undefined,
      lifecycleStatus: recordType === 'goal' ? 'active' : undefined,
      startDate: recordType === 'goal' ? date : undefined,
      valueQuantity: observationValue.valueQuantity,
      valueString: observationValue.valueString,
      valueCodeableConcept: observationValue.valueCodeableConcept,
      dataAbsentReason: observationValue.dataAbsentReason,
      referenceRange:
        observationData.rangeLow.trim() ||
        observationData.rangeHigh.trim() ||
        observationData.rangeText.trim()
          ? [
              {
                text: observationData.rangeText.trim() || undefined,
                low: observationData.rangeLow.trim()
                  ? {
                      value: observationData.rangeLow.trim(),
                      unit: observationData.unit.trim() || undefined,
                    }
                  : undefined,
                high: observationData.rangeHigh.trim()
                  ? {
                      value: observationData.rangeHigh.trim(),
                      unit: observationData.unit.trim() || undefined,
                    }
                  : undefined,
              },
            ]
          : undefined,
      interpretation: observationData.interpretation.trim()
        ? { text: observationData.interpretation.trim() }
        : undefined,
      dosage: hasMedicationDetail
        ? [
            {
              text: medicationData.dose.trim() || undefined,
              route: medicationData.route.trim()
                ? { text: medicationData.route.trim() }
                : undefined,
              timing: medicationData.frequency.trim()
                ? { code: { text: medicationData.frequency.trim() } }
                : undefined,
            },
          ]
        : undefined,
    },
  };
}

function buildManualFamilyHistoryEntry(
  id: string,
  title: string,
  notes: string,
  date: string,
  relationship: string,
  terminology?: TerminologyEntry,
) {
  const conditionText = title.trim();
  const relationshipText = relationship.trim();
  const noteText = notes.trim();
  return {
    fullUrl: `manual:${id}`,
    manual_kind: 'familymemberhistory',
    manual_uncoded: !terminology,
    terminology_profile: terminology?.profile,
    terminology_source: terminology?.source,
    terminology_source_version: terminology?.sourceVersion,
    resource: {
      resourceType: 'FamilyMemberHistory',
      id,
      status: 'completed',
      date,
      relationship: relationshipText ? { text: relationshipText } : undefined,
      condition: conditionText
        ? [
            {
              code: {
                text: conditionText,
                coding: terminology
                  ? [
                      {
                        system: terminology.system,
                        code: terminology.code,
                        display: terminology.display,
                      },
                    ]
                  : undefined,
              },
              note: noteText ? { text: noteText } : undefined,
            },
          ]
        : undefined,
      // Stored as an array so the shared manual-record note reader can surface
      // it on the timeline card the same way it does for other manual records.
      note: noteText ? [{ text: noteText }] : undefined,
    },
  };
}

/**
 * The generic entry would give a ServiceRequest `status: 'final'` and no
 * `intent`, which is not a valid referral and would put the word "final" in
 * the status badge on the Referrals card. This writes the four fields that tab
 * actually reads — status, code, occurrence/authoredOn, note — plus the
 * `intent` and `category` a ServiceRequest is required to carry.
 */
function buildManualReferralEntry(
  id: string,
  title: string,
  notes: string,
  date: string,
  terminology?: TerminologyEntry,
  details?: ManualSpecialtyDetails,
) {
  const noteText = notes.trim();
  // The form has no "referred by" field, so the only name we can honestly put
  // on the request is the specialty provider when one was entered; the tab
  // renders requester and performer only when they are present.
  const provider = details?.dentalProvider || details?.surgerySurgeon;
  return {
    fullUrl: `manual:${id}`,
    manual_kind: 'servicerequest',
    manual_uncoded: !terminology,
    terminology_profile: terminology?.profile,
    terminology_source: terminology?.source,
    terminology_source_version: terminology?.sourceVersion,
    resource: {
      resourceType: 'ServiceRequest',
      id,
      status: 'active',
      intent: 'order',
      category: [
        {
          text: 'Referral',
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '306206005',
              display: 'Referral to service',
            },
          ],
        },
      ],
      code: {
        text: title.trim(),
        coding: terminology
          ? [
              {
                system: terminology.system,
                code: terminology.code,
                display: terminology.display,
              },
            ]
          : undefined,
      },
      performer: provider ? [{ display: provider }] : undefined,
      authoredOn: date,
      occurrenceDateTime: date,
      text: noteText ? { status: 'generated', div: noteText } : undefined,
      note: noteText ? [{ text: noteText }] : undefined,
    },
  };
}

function buildObservationValue(observationData: {
  valueKind: ManualObservationValueKind;
  comparator: string;
  value: string;
  unit: string;
  absentReason: ManualObservationAbsentReason;
}) {
  const value = observationData.value.trim();
  const unit = observationData.unit.trim();
  const parsedQuantity = parseQuantityInput(value);
  const comparator =
    normalizeComparator(observationData.comparator) ||
    parsedQuantity.comparator;

  if (observationData.valueKind === 'absent') {
    return {
      dataAbsentReason: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/data-absent-reason',
            code: observationData.absentReason,
            display: formatAbsentReason(observationData.absentReason),
          },
        ],
        text: formatAbsentReason(observationData.absentReason),
      },
    };
  }

  if (!value) return {};

  if (observationData.valueKind === 'quantity') {
    const numericValue = Number(parsedQuantity.value);
    if (Number.isFinite(numericValue)) {
      return {
        valueQuantity: {
          value: numericValue,
          comparator,
          unit: unit || undefined,
          system: unit ? 'http://unitsofmeasure.org' : undefined,
          code: unit || undefined,
        },
      };
    }

    return {
      valueString: `${comparator || ''}${value}${unit ? ` ${unit}` : ''}`,
    };
  }

  if (observationData.valueKind === 'coded') {
    return {
      valueCodeableConcept: {
        text: value,
        coding: [{ display: value }],
      },
    };
  }

  return {
    valueString: unit ? `${value} ${unit}` : value,
  };
}

function parseQuantityInput(value: string): {
  comparator?: ManualObservationComparator;
  value: string;
} {
  const match = value.trim().match(/^(<=|>=|<|>)\s*(.+)$/);
  if (!match) return { value };
  return {
    comparator: normalizeComparator(match[1]),
    value: match[2].trim(),
  };
}

function normalizeComparator(
  comparator: string,
): ManualObservationComparator | undefined {
  return comparator === '<' ||
    comparator === '<=' ||
    comparator === '>' ||
    comparator === '>='
    ? comparator
    : undefined;
}

function formatAbsentReason(reason: ManualObservationAbsentReason) {
  switch (reason) {
    case 'not-performed':
      return 'Not performed';
    case 'not-applicable':
      return 'Not applicable';
    case 'unknown':
      return 'Unknown';
    case 'pending':
    default:
      return 'Pending';
  }
}

function getClinicalResourceType(
  recordType: ClinicalManualRecordKind,
): ClinicalDocumentResourceType {
  if (recordType === 'lab' || recordType === 'vital') return 'observation';
  if (recordType === 'socialhistory') return 'observation';
  if (recordType === 'document') return 'documentreference_attachment';
  if (recordType === 'visionprescription') return 'visionprescription';
  if (recordType === 'goal') return 'goal';
  return recordType;
}

function toFhirResourceType(recordType: ClinicalManualRecordKind) {
  switch (recordType) {
    case 'medicationstatement':
      return 'MedicationStatement';
    case 'allergyintolerance':
      return 'AllergyIntolerance';
    case 'careplan':
      return 'CarePlan';
    case 'visionprescription':
      return 'VisionPrescription';
    case 'goal':
      return 'Goal';
    case 'servicerequest':
      return 'ServiceRequest';
    case 'lab':
    case 'vital':
    case 'socialhistory':
      return 'Observation';
    case 'familymemberhistory':
      return 'FamilyMemberHistory';
    default:
      return recordType.charAt(0).toUpperCase() + recordType.slice(1);
  }
}
