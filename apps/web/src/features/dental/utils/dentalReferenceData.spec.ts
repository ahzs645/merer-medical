import {
  UNIVERSAL_TEETH,
  deciduousUniversalToFdi,
  fdiToName,
  fdiToPalmer,
  universalToFdi,
} from './dentalReferenceData';

/**
 * Universal (ADA) numbering runs clockwise from the patient's upper right
 * third molar (1) to the lower right third molar (32). Each arch therefore
 * flips direction relative to FDI quadrants, and the lower arch used to be
 * mapped backwards — labelling e.g. Universal 30 (lower right first molar) as
 * FDI 43 (lower right canine).
 */
describe('universalToFdi', () => {
  it('maps the upper arch quadrant boundaries', () => {
    expect(universalToFdi(1)).toBe('18');
    expect(universalToFdi(8)).toBe('11');
    expect(universalToFdi(9)).toBe('21');
    expect(universalToFdi(16)).toBe('28');
  });

  it('maps the lower arch quadrant boundaries', () => {
    expect(universalToFdi(17)).toBe('38');
    expect(universalToFdi(24)).toBe('31');
    expect(universalToFdi(25)).toBe('41');
    expect(universalToFdi(32)).toBe('48');
  });

  it('maps the molars that show up in dental records', () => {
    // Universal 14 = upper left first molar, 19 = lower left first molar,
    // 30 = lower right first molar.
    expect(universalToFdi(14)).toBe('26');
    expect(universalToFdi(19)).toBe('36');
    expect(universalToFdi(30)).toBe('46');
  });

  it('produces 32 distinct FDI codes across the permanent dentition', () => {
    const codes = Array.from({ length: 32 }, (_, i) => universalToFdi(i + 1));
    expect(new Set(codes).size).toBe(32);
  });

  it('keeps a tooth and the one directly opposing it in the same vertical column', () => {
    // Universal 1 (upper right third molar) opposes 32 (lower right third
    // molar): same side, same position, adjacent quadrants.
    for (let upper = 1; upper <= 16; upper += 1) {
      const lower = 33 - upper;
      const upperFdi = universalToFdi(upper);
      const lowerFdi = universalToFdi(lower);
      expect(upperFdi.slice(1)).toBe(lowerFdi.slice(1));
    }
  });
});

describe('deciduousUniversalToFdi', () => {
  it('maps the letter boundaries of each quadrant', () => {
    expect(deciduousUniversalToFdi('A')).toBe('55');
    expect(deciduousUniversalToFdi('E')).toBe('51');
    expect(deciduousUniversalToFdi('F')).toBe('61');
    expect(deciduousUniversalToFdi('J')).toBe('65');
    expect(deciduousUniversalToFdi('K')).toBe('75');
    expect(deciduousUniversalToFdi('O')).toBe('71');
    expect(deciduousUniversalToFdi('P')).toBe('81');
    expect(deciduousUniversalToFdi('T')).toBe('85');
  });
});

describe('derived tooth labels', () => {
  it('names lower-arch teeth after the right tooth', () => {
    expect(fdiToName(universalToFdi(30))).toBe('Lower Right First Molar');
    expect(fdiToName(universalToFdi(19))).toBe('Lower Left First Molar');
    expect(fdiToPalmer(universalToFdi(30))).toBe('LR6');
  });

  it('keeps the arch and side recorded on each tooth consistent with its FDI quadrant', () => {
    for (const tooth of UNIVERSAL_TEETH) {
      const quadrant = Number(tooth.fdi[0]);
      const expectedArch = quadrant === 1 || quadrant === 2 ? 'upper' : 'lower';
      const expectedSide = quadrant === 1 || quadrant === 4 ? 'right' : 'left';
      expect({
        universal: tooth.universal,
        arch: tooth.arch,
        side: tooth.side,
      }).toEqual({
        universal: tooth.universal,
        arch: expectedArch,
        side: expectedSide,
      });
    }
  });
});
