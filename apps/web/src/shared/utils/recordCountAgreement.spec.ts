import { isAllergyNegationRecord } from './allergyNegation';
import { referencedAttachmentIds } from './standaloneAttachments';

/**
 * The two rules that decide what a record *counts as*, tested on the shapes
 * that made three screens disagree.
 *
 * Each rule used to live inside whichever screen remembered it: the Records nav
 * filtered allergy negations while Summary and Export did not (6 against 11),
 * and the nav counted every attachment while Export counted none (14 against
 * 11). Nothing failed when they drifted, because no test asked what a record
 * counts as — only what each screen rendered.
 */

const negationByCode = {
  code: { coding: [{ system: 'http://snomed.info/sct', code: '716186003' }] },
};
const negationByText = { code: { text: 'No Known Allergies' } };
const notAskedByText = { code: { text: 'Not on File' } };
const dstu2Negation = {
  substance: { coding: [{ code: '409137002' }] },
};
const realAllergen = {
  code: { text: 'Penicillin G' },
  reaction: [{ manifestation: [{ text: 'Hives' }] }],
};

describe('what counts as an allergen', () => {
  it('excludes negations however the source spells them', () => {
    expect(isAllergyNegationRecord(negationByCode)).toBe(true);
    expect(isAllergyNegationRecord(negationByText)).toBe(true);
    expect(isAllergyNegationRecord(notAskedByText)).toBe(true);
    expect(isAllergyNegationRecord(dstu2Negation)).toBe(true);
  });

  it('keeps real allergens', () => {
    expect(isAllergyNegationRecord(realAllergen)).toBe(false);
  });

  it('prefers the stored display name when the resource has no text', () => {
    expect(isAllergyNegationRecord({}, 'No known drug allergy')).toBe(true);
    expect(isAllergyNegationRecord({}, 'Latex')).toBe(false);
  });

  it('treats a missing resource as not a negation, rather than throwing', () => {
    expect(isAllergyNegationRecord(undefined)).toBe(false);
    expect(isAllergyNegationRecord(null, 'anything')).toBe(false);
  });

  it('lands on the same tally every screen reports', () => {
    const stored = [
      realAllergen,
      { code: { text: 'Latex' } },
      negationByCode,
      negationByText,
      notAskedByText,
    ];
    const allergens = stored.filter((r) => !isAllergyNegationRecord(r));
    expect(allergens).toHaveLength(2);
    // The five rows are all still records; they just are not all allergens.
    expect(stored).toHaveLength(5);
  });
});

describe('which attachments are documents of their own', () => {
  const wrapper = {
    content: [{ attachment: { url: 'attachment-1' } }],
  };
  const otherWrapper = {
    content: [{ attachment: { url: 'attachment-2' } }],
  };

  it('collects the attachments a DocumentReference wraps', () => {
    const wrapped = referencedAttachmentIds([wrapper, otherWrapper]);
    expect(wrapped.has('attachment-1')).toBe(true);
    expect(wrapped.has('attachment-2')).toBe(true);
    expect(wrapped.size).toBe(2);
  });

  it('leaves a manual upload standalone, so it still counts as a document', () => {
    const wrapped = referencedAttachmentIds([wrapper]);
    const attachments = ['attachment-1', 'manual-upload-1'];
    const standalone = attachments.filter((id) => !wrapped.has(id));
    expect(standalone).toEqual(['manual-upload-1']);
  });

  it('ignores DocumentReferences carrying no attachment url', () => {
    expect(referencedAttachmentIds([{}, { content: [] }, undefined]).size).toBe(
      0,
    );
  });
});
