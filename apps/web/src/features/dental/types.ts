import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ImagingItem } from '../imaging/types';

export type ToothSurface = 'M' | 'O' | 'I' | 'D' | 'B' | 'F' | 'L';

export type DentalRecordKind =
  | 'condition'
  | 'finding'
  | 'cleaning'
  | 'orthodontic'
  | 'procedure'
  | 'treatmentPlan'
  | 'perio'
  | 'note'
  | 'referral'
  | 'image';

export type DentalRecord = {
  id: string;
  document: ClinicalDocument<unknown>;
  kind: DentalRecordKind;
  title: string;
  date?: string;
  toothNumbers: string[];
  surfaces: ToothSurface[];
  summary?: string;
};

export type DentalTooth = {
  universal: string;
  fdi: string;
  arch: 'upper' | 'lower';
  side: 'right' | 'left';
};

export type DentalWorkspaceData = {
  records: DentalRecord[];
  imaging: ImagingItem[];
  recordsByTooth: Map<string, DentalRecord[]>;
  counts: {
    conditions: number;
    cleanings: number;
    orthodontics: number;
    findings: number;
    procedures: number;
    treatmentPlan: number;
    perio: number;
    notes: number;
    referrals: number;
    images: number;
  };
};
