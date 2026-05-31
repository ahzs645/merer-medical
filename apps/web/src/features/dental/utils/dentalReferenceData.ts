import { DentalTooth, ToothSurface } from '../types';

type ToothConditionDisplay = {
  code:
    | 'sound'
    | 'filled'
    | 'compromised'
    | 'endo'
    | 'missing'
    | 'rotated'
    | 'displaced'
    | 'gum-recessed';
  label: string;
  color: string;
  actionLevel: 'watch' | 'active' | 'complete';
  description: string;
};

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

export const DENTAL_TOOTH_CONDITIONS: ToothConditionDisplay[] = [
  {
    code: 'sound',
    label: 'Sound',
    color: 'transparent',
    actionLevel: 'complete',
    description: 'No known finding on the tooth.',
  },
  {
    code: 'filled',
    label: 'Filled',
    color: '#FFE082',
    actionLevel: 'complete',
    description: 'Existing restoration or filling.',
  },
  {
    code: 'compromised',
    label: 'Compromised',
    color: '#FFCDD2',
    actionLevel: 'active',
    description: 'Tooth has a condition that needs review or treatment.',
  },
  {
    code: 'endo',
    label: 'Endodontic',
    color: '#D1C4E9',
    actionLevel: 'complete',
    description: 'Root canal or endodontic history.',
  },
  {
    code: 'missing',
    label: 'Missing',
    color: '#BDBDBD',
    actionLevel: 'complete',
    description: 'Tooth is absent or extracted.',
  },
  {
    code: 'rotated',
    label: 'Rotated',
    color: '#B2EBF2',
    actionLevel: 'watch',
    description: 'Tooth rotation noted for orthodontic or clinical tracking.',
  },
  {
    code: 'displaced',
    label: 'Displaced',
    color: '#B2DFDB',
    actionLevel: 'watch',
    description:
      'Tooth displacement noted for orthodontic or clinical tracking.',
  },
  {
    code: 'gum-recessed',
    label: 'Gum recessed',
    color: '#F48FB1',
    actionLevel: 'watch',
    description: 'Gingival recession associated with the tooth.',
  },
];

const PERMANENT_NAMES = [
  'Central Incisor',
  'Lateral Incisor',
  'Canine',
  'First Premolar',
  'Second Premolar',
  'First Molar',
  'Second Molar',
  'Third Molar',
];

const DECIDUOUS_NAMES = [
  'Central Incisor',
  'Lateral Incisor',
  'Canine',
  'First Molar',
  'Second Molar',
];

export const UNIVERSAL_TEETH: DentalTooth[] = [
  ...Array.from({ length: 16 }, (_, index) => {
    const universal = `${index + 1}`;
    const fdi = universalToFdi(index + 1);
    return {
      universal,
      fdi,
      palmer: fdiToPalmer(fdi),
      name: fdiToName(fdi),
      dentition: 'permanent' as const,
      arch: 'upper' as const,
      side: index < 8 ? ('right' as const) : ('left' as const),
    };
  }),
  ...Array.from({ length: 16 }, (_, index) => {
    const universalNumber = index + 17;
    const fdi = universalToFdi(universalNumber);
    return {
      universal: `${universalNumber}`,
      fdi,
      palmer: fdiToPalmer(fdi),
      name: fdiToName(fdi),
      dentition: 'permanent' as const,
      arch: 'lower' as const,
      side: index < 8 ? ('left' as const) : ('right' as const),
    };
  }),
];

export const DECIDUOUS_TEETH: DentalTooth[] = [
  ...Array.from({ length: 10 }, (_, index) => {
    const universal = String.fromCharCode(65 + index);
    const fdi = deciduousUniversalToFdi(universal);
    return {
      universal,
      fdi,
      palmer: fdiToPalmer(fdi),
      name: fdiToName(fdi),
      dentition: 'deciduous' as const,
      arch: 'upper' as const,
      side: index < 5 ? ('right' as const) : ('left' as const),
    };
  }),
  ...Array.from({ length: 10 }, (_, index) => {
    const universal = String.fromCharCode(75 + index);
    const fdi = deciduousUniversalToFdi(universal);
    return {
      universal,
      fdi,
      palmer: fdiToPalmer(fdi),
      name: fdiToName(fdi),
      dentition: 'deciduous' as const,
      arch: 'lower' as const,
      side: index < 5 ? ('left' as const) : ('right' as const),
    };
  }),
];

export const ALL_TEETH = [...UNIVERSAL_TEETH, ...DECIDUOUS_TEETH];

export function universalToFdi(tooth: number): string {
  if (tooth >= 1 && tooth <= 8) return `${18 - tooth + 1}`;
  if (tooth >= 9 && tooth <= 16) return `${20 + tooth - 8}`;
  if (tooth >= 17 && tooth <= 24) return `${30 + tooth - 16}`;
  if (tooth >= 25 && tooth <= 32) return `${48 - tooth + 25}`;
  return `${tooth}`;
}

export function deciduousUniversalToFdi(tooth: string): string {
  const letter = tooth.toUpperCase();
  const index = letter.charCodeAt(0) - 65;
  if (index >= 0 && index <= 4) return `${55 - index}`;
  if (index >= 5 && index <= 9) return `${56 + index}`;
  if (index >= 10 && index <= 14) return `${85 - index}`;
  if (index >= 15 && index <= 19) return `${66 + index}`;
  return tooth;
}

export function fdiToPalmer(fdi: string): string {
  const quadrant = Number(fdi[0]);
  const position = fdi.slice(1);
  const prefix =
    quadrant === 1 || quadrant === 5
      ? 'UR'
      : quadrant === 2 || quadrant === 6
        ? 'UL'
        : quadrant === 3 || quadrant === 7
          ? 'LL'
          : quadrant === 4 || quadrant === 8
            ? 'LR'
            : '';
  return prefix ? `${prefix}${position}` : fdi;
}

export function fdiToName(fdi: string): string {
  const quadrant = Number(fdi[0]);
  const position = Number(fdi.slice(1));
  const names = quadrant >= 5 ? DECIDUOUS_NAMES : PERMANENT_NAMES;
  const name = names[position - 1];
  if (!name) return fdi;
  const arch =
    quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6
      ? 'Upper'
      : 'Lower';
  const side =
    quadrant === 1 || quadrant === 4 || quadrant === 5 || quadrant === 8
      ? 'Right'
      : 'Left';
  return `${arch} ${side} ${name}`;
}

export function findToothByNotation(tooth: string): DentalTooth | undefined {
  const normalized = tooth.toUpperCase();
  return ALL_TEETH.find(
    (item) =>
      item.universal.toUpperCase() === normalized ||
      item.fdi === normalized ||
      item.palmer.toUpperCase() === normalized,
  );
}
