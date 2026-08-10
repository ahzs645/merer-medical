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
