import type { LabReferenceOverlay } from '../enrichment/types';

/**
 * Which reference overlays have a line to draw.
 *
 * An overlay is a checkbox beside a colour swatch, which promises a band on the
 * chart. Plenty of them cannot keep that promise: a standard whose entry for
 * this test is advice rather than an interval ("Use absolute count" is what
 * both the Canadian and UK standards say about a lymphocyte percentage), or a
 * source range that never parsed into numbers ("Not Estab."). They carry a
 * `display` string and no `low` or `high`, so `LabHistoryChart` skips them —
 * every `ReferenceLine` there is already guarded on a finite number.
 *
 * On LYMPHS that left three checkboxes, two of them ticked, above a chart none
 * of them touched: a control panel taller than a phone's worth of the graph it
 * claimed to control.
 */
export function isPlottableOverlay(overlay: LabReferenceOverlay): boolean {
  return isFiniteNumber(overlay.low) || isFiniteNumber(overlay.high);
}

/**
 * The two halves, in one pass, so a caller can offer the first and describe the
 * second. The unplottable half is not noise — "Use absolute count" is the
 * answer to "why is there no band on my chart?" — it just does not deserve a
 * checkbox.
 */
export function partitionReferenceOverlays(overlays: LabReferenceOverlay[]): {
  plottable: LabReferenceOverlay[];
  unplottable: LabReferenceOverlay[];
} {
  const plottable: LabReferenceOverlay[] = [];
  const unplottable: LabReferenceOverlay[] = [];

  overlays.forEach((overlay) => {
    (isPlottableOverlay(overlay) ? plottable : unplottable).push(overlay);
  });

  return { plottable, unplottable };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
