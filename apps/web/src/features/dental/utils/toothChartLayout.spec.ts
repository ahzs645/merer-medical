import {
  ALL_TEETH,
  DECIDUOUS_TEETH,
  UNIVERSAL_TEETH,
} from './dentalReferenceData';
import { buildArchRows, orderArchForDisplay } from './toothChartLayout';

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

describe('buildArchRows', () => {
  const ids = (row: ({ universal: string } | null)[]) =>
    row.map((slot) => slot?.universal ?? '·');

  it('puts each primary tooth under the permanent tooth that replaces it', () => {
    const [permanent, primary] = buildArchRows(ALL_TEETH, 'upper', 'mixed');
    expect(primary).toHaveLength(16);
    expect(
      permanent[primary.findIndex((s) => s?.universal === 'A')]?.universal,
    ).toBe('4');
    expect(
      permanent[primary.findIndex((s) => s?.universal === 'J')]?.universal,
    ).toBe('13');
  });

  it('draws the lower primary row above the lower permanent row', () => {
    const [primary, permanent] = buildArchRows(ALL_TEETH, 'lower', 'mixed');
    expect(ids(primary).slice(0, 4)).toEqual(['·', '·', '·', 'T']);
    expect(permanent[3].universal).toBe('29');
    expect(permanent[12].universal).toBe('20');
    expect(primary[12]?.universal).toBe('K');
  });

  it('gives a single dentition one unpadded row', () => {
    expect(buildArchRows(UNIVERSAL_TEETH, 'upper', 'permanent')).toHaveLength(
      1,
    );
    expect(
      ids(buildArchRows(DECIDUOUS_TEETH, 'upper', 'deciduous')[0]),
    ).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
  });
});
