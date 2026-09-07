import { getChartScale } from './chartScale';

/**
 * The demo's LYMPHS series (32.4 – 53.2 %) was labelled
 * **31.744 · 37.744 · 43.744 · 49.744 · 55.056** — the padded extremes divided
 * into five, so no tick landed on a number a reader would choose.
 */
describe('getChartScale', () => {
  it('puts every tick on a round number', () => {
    const { ticks } = getChartScale([32.4, 44.1, 53.2, 36.8, 41]);

    expect(ticks).toBeDefined();
    for (const tick of ticks!) {
      expect(Number.isInteger(tick / 5)).toBe(true);
    }
    expect(ticks).toEqual([30, 35, 40, 45, 50, 55]);
  });

  it('keeps every value inside the band it draws', () => {
    const values = [0.42, 1.9, 3.7, 2.2];
    const { domain, ticks } = getChartScale(values);
    const [low, high] = domain as [number, number];

    expect(low).toBeLessThanOrEqual(Math.min(...values));
    expect(high).toBeGreaterThanOrEqual(Math.max(...values));
    expect(ticks![0]).toBe(low);
    expect(ticks![ticks!.length - 1]).toBe(high);
  });

  it('never starts an axis below zero', () => {
    // A lab value is not negative, and an axis that opens below zero implies
    // one could be.
    const { domain } = getChartScale([1, 2, 3]);

    expect((domain as [number, number])[0]).toBeGreaterThanOrEqual(0);
  });

  it('gives a flat series a band to sit in', () => {
    const { domain, ticks } = getChartScale([7, 7, 7]);
    const [low, high] = domain as [number, number];

    expect(high).toBeGreaterThan(low);
    expect(ticks!.length).toBeGreaterThan(1);
  });

  it('scales a small range without printing float drift', () => {
    const { ticks } = getChartScale([0.021, 0.033, 0.027]);

    for (const tick of ticks!) {
      expect(String(tick)).not.toMatch(/\d{6,}/);
    }
  });

  it('leaves recharts its own default when there is nothing to scale', () => {
    expect(getChartScale([]).domain).toEqual(['dataMin', 'dataMax']);
    expect(getChartScale([]).ticks).toBeUndefined();
  });
});
