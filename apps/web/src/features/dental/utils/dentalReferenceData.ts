import { DentalTooth, ToothSurface } from '../types';

export const TOOTH_SURFACES: {
  code: ToothSurface;
  label: string;
  description: string;
}[] = [
  { code: 'M', label: 'Mesial', description: 'Toward the midline' },
  { code: 'O', label: 'Occlusal', description: 'Chewing surface' },
  { code: 'I', label: 'Incisal', description: 'Incisal edge' },
  { code: 'D', label: 'Distal', description: 'Away from the midline' },
  { code: 'B', label: 'Buccal', description: 'Toward the cheek' },
  { code: 'F', label: 'Facial', description: 'Facial surface' },
  { code: 'L', label: 'Lingual', description: 'Toward the tongue' },
];

export const UNIVERSAL_TEETH: DentalTooth[] = [
  ...Array.from({ length: 16 }, (_, index) => {
    const universal = `${index + 1}`;
    return {
      universal,
      fdi: universalToFdi(index + 1),
      arch: 'upper' as const,
      side: index < 8 ? ('right' as const) : ('left' as const),
    };
  }),
  ...Array.from({ length: 16 }, (_, index) => {
    const universalNumber = index + 17;
    return {
      universal: `${universalNumber}`,
      fdi: universalToFdi(universalNumber),
      arch: 'lower' as const,
      side: index < 8 ? ('left' as const) : ('right' as const),
    };
  }),
];

export function universalToFdi(tooth: number): string {
  if (tooth >= 1 && tooth <= 8) return `${18 - tooth + 1}`;
  if (tooth >= 9 && tooth <= 16) return `${20 + tooth - 8}`;
  if (tooth >= 17 && tooth <= 24) return `${30 + tooth - 16}`;
  if (tooth >= 25 && tooth <= 32) return `${48 - tooth + 25}`;
  return `${tooth}`;
}
