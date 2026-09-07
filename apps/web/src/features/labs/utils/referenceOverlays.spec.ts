import { LabReferenceOverlay } from '../enrichment/types';
import {
  isPlottableOverlay,
  partitionReferenceOverlays,
} from './referenceOverlays';

const overlay = (
  extra: Partial<LabReferenceOverlay> = {},
): LabReferenceOverlay => ({
  mode: 'canadian',
  label: 'Canadian',
  display: 'Use absolute count',
  color: '#16A34A',
  kind: 'note',
  ...extra,
});

describe('isPlottableOverlay', () => {
  it('is true for a two-sided range', () => {
    expect(isPlottableOverlay(overlay({ low: 1, high: 3.5 }))).toBe(true);
  });

  it('is true for a one-sided bound, which is one line', () => {
    expect(isPlottableOverlay(overlay({ kind: 'lte', high: 5 }))).toBe(true);
    expect(isPlottableOverlay(overlay({ kind: 'gte', low: 40 }))).toBe(true);
  });

  it('is false for advice, which is what a percentage lab gets back', () => {
    expect(isPlottableOverlay(overlay())).toBe(false);
  });

  it('is false for a source range that never parsed', () => {
    expect(
      isPlottableOverlay(
        overlay({ mode: 'original', kind: 'range', display: 'Not Estab.' }),
      ),
    ).toBe(false);
  });

  it('is false for a bound that arrived as NaN', () => {
    expect(isPlottableOverlay(overlay({ low: Number.NaN }))).toBe(false);
  });
});

describe('partitionReferenceOverlays', () => {
  it('keeps each side in the order it was given', () => {
    const canadian = overlay({ low: 1, high: 3.5 });
    const uk = overlay({ mode: 'uk', label: 'UK' });
    const original = overlay({
      mode: 'original',
      label: 'Original',
      display: 'Not Estab.',
    });

    expect(partitionReferenceOverlays([canadian, uk, original])).toEqual({
      plottable: [canadian],
      unplottable: [uk, original],
    });
  });

  it('handles an empty list', () => {
    expect(partitionReferenceOverlays([])).toEqual({
      plottable: [],
      unplottable: [],
    });
  });
});
