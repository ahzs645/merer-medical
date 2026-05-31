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
        );

  return {
    id: loadedDocument?.id || '',
    connection_record_id: connectionId,
    user_id: userId,
    data_record: {
      raw,
      format: recordType === 'careplan' ? 'FHIR.R4' : 'FHIR.DSTU2',
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
) {
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
      category: specialtyDetails?.specialty
        ? [{ text: specialtyDetails.specialty }]
        : undefined,
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
  if (recordType === 'document') return 'documentreference_attachment';
  if (recordType === 'visionprescription') return 'visionprescription';
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
    case 'lab':
    case 'vital':
      return 'Observation';
    default:
      return recordType.charAt(0).toUpperCase() + recordType.slice(1);
  }
}
