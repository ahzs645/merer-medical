import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import {
  DentalEntryKind,
  EyeSide,
  ManualSpecialty,
  OptometryEntryKind,
} from './manualRecordTypes';

export type ManualSpecialtyDetails = {
  specialty: ManualSpecialty;
  subtype?: DentalEntryKind | OptometryEntryKind;
  toothNumber?: string;
  dentalTeeth?: string;
  toothRange?: string;
  dentalQuadrant?: string;
  dentalArch?: string;
  dentition?: string;
  dentalStatus?: string;
  dentalSeverity?: string;
  procedureCode?: string;
  dentalProvider?: string;
  dentalLocation?: string;
  dentalFollowUp?: string;
  dentalSurfaces?: string[];
  dentalRecall?: string;
  orthoPhase?: string;
  orthoArch?: string;
  orthoAppliance?: string;
  orthoStatus?: string;
  alignerCurrent?: string;
  alignerTotal?: string;
  overjet?: string;
  overbite?: string;
  molarClass?: string;
  nextVisit?: string;
  eyeSide?: EyeSide;
  odSphere?: string;
  odCylinder?: string;
  odAxis?: string;
  odAdd?: string;
  osSphere?: string;
  osCylinder?: string;
  osAxis?: string;
  osAdd?: string;
  pd?: string;
  visualAcuityOd?: string;
  visualAcuityOs?: string;
  iopOd?: string;
  iopOs?: string;
  examMethod?: string;
};

export type ManualImagingDetails = {
  modality?: string;
  bodySite?: string;
  laterality?: string;
  studyType?: string;
  accessionId?: string;
  studyId?: string;
};

export type ManualSpecialtyFormValues = Required<
  Omit<ManualSpecialtyDetails, 'subtype' | 'dentalSurfaces'>
> & {
  dentalSurfaces: string[];
  dentalEntryKind: DentalEntryKind;
  optometryEntryKind: OptometryEntryKind;
  imagingDetails: Required<ManualImagingDetails>;
};

export function buildSpecialtyDetails(
  params: ManualSpecialtyFormValues,
): ManualSpecialtyDetails | undefined {
  if (params.specialty === 'general') return undefined;
  if (params.specialty === 'dental') {
    return {
      specialty: 'dental',
      subtype: params.dentalEntryKind,
      toothNumber: params.toothNumber.trim(),
      dentalTeeth: params.dentalTeeth.trim(),
      toothRange: params.toothRange.trim(),
      dentalQuadrant: params.dentalQuadrant.trim(),
      dentalArch: params.dentalArch.trim(),
      dentition: params.dentition.trim(),
      dentalStatus: params.dentalStatus.trim(),
      dentalSeverity: params.dentalSeverity.trim(),
      procedureCode: params.procedureCode.trim(),
      dentalProvider: params.dentalProvider.trim(),
      dentalLocation: params.dentalLocation.trim(),
      dentalFollowUp: params.dentalFollowUp.trim(),
      dentalSurfaces: params.dentalSurfaces,
      dentalRecall: params.dentalRecall.trim(),
      orthoPhase: params.orthoPhase.trim(),
      orthoArch: params.orthoArch.trim(),
      orthoAppliance: params.orthoAppliance.trim(),
      orthoStatus: params.orthoStatus.trim(),
      alignerCurrent: params.alignerCurrent.trim(),
      alignerTotal: params.alignerTotal.trim(),
      overjet: params.overjet.trim(),
      overbite: params.overbite.trim(),
      molarClass: params.molarClass.trim(),
      nextVisit: params.nextVisit.trim(),
    };
  }
  return {
    specialty: 'optometry',
    subtype: params.optometryEntryKind,
    eyeSide: params.eyeSide,
    odSphere: params.odSphere.trim(),
    odCylinder: params.odCylinder.trim(),
    odAxis: params.odAxis.trim(),
    odAdd: params.odAdd.trim(),
    osSphere: params.osSphere.trim(),
    osCylinder: params.osCylinder.trim(),
    osAxis: params.osAxis.trim(),
    osAdd: params.osAdd.trim(),
    pd: params.pd.trim(),
    visualAcuityOd: params.visualAcuityOd.trim(),
    visualAcuityOs: params.visualAcuityOs.trim(),
    iopOd: params.iopOd.trim(),
    iopOs: params.iopOs.trim(),
    examMethod: params.examMethod.trim(),
  };
}

