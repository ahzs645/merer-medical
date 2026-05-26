import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { ImagingItem } from '../../imaging/types';
import { EyeLaterality, OptometryRecord, OptometryRecordKind } from '../types';

const OPTOMETRY_TERMS = [
  'amblyopia',
  'amd',
  'autorefr',
  'cataract',
  'contact lens',
  'cornea',
  'diabetic retinopathy',
  'dry eye',
  'eye',
  'fundus',
  'glaucoma',
  'iop',
  'keratoconus',
  'macula',
  'oct',
  'ocular',
  'ophthalmic',
  'ophthalmology',
  'optic',
  'optical',
  'optomet',
  'refraction',
  'retina',
  'rnfl',
  'slit lamp',
  'tonometry',
  'visual acuity',
  'visual field',
];

const IMAGE_TERMS = [
  'fundus',
  'oct',
  'oct-a',
  'retinal photo',
  'visual field',
  'corneal topography',
  'ophthalmic',
  'macula',
  'rnfl',
  'slit lamp',
];

export function isOptometryDocument(
  document: ClinicalDocument<unknown>,
): boolean {
  const text = searchableText(document).toLowerCase();
  return (
    document.data_record.resource_type === 'visionprescription' ||
    OPTOMETRY_TERMS.some((term) => text.includes(term))
  );
}

export function mapOptometryDocument(
  document: ClinicalDocument<unknown>,
): OptometryRecord {
  const text = searchableText(document);

  return {
    id: document.id,
    document,
    kind: inferKind(document, text),
    title: getTitle(document),
    date: document.metadata?.date,
    laterality: inferLaterality(text),
    summary: getSummary(document),
    metrics: extractMetrics(document),
  };
}

export function filterEyeImaging(items: ImagingItem[]) {
  return items.filter((item) => {
    const text = [
      item.title,
      item.summary,
      item.modality,
      item.bodySite,
      item.attachmentType,
      item.type,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return IMAGE_TERMS.some((term) => text.includes(term));
  });
}

export function buildOptometryCounts(
  records: OptometryRecord[],
  imaging: ImagingItem[],
) {
  return {
    prescriptions: records.filter((record) => record.kind === 'prescription')
      .length,
    refractions: records.filter((record) => record.kind === 'refraction')
      .length,
    visualAcuity: records.filter((record) => record.kind === 'visualAcuity')
      .length,
    iop: records.filter((record) => record.kind === 'iop').length,
    diagnoses: records.filter((record) => record.kind === 'diagnosis').length,
    procedures: records.filter((record) => record.kind === 'procedure').length,
    imaging: imaging.length,
    documents: records.filter(
      (record) => record.kind === 'report' || record.kind === 'admin',
    ).length,
  };
}

function inferKind(
  document: ClinicalDocument<unknown>,
  text: string,
): OptometryRecordKind {
  const resourceType = document.data_record.resource_type;
  const normalized = text.toLowerCase();

  if (resourceType === 'visionprescription') return 'prescription';
  if (normalized.includes('refraction') || normalized.includes('sphere')) {
    return 'refraction';
  }
  if (normalized.includes('visual acuity') || normalized.includes('snellen')) {
    return 'visualAcuity';
  }
  if (normalized.includes('iop') || normalized.includes('tonometry')) {
    return 'iop';
  }
  if (resourceType === 'condition') return 'diagnosis';
  if (resourceType === 'procedure') return 'procedure';
  if (resourceType === 'diagnosticreport') return 'report';
  if (
    normalized.includes('frame') ||
    normalized.includes('lens order') ||
    normalized.includes('dispense')
  ) {
    return 'retail';
  }
  return 'admin';
}

function inferLaterality(text: string): EyeLaterality | undefined {
  const normalized = text.toUpperCase();
  if (/\bOU\b/.test(normalized)) return 'OU';
  if (/\bOD\b/.test(normalized) || /\bRIGHT EYE\b/.test(normalized)) {
    return 'OD';
  }
  if (/\bOS\b/.test(normalized) || /\bLEFT EYE\b/.test(normalized)) {
    return 'OS';
  }
  return undefined;
}

function extractMetrics(document: ClinicalDocument<unknown>) {
  const resource = getResource(document);
  const metrics: Record<string, string | number | boolean> = {};

  for (const component of resource?.component || []) {
    const key = component?.code?.text || component?.code?.coding?.[0]?.display;
    if (!key) continue;
    if (component.valueQuantity) metrics[key] = component.valueQuantity.value;
    if (component.valueString) metrics[key] = component.valueString;
    if (component.valueBoolean !== undefined) {
      metrics[key] = component.valueBoolean;
    }
  }

  for (const lens of resource?.lensSpecification || []) {
    const eye = lens.eye?.toUpperCase?.() || lens.eye;
    if (!eye) continue;
    if (lens.sphere !== undefined) metrics[`${eye} sphere`] = lens.sphere;
    if (lens.cylinder !== undefined) metrics[`${eye} cylinder`] = lens.cylinder;
    if (lens.axis !== undefined) metrics[`${eye} axis`] = lens.axis;
    if (lens.add !== undefined) metrics[`${eye} add`] = lens.add;
    if (lens.backCurve !== undefined)
      metrics[`${eye} base curve`] = lens.backCurve;
    if (lens.diameter !== undefined) metrics[`${eye} diameter`] = lens.diameter;
  }

  return metrics;
}

function getTitle(document: ClinicalDocument<unknown>) {
  const resource = getResource(document);
  return (
    document.metadata?.display_name ||
    resource?.code?.text ||
    resource?.code?.coding?.[0]?.display ||
    resource?.type?.text ||
    resource?.description ||
    document.data_record.resource_type
  );
}

function getSummary(document: ClinicalDocument<unknown>) {
  const resource = getResource(document);
  return (
    resource?.conclusion ||
    resource?.description ||
    resource?.note?.[0]?.text ||
    resource?.text?.div
      ?.replace(/<[^>]+>/g, ' ')
      ?.replace(/\s+/g, ' ')
      ?.trim()
  );
}

function searchableText(document: ClinicalDocument<unknown>): string {
  const resource = getResource(document);
  return [
    document.metadata?.display_name,
    document.metadata?.loinc_coding?.join(' '),
    document.data_record.resource_type,
    JSON.stringify(resource?.code || ''),
    JSON.stringify(resource?.category || ''),
    JSON.stringify(resource?.bodySite || ''),
    JSON.stringify(resource?.component || ''),
    JSON.stringify(resource?.lensSpecification || ''),
    JSON.stringify(resource?.note || ''),
    JSON.stringify(resource?.text || ''),
    JSON.stringify(resource?.description || ''),
  ]
    .filter(Boolean)
    .join(' ');
}

function getResource(document: ClinicalDocument<unknown>): any {
  const raw = document.data_record.raw as any;
  return raw?.resource || raw || {};
}
