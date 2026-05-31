import { ddinterMedicationInteractionEngine } from './ddinterPlugin';
import type { MedicationInteractionEngine } from './types';

const engines: MedicationInteractionEngine[] = [
  ddinterMedicationInteractionEngine,
];

export function getMedicationInteractionEngine(
  provider: MedicationInteractionEngine['id'] = 'ddinter',
) {
  return engines.find((engine) => engine.id === provider);
}

export function listMedicationInteractionEngines() {
  return engines;
}
