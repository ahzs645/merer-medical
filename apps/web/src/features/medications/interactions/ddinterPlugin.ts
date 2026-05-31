import type { MedicationViewItem } from '../medicationViewModel';
import {
  findDdinterInteractionsForNormalizedMedications,
  getDdinterStatus,
} from './ddinterStore';
import { normalizeMedicationsWithRxNorm } from './rxnormNormalizer';
import type { MedicationInteractionEngine } from './types';

export const ddinterMedicationInteractionEngine: MedicationInteractionEngine = {
  id: 'ddinter',
  label: 'DDInter',
  source: 'DDInter open-access drug-drug interaction CSV bundle',
  estimatedSize: '~13.1 MB CSV download bundle',
  async checkInteractions(medications: MedicationViewItem[]) {
    const activeMedications = medications.filter(
      (item) => item.group === 'current' || item.group === 'planned',
    );
    const normalizedMedications =
      await normalizeMedicationsWithRxNorm(activeMedications);

    return findDdinterInteractionsForNormalizedMedications(
      normalizedMedications,
    );
  },
  getBundleStatus: getDdinterStatus,
};
