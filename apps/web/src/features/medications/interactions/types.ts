import type { MedicationViewItem } from '../medicationViewModel';

export type MedicationInteractionSeverity =
  | 'contraindicated'
  | 'major'
  | 'moderate'
  | 'minor'
  | 'unknown';

export type MedicationInteraction = {
  id: string;
  source: string;
  severity: MedicationInteractionSeverity;
  drugs: [string, string];
  description?: string;
  management?: string;
  provenance?: MedicationInteractionProvenance;
};

export type MedicationInteractionProvenance = {
  sourceVersion?: string;
  ddinterIds?: [string | undefined, string | undefined];
  matchedAliases?: [string, string];
  matchedInputNames?: [string, string];
  matchedRxcuis?: [string | undefined, string | undefined];
  matchStrategy: 'normalized_alias' | 'rxnorm_expansion';
};

export type MedicationInteractionBundleStatus = {
  installed: boolean;
  readiness: 'missing' | 'installed' | 'stale';
  recordCount: number;
  updatedAt?: string;
  sourceVersion?: string;
  message?: string;
  license?: string;
  sourceUrl?: string;
  fileCount?: number;
};

export type MedicationInteractionEngine = {
  id: 'ddinter';
  label: string;
  source: string;
  estimatedSize: string;
  checkInteractions: (
    medications: MedicationViewItem[],
  ) => Promise<MedicationInteraction[]>;
  getBundleStatus: () => Promise<MedicationInteractionBundleStatus>;
};