export function appendSpecialtyNotes(
  notes: string,
  details?: ManualSpecialtyDetails,
): string {
  if (!details) return notes;
  const lines = [''];
  if (details.specialty === 'dental') {
    if (details.toothNumber) lines.push(`Tooth: ${details.toothNumber}`);
    if (details.dentalTeeth) lines.push(`Teeth: ${details.dentalTeeth}`);
    if (details.toothRange) lines.push(`Tooth range: ${details.toothRange}`);
    if (details.dentalQuadrant) {
      lines.push(`Quadrant: ${details.dentalQuadrant}`);
    }
    if (details.dentalArch) lines.push(`Dental arch: ${details.dentalArch}`);
    if (details.dentition) lines.push(`Dentition: ${details.dentition}`);
    if (details.dentalSurfaces?.length) {
      lines.push(`Surfaces: ${details.dentalSurfaces.join('/')}`);
    }
    if (details.dentalStatus) lines.push(`Status: ${details.dentalStatus}`);
    if (details.dentalSeverity) {
      lines.push(`Severity: ${details.dentalSeverity}`);
    }
    if (details.procedureCode) {
      lines.push(`Procedure code: ${details.procedureCode}`);
    }
    if (details.dentalProvider) {
      lines.push(`Provider: ${details.dentalProvider}`);
    }
    if (details.dentalLocation) {
      lines.push(`Location: ${details.dentalLocation}`);
    }
    if (details.dentalFollowUp) {
      lines.push(`Follow-up: ${details.dentalFollowUp}`);
    }
    if (details.dentalRecall) lines.push(`Recall: ${details.dentalRecall}`);
    if (details.orthoPhase) lines.push(`Ortho phase: ${details.orthoPhase}`);
    if (details.orthoArch) lines.push(`Arch: ${details.orthoArch}`);
    if (details.orthoAppliance) {
      lines.push(`Appliance: ${details.orthoAppliance}`);
    }
    if (details.orthoStatus) lines.push(`Ortho status: ${details.orthoStatus}`);
    if (details.alignerCurrent || details.alignerTotal) {
      lines.push(
        `Aligner: ${details.alignerCurrent || '-'} of ${details.alignerTotal || '-'}`,
      );
    }
    if (details.overjet) lines.push(`Overjet: ${details.overjet} mm`);
    if (details.overbite) lines.push(`Overbite: ${details.overbite} mm`);
    if (details.molarClass)
      lines.push(`Molar/canine class: ${details.molarClass}`);
    if (details.nextVisit) lines.push(`Next visit: ${details.nextVisit}`);
  } else {
    if (details.eyeSide) lines.push(`Eye: ${details.eyeSide}`);
    if (details.examMethod) lines.push(`Method: ${details.examMethod}`);
    if (
      details.odSphere ||
      details.odCylinder ||
      details.odAxis ||
      details.odAdd
    ) {
      lines.push(
        `OD Rx: ${formatRxLine(details.odSphere, details.odCylinder, details.odAxis, details.odAdd)}`,
      );
    }
    if (
      details.osSphere ||
      details.osCylinder ||
      details.osAxis ||
      details.osAdd
    ) {
      lines.push(
        `OS Rx: ${formatRxLine(details.osSphere, details.osCylinder, details.osAxis, details.osAdd)}`,
      );
    }
    if (details.pd) lines.push(`PD: ${details.pd}`);
    if (details.visualAcuityOd)
      lines.push(`OD visual acuity: ${details.visualAcuityOd}`);
    if (details.visualAcuityOs)
      lines.push(`OS visual acuity: ${details.visualAcuityOs}`);
    if (details.iopOd) lines.push(`OD IOP: ${details.iopOd} mmHg`);
    if (details.iopOs) lines.push(`OS IOP: ${details.iopOs} mmHg`);
  }
  const structured = lines.filter(Boolean).join('\n');
  return [notes.trim(), structured].filter(Boolean).join('\n');
}

export function normalizeImagingDetails(
  details: ManualImagingDetails,
): ManualImagingDetails | undefined {
  const normalized = {
    modality: details.modality?.trim(),
    bodySite: details.bodySite?.trim(),
    laterality: details.laterality?.trim(),
    studyType: details.studyType?.trim(),
    accessionId: details.accessionId?.trim(),
    studyId: details.studyId?.trim(),
  };
  return Object.values(normalized).some(Boolean) ? normalized : undefined;
}

function formatRxLine(
  sphere?: string,
  cylinder?: string,
  axis?: string,
  add?: string,
) {
  return [
    sphere && `sphere ${sphere}`,
    cylinder && `cylinder ${cylinder}`,
    axis && `axis ${axis}`,
    add && `add ${add}`,
  ]
    .filter(Boolean)
    .join(', ');
}

export function getManualSpecialtyDetails(
  doc: ClinicalDocument,
): ManualSpecialtyDetails & {
  dentalEntryKind?: DentalEntryKind;
  optometryEntryKind?: OptometryEntryKind;
} {
  const raw = doc.data_record.raw as {
    manual_specialty?: ManualSpecialty;
    manual_subtype?: DentalEntryKind | OptometryEntryKind;
    manual_specialty_details?: ManualSpecialtyDetails;
  };
  const metadata = doc.metadata as
    | {
        manual_specialty?: ManualSpecialty;
        manual_subtype?: DentalEntryKind | OptometryEntryKind;
        manual_specialty_details?: ManualSpecialtyDetails;
      }
    | undefined;
  const details: ManualSpecialtyDetails = raw.manual_specialty_details ||
    metadata?.manual_specialty_details || {
      specialty: 'general',
    };
  const specialty =
    raw.manual_specialty ||
    metadata?.manual_specialty ||
    details.specialty ||
    'general';
  return {
    ...details,
    specialty,
    dentalEntryKind:
      specialty === 'dental'
        ? ((raw.manual_subtype ||
            metadata?.manual_subtype ||
            details.subtype) as DentalEntryKind)
        : undefined,
    optometryEntryKind:
      specialty === 'optometry'
        ? ((raw.manual_subtype ||
            metadata?.manual_subtype ||
            details.subtype) as OptometryEntryKind)
        : undefined,
  };
}
