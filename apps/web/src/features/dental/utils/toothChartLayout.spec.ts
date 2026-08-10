import {
  ALL_TEETH,
  DECIDUOUS_TEETH,
  UNIVERSAL_TEETH,
} from './dentalReferenceData';
import { orderArchForDisplay } from './toothChartLayout';

/**
 * The chart used to render the lower arch in stored order (Universal 17→32),
 * which put the patient's lower left underneath their upper right. Opposing
 * teeth must line up in a column instead.
 */
describe('orderArchForDisplay', () => {
  it('keeps the upper arch in Universal order, left to right', () => {
    expect(
      orderArchForDisplay(UNIVERSAL_TEETH, 'upper').map(
        (tooth) => tooth.universal,
      ),
    ).toEqual(Array.from({ length: 16 }, (_, i) => `${i + 1}`));
  });

  it('mirrors the permanent lower arch so opposing teeth share a column', () => {
    const upper = orderArchForDisplay(UNIVERSAL_TEETH, 'upper');
    const lower = orderArchForDisplay(UNIVERSAL_TEETH, 'lower');

    expect(lower).toHaveLength(16);
    upper.forEach((tooth, column) => {
      // Universal numbering runs clockwise, so opposing pairs sum to 33.
      expect(Number(lower[column].universal)).toBe(
        33 - Number(tooth.universal),
      );
      // Same side of the mouth, same position within the quadrant.
      expect(lower[column].side).toBe(tooth.side);
      expect(lower[column].fdi.slice(1)).toBe(tooth.fdi.slice(1));
    });
  });

  it('mirrors the deciduous lower arch too', () => {
    const upper = orderArchForDisplay(DECIDUOUS_TEETH, 'upper');
    const lower = orderArchForDisplay(DECIDUOUS_TEETH, 'lower');

    expect(upper.map((tooth) => tooth.universal)).toEqual([...'ABCDEFGHIJ']);
    expect(lower.map((tooth) => tooth.universal)).toEqual([...'TSRQPONMLK']);
    upper.forEach((tooth, column) => {
      expect(lower[column].side).toBe(tooth.side);
      expect(lower[column].fdi.slice(1)).toBe(tooth.fdi.slice(1));
    });
  });

  it('keeps permanent and deciduous columns aligned in the mixed view', () => {
    const upper = orderArchForDisplay(ALL_TEETH, 'upper');
    const lower = orderArchForDisplay(ALL_TEETH, 'lower');

    expect(lower).toHaveLength(upper.length);
    upper.forEach((tooth, column) => {
      expect(lower[column].dentition).toBe(tooth.dentition);
      expect(lower[column].side).toBe(tooth.side);
      expect(lower[column].fdi.slice(1)).toBe(tooth.fdi.slice(1));
    });
  });
});
