import { format, parseISO } from 'date-fns';

import {
  ImagingCategory,
  ImagingDocument,
  ImagingItem,
  ImagingResourceType,
} from '../types';

export const IMAGING_RESOURCE_TYPES: ImagingResourceType[] = [
  'diagnosticreport',
  'documentreference',
  'documentreference_attachment',
  'imagingstudy',
  'media',
];

const DENTAL_TERMS = [
  'bitewing',
  'cbct',
  'cephalometric',
  'dental',
  'dentition',
  'endodontic',
  'intraoral',
  'mandible',
  'maxilla',
  'odontogram',
  'oral',
  'panoramic',
  'periodontal',
  'periapical',
  'tooth',
  'teeth',
];

const CATEGORY_TERMS: Record<ImagingCategory, string[]> = {
  dental: DENTAL_TERMS,
  xray: ['x-ray', 'xray', 'radiograph', 'radiography', 'dx'],
  ct: [' ct ', 'computed tomography', 'cbct'],
  mri: ['mri', 'magnetic resonance'],
  ultrasound: ['ultrasound', 'sonogram', 'us '],
  scan: ['scan', 'imaging study', 'dicom'],
  report: ['report', 'diagnostic'],
  other: [],
};

export function mapImagingDocument(document: ImagingDocument): ImagingItem {
  const resource = getResource(document);
  const text = searchableText(document, resource);
  const title =
    document.metadata?.display_name ||
    getCodeText(resource) ||
    getAttachmentTitle(resource) ||
    humanizeResourceType(document.data_record.resource_type);
  const categories = inferCategories(document, text);

  return {
    id: document.id,
    document,
    title,
    date: document.metadata?.date,
    type: document.data_record.resource_type as ImagingResourceType,
    modality: getModality(resource, text),
    bodySite: getBodySite(resource),
    summary: getSummary(resource),
    attachmentType: getAttachmentType(resource),
    categories,
  };
}

export function filterImagingItems(
  items: ImagingItem[],
  query: string,
  category: ImagingCategory | 'all',
) {
  const normalizedQuery = query.trim().toLowerCase();

  return items.filter((item) => {
    if (category !== 'all' && !item.categories.includes(category)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      item.title,
      item.modality,
      item.bodySite,
      item.summary,
      item.attachmentType,
      item.type,
      item.date ? formatDate(item.date) : '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export function formatDate(date?: string) {
  if (!date) return 'Undated';

  try {
    return format(parseISO(date), 'MMM d, yyyy');
  } catch {
    return date;
  }
}

function inferCategories(
  document: ImagingDocument,
  searchable: string,
): ImagingCategory[] {
  const categories = new Set<ImagingCategory>();
  const padded = ` ${searchable.toLowerCase()} `;

  for (const [category, terms] of Object.entries(CATEGORY_TERMS)) {
    if (terms.some((term) => padded.includes(term))) {
      categories.add(category as ImagingCategory);
    }
  }

  if (document.data_record.resource_type === 'diagnosticreport') {
    categories.add('report');
  }
  if (document.data_record.resource_type === 'imagingstudy') {
    categories.add('scan');
  }
  if (document.data_record.resource_type === 'documentreference') {
    categories.add('report');
  }

  if (categories.size === 0) {
    categories.add('other');
  }

  return [...categories];
}

function searchableText(document: ImagingDocument, resource: any): string {
  return [
    document.metadata?.display_name,
    document.metadata?.loinc_coding?.join(' '),
    document.data_record.resource_type,
    getCodeText(resource),
    getBodySite(resource),
    getModality(resource, ''),
    getAttachmentTitle(resource),
    getAttachmentType(resource),
    getSummary(resource),
    JSON.stringify(resource?.modality || ''),
    JSON.stringify(resource?.bodySite || ''),
    JSON.stringify(resource?.category || ''),
    JSON.stringify(resource?.type || ''),
  ]
    .filter(Boolean)
    .join(' ');
}

function getResource(document: ImagingDocument): any {
  const raw = document.data_record.raw as any;
  return raw?.resource || raw || {};
}

function getCodeText(resource: any): string | undefined {
  return (
    resource?.code?.text ||
    resource?.type?.text ||
    resource?.description ||
    resource?.series?.[0]?.description ||
    resource?.content?.[0]?.attachment?.title ||
    resource?.coding?.[0]?.display ||
    resource?.code?.coding?.[0]?.display ||
    resource?.type?.coding?.[0]?.display
  );
}

function getBodySite(resource: any): string | undefined {
  return (
    resource?.bodySite?.text ||
    resource?.bodySite?.coding?.[0]?.display ||
    resource?.series?.[0]?.bodySite?.display ||
    resource?.series?.[0]?.bodySite?.coding?.[0]?.display
  );
}

function getModality(resource: any, text: string): string | undefined {
  return (
    resource?.modality?.display ||
    resource?.modality?.code ||
    resource?.modality?.coding?.[0]?.display ||
    resource?.modality?.coding?.[0]?.code ||
    resource?.series?.[0]?.modality?.display ||
    resource?.series?.[0]?.modality?.code ||
    inferModalityFromText(text)
  );
}

function inferModalityFromText(text: string): string | undefined {
  const normalized = text.toLowerCase();
  if (normalized.includes('cbct')) return 'CBCT';
  if (normalized.includes('x-ray') || normalized.includes('radiograph')) {
    return 'X-ray';
  }
  if (normalized.includes('ct')) return 'CT';
  if (normalized.includes('mri')) return 'MRI';
  if (normalized.includes('ultrasound')) return 'Ultrasound';
  return undefined;
}

function getSummary(resource: any): string | undefined {
  return (
    resource?.conclusion ||
    resource?.note?.[0]?.text ||
    resource?.text?.div
      ?.replace(/<[^>]+>/g, ' ')
      ?.replace(/\s+/g, ' ')
      ?.trim()
  );
}

function getAttachmentTitle(resource: any): string | undefined {
  return (
    resource?.content?.[0]?.attachment?.title || resource?.attachment?.title
  );
}

function getAttachmentType(resource: any): string | undefined {
  return (
    resource?.content?.[0]?.attachment?.contentType ||
    resource?.attachment?.contentType
  );
}

function humanizeResourceType(resourceType: string) {
  return resourceType
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
