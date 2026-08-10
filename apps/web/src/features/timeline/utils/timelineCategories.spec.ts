import { BundleEntry, FhirResource } from 'fhir/r2';

import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { getTimelineCategories } from './timelineCategories';

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
