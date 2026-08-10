import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

export type ImagingResourceType =
  | 'diagnosticreport'
  | 'documentreference'
  | 'documentreference_attachment'
  | 'imagingstudy'
  | 'media';

export type ImagingDocument = ClinicalDocument<unknown>;

/**
 * Categories are tags, not buckets: `inferCategories` assigns every category a
 * record matches, so one record can be counted under several of them.
 */
export const IMAGING_CATEGORIES = [
  'dental',
  'optometry',
  'xray',
  'ct',
  'mri',
  'ultrasound',
  'scan',
  'report',
  'attachment',
  'other',
] as const;

export type ImagingCategory = (typeof IMAGING_CATEGORIES)[number];

export type ImagingCategoryCounts = Record<ImagingCategory, number>;

export type ImagingItem = {
  id: string;
  document: ImagingDocument;
  title: string;
  date?: string;
  type: ImagingResourceType;
  modality?: string;
  bodySite?: string;
  laterality?: string;
  studyType?: string;
  accessionId?: string;
  studyId?: string;
  summary?: string;
  attachmentType?: string;
  categories: ImagingCategory[];
  findings: ImagingFinding[];
};

export type ImagingFinding = {
  label: string;
  value?: string;
  bodySite?: string;
  category?: string;
  searchableText: string;
};
