import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

export type ImagingResourceType =
  | 'diagnosticreport'
  | 'documentreference'
  | 'documentreference_attachment'
  | 'imagingstudy'
  | 'media';

export type ImagingDocument = ClinicalDocument<unknown>;

export type ImagingCategory =
  | 'dental'
  | 'optometry'
  | 'xray'
  | 'ct'
  | 'mri'
  | 'ultrasound'
  | 'scan'
  | 'report'
  | 'attachment'
  | 'other';

export type ImagingItem = {
  id: string;
  document: ImagingDocument;
  title: string;
  date?: string;
  type: ImagingResourceType;
  modality?: string;
  bodySite?: string;
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
