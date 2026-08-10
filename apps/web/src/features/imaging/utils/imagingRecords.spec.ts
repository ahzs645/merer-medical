import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { FILTERS } from '../components/ImagingCategoryTabs';
import { IMAGING_CATEGORIES } from '../types';
import {
  countImagingCategories,
  filterImagingItems,
  IMAGING_PRESET_TITLE,
  inferModalityFromText,
  isImagingDocument,
  mapImagingDocument,
} from './imagingRecords';

function doc(
  patch: Partial<ClinicalDocument> & {
    data_record?: Partial<ClinicalDocument['data_record']>;
  },
): ClinicalDocument {
  return {
    id: 'doc-1',
    user_id: 'user-1',
    connection_record_id: 'connection-1',
    data_record: {
      raw: '',
      format: 'FHIR.DSTU2',
      content_type: 'application/json',
      resource_type: 'documentreference_attachment',
      version_history: [],
      ...patch.data_record,
    },
    metadata: patch.metadata,
  };
}

describe('imagingRecords', () => {
  it('does not classify generic manually uploaded PDFs as imaging', () => {
    const item = doc({
      data_record: {
        content_type: 'application/pdf',
        raw: 'base64-pdf',
      },
      metadata: {
        display_name: 'Orthodontic informed consent and financial agreement',
        manual_specialty: 'dental',
        manual_subtype: 'orthodonticConsent',
        manual_specialty_details: {
          specialty: 'dental',
          subtype: 'orthodonticConsent',
        },
      },
    });

    expect(isImagingDocument(item)).toBe(false);
  });

  it('classifies manually uploaded image attachments as imaging', () => {
    const item = doc({
      data_record: {
        content_type: 'image/jpeg',
        raw: 'base64-image',
      },
      metadata: {
        display_name: 'Intraoral photo tooth 30',
      },
    });

    expect(isImagingDocument(item)).toBe(true);
  });

  it('does not classify embedded source document screenshots as imaging', () => {
    const item = doc({
      data_record: {
        content_type: 'image/png',
        raw: 'base64-image',
      },
      metadata: {
        display_name: 'Complete Blood Count source document',
        manual_subtype: 'source-document',
        source_image: 'Screenshot 2026-04-20 at 11.32.40 AM.png',
      },
    });

    expect(isImagingDocument(item)).toBe(false);
  });

  it('classifies generic document uploads with explicit imaging metadata as imaging', () => {
    const item = doc({
      data_record: {
        content_type: 'application/pdf',
        raw: 'base64-pdf',
      },
      metadata: {
        display_name: 'Outside scan report',
        manual_imaging_details: {
          modality: 'MRI',
          bodySite: 'Right knee',
          studyType: 'Radiology report',
        },
      },
    });

    expect(isImagingDocument(item)).toBe(true);
    expect(mapImagingDocument(item)).toMatchObject({
      modality: 'MRI',
      bodySite: 'Right knee',
      studyType: 'Radiology report',
    });
  });

  // The four ways "Add image or scan" was walked through by hand. Only the
  // last two used to reach this page, and they are the two least likely to be
  // taken: most people attach a PDF and never open the optional Modality field.
  describe('records saved through the "Add image or scan" button', () => {
    it('files a PDF kept under the prefilled title as imaging', () => {
      expect(
        isImagingDocument(
          doc({
            data_record: { content_type: 'application/pdf', raw: 'base64-pdf' },
            metadata: { display_name: IMAGING_PRESET_TITLE },
          }),
        ),
      ).toBe(true);
    });

    it('files a PDF the user retitled in their own words as imaging', () => {
      expect(
        isImagingDocument(
          doc({
            data_record: { content_type: 'application/pdf', raw: 'base64-pdf' },
            metadata: { display_name: 'chest film' },
          }),
        ),
      ).toBe(true);
      expect(
        isImagingDocument(
          doc({
            data_record: { content_type: 'application/pdf', raw: 'base64-pdf' },
            metadata: { display_name: 'Chest films 2026' },
          }),
        ),
      ).toBe(true);
    });

    it('files a real image file as imaging', () => {
      expect(
        isImagingDocument(
          doc({
            data_record: { content_type: 'image/png', raw: 'base64-image' },
            metadata: { display_name: 'Left wrist' },
          }),
        ),
      ).toBe(true);
    });

    it('files a PDF with the optional Modality field filled as imaging', () => {
      expect(
        isImagingDocument(
          doc({
            data_record: { content_type: 'application/pdf', raw: 'base64-pdf' },
            metadata: {
              display_name: 'Outside study',
              manual_imaging_details: { modality: 'CT' },
            },
          }),
        ),
      ).toBe(true);
    });

    it('still leaves a document that is not imaging out of the page', () => {
      expect(
        isImagingDocument(
          doc({
            data_record: { content_type: 'application/pdf', raw: 'base64-pdf' },
            metadata: { display_name: 'Insurance card front' },
          }),
        ),
      ).toBe(false);
    });
  });

  it('counts categories as overlapping tags rather than a split of the total', () => {
    const items = [
      doc({
        data_record: { resource_type: 'diagnosticreport' },
        metadata: { display_name: 'MRI right knee report' },
      }),
    ].map(mapImagingDocument);

    const counts = countImagingCategories(items);

    expect(counts.mri).toBe(1);
    expect(counts.report).toBe(1);
    // One record, tagged twice: any UI showing these must not imply they sum
    // to the total.
    expect(counts.mri + counts.report).toBeGreaterThan(items.length);
  });

  it('tags records that match no other category as other, and can filter to them', () => {
    const unclassifiable = doc({
      data_record: { resource_type: 'media' },
      metadata: { display_name: 'Clinic visit photo' },
    });
    const classified = doc({
      data_record: { resource_type: 'imagingstudy' },
      metadata: { display_name: 'Knee series' },
    });
    const items = [unclassifiable, classified].map(mapImagingDocument);

    expect(items[0].categories).toEqual(['other']);
    expect(countImagingCategories(items).other).toBe(1);
    // The bucket has to be reachable by filtering, not only through "All".
    expect(filterImagingItems(items, '', 'other')).toEqual([items[0]]);
  });

  it('offers a filter chip for every category a record can be tagged with', () => {
    // A category with no chip is a bucket the user can never filter down to.
    const chipKeys = FILTERS.map((filter) => filter.key);

    expect(chipKeys).toEqual(expect.arrayContaining([...IMAGING_CATEGORIES]));
  });

  it('does not infer CT from OCT or incidental text', () => {
    expect(inferModalityFromText('OCT RNFL diagnostic report')).toBe('OCT');
    expect(
      inferModalityFromText('electronic consent document'),
    ).toBeUndefined();
  });
});
