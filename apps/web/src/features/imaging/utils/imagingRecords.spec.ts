import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import {
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

  it('does not infer CT from OCT or incidental text', () => {
    expect(inferModalityFromText('OCT RNFL diagnostic report')).toBe('OCT');
    expect(
      inferModalityFromText('electronic consent document'),
    ).toBeUndefined();
  });
});
