import { BundleEntry, FhirResource } from 'fhir/r2';

import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import {
  buildTimelineCardTitle,
  getTimelineCategories,
} from './timelineCategories';

/**
 * A category missing from this map does not degrade to a plain card — the
 * grouped card treats an empty category list as "nothing here to draw" and
 * renders nothing at all, so the record disappears from the timeline
 * silently. That is what happened to referrals, which had no entry.
 */
function doc(resourceType: string) {
  return {
    id: `${resourceType}-1`,
    data_record: { resource_type: resourceType },
    metadata: { display_name: `A ${resourceType}` },
  } as unknown as ClinicalDocument<BundleEntry<FhirResource>>;
}

describe('getTimelineCategories', () => {
  it('gives a referral a category so its day is not dropped', () => {
    expect(getTimelineCategories([doc('servicerequest')])).toEqual([
      'Referrals',
    ]);
  });

  it('still returns nothing for types no card section renders', () => {
    expect(getTimelineCategories([doc('practitioner')])).toEqual([]);
  });

  it('orders categories the way the card body renders them', () => {
    expect(
      getTimelineCategories([
        doc('servicerequest'),
        doc('condition'),
        doc('immunization'),
      ]),
    ).toEqual(['Immunizations', 'Conditions', 'Referrals']);
  });
});

describe('buildTimelineCardTitle', () => {
  // Stands in for the interface translator: every string it is handed comes
  // back marked, so a title assembled without going through it is visible.
  const t = (text: string) => `<${text}>`;

  it('translates the frame and the category names, not the finished sentence', () => {
    expect(buildTimelineCardTitle(['Procedures'], t)).toBe(
      '<Your {a}>'.replace('{a}', '<Procedures>'),
    );
  });

  it('translates a two-category title through the same frame', () => {
    expect(buildTimelineCardTitle(['Labs', 'Documents'], t)).toBe(
      '<Your {a} & {b}>'.replace('{a}', '<Labs>').replace('{b}', '<Documents>'),
    );
  });

  it('keeps the overflow count out of the translated text', () => {
    // The case that stayed English: one of a combinatorial set of sentences,
    // so it can only work if the count is substituted after translation.
    expect(
      buildTimelineCardTitle(
        ['Conditions', 'Procedures', 'Labs', 'Documents', 'Goals'],
        t,
      ),
    ).toBe(
      '<Your {a}, {b}, and {n} more>'
        .replace('{a}', '<Conditions>')
        .replace('{b}', '<Procedures>')
        .replace('{n}', '3'),
    );
  });

  it('reads as English when no translator is passed', () => {
    expect(buildTimelineCardTitle(['Procedures'])).toBe('Your Procedures');
    expect(buildTimelineCardTitle(['Labs', 'Documents'])).toBe(
      'Your Labs & Documents',
    );
    expect(
      buildTimelineCardTitle(['Conditions', 'Procedures', 'Labs']),
    ).toBe('Your Conditions, Procedures, and 1 more');
  });

  it('has nothing to say about a day with no renderable category', () => {
    expect(buildTimelineCardTitle([], t)).toBe('');
  });
});
