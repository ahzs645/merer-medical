import { formatCCDASectionTitle } from './ccdaSectionTitle';

describe('formatCCDASectionTitle', () => {
  it('strips the _SECTION suffix and title-cases words', () => {
    expect(formatCCDASectionTitle('HOSPITAL_COURSE_SECTION')).toBe(
      'Hospital Course',
    );
  });

  it('handles multi-word sections', () => {
    expect(formatCCDASectionTitle('MEDICATIONS_ADMINISTERED_SECTION')).toBe(
      'Medications Administered',
    );
  });

  it('strips DICOM and numeric code suffixes', () => {
    expect(
      formatCCDASectionTitle('DICOM_OBJECT_CATALOG_SECTION_DCM_121181'),
    ).toBe('Dicom Object Catalog');
  });

  it('falls back to the key when nothing is left', () => {
    expect(formatCCDASectionTitle('PROGRESS_NOTE')).toBe('Progress Note');
  });
});
