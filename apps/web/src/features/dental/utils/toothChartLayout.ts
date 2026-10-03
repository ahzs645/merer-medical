import { DentalTooth } from '../types';

/**
 * Orders one arch the way a clinical odontogram is drawn: from the viewer's
 * side of the chair, so the patient's right sits on the left of the chart and
 * the lower arch mirrors the upper one — opposing teeth then share a vertical
 * column (Universal 1 sits directly above 32).
 *
 * Universal numbering runs clockwise (1 upper right → 16 upper left → 17 lower
 * left → 32 lower right), so the lower arch's stored order is back to front on
 * screen and has to be reversed. Each dentition block is reversed on its own so
 * the mixed view keeps permanent and deciduous teeth in the same column groups
 * as the upper row.
 */
export function orderArchForDisplay(
  teeth: DentalTooth[],
  arch: 'upper' | 'lower',
): DentalTooth[] {
  const inArch = teeth.filter((tooth) => tooth.arch === arch);
  if (arch === 'upper') {
    return inArch;
  }
  return [
    ...inArch.filter((tooth) => tooth.dentition === 'permanent').reverse(),
    ...inArch.filter((tooth) => tooth.dentition === 'deciduous').reverse(),
  ];
}

export type ChartDentition = 'permanent' | 'deciduous' | 'mixed';

/** One position on a chart row: a tooth, or a gap that keeps columns aligned. */
export type ChartSlot = DentalTooth | null;

/**
 * The rows of one arch, every row the same width so that a column is one
 * position in the mouth. In the mixed view a primary tooth sits under the
 * permanent tooth that replaces it — A (upper right second primary molar)
 * under 4 (second premolar), J under 13; T under 29, K under 20 — so the
 * ten primary teeth take columns 4–13 of sixteen. They used to wrap onto a
 * second row starting under the third molar.
 */
export function buildArchRows(
  teeth: DentalTooth[],
  arch: 'upper' | 'lower',
  dentition: ChartDentition,
): ChartSlot[][] {
  const ordered = orderArchForDisplay(teeth, arch);
  const permanent = ordered.filter((tooth) => tooth.dentition === 'permanent');
  const deciduous = ordered.filter((tooth) => tooth.dentition === 'deciduous');

  if (dentition === 'permanent') return [permanent];
  if (dentition === 'deciduous') return [deciduous];
  const padded: ChartSlot[] = [
    null,
    null,
    null,
    ...deciduous,
    null,
    null,
    null,
  ];
  return arch === 'upper' ? [permanent, padded] : [padded, permanent];
}
