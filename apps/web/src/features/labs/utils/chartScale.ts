/**
 * Ticks a reader would have chosen.
 *
 * The lab chart used to hand recharts a domain of `[min − 12%, max + 12%]` and
 * let it divide that into five, so a percentage plotted between 32 and 55 was
 * labelled **31.744 · 37.744 · 43.744 · 49.744 · 55.056** — the data's own
 * extremes with an even step between them, and not one tick on a number anybody
 * would pick. Every other figure in this app is rounded and given a unit.
 *
 * So the range is widened to whole steps (1, 2 or 5 times a power of ten) and
 * the ticks are handed over explicitly. The rounding is also the headroom the
 * old percentage padding provided, so the band is no wider than it needs to be.
 */

/**
 * The nearest round step to `rough`, on the 1 / 2 / 5 ladder — Heckbert's nice
 * numbers. Nearest rather than next-above, so a series spanning 20 units over
 * five ticks steps by 5 and not by 10, which would leave half the chart empty.
 */
function niceStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step =
    normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
  return step * magnitude;
}

/** Rounds off the drift that accumulates when stepping through a float range. */
function snap(value: number, step: number): number {
  const decimals = Math.max(0, Math.min(10, -Math.floor(Math.log10(step)) + 1));
  return Number(value.toFixed(decimals));
}

export interface ChartScale {
  domain: [number | 'dataMin', number | 'dataMax'];
  /** Undefined when there is nothing to scale, so recharts keeps its default. */
  ticks?: number[];
}

export function getChartScale(values: number[], tickCount = 5): ChartScale {
  const finite = values.filter(
    (value) => typeof value === 'number' && Number.isFinite(value),
  );
  if (finite.length === 0) return { domain: ['dataMin', 'dataMax'] };

  let min = Math.min(...finite);
  let max = Math.max(...finite);

  // A flat series still needs a band to sit in, or the line lands on the axis.
  if (max === min) {
    const padding = Math.max(Math.abs(max) * 0.12, 1);
    min -= padding;
    max += padding;
  }
  // A lab value is never negative, and an axis that opens below zero implies
  // one could be.
  min = Math.max(0, min);

  // No percentage padding: rounding the ends out to whole steps is the
  // headroom, and it lands on numbers rather than beside them.
  const step = niceStep((max - min) / Math.max(1, tickCount - 1));
  const low = snap(Math.floor(min / step) * step, step);
  const high = snap(Math.ceil(max / step) * step, step);

  const ticks: number[] = [];
  // The half-step slack absorbs float drift so the top tick is not dropped.
  for (let value = low; value <= high + step / 2; value += step) {
    ticks.push(snap(value, step));
  }

  return { domain: [low, high], ticks };
}
