import { splitClinicalNote } from './clinicalNotes';

describe('splitClinicalNote', () => {
  it('splits a multi-statement note so it does not read as one run-on line', () => {
    expect(
      splitClinicalNote(
        'Provider: Cleveland Clinic London\nSource: Letter_EA.pdf',
      ),
    ).toEqual(['Provider: Cleveland Clinic London', 'Source: Letter_EA.pdf']);
  });

  it('drops the internal source-document pointer', () => {
    expect(
      splitClinicalNote(
        'Provider: Cleveland Clinic London\nSource document: manual:source-document-source-document-letter-ea-pdf\nOriginal flag: L',
      ),
    ).toEqual(['Provider: Cleveland Clinic London', 'Original flag: L']);
  });

  it('drops it whatever case it was written in', () => {
    expect(splitClinicalNote('SOURCE DOCUMENT: manual:abc')).toEqual([]);
  });

  it('keeps a line that merely mentions the source document', () => {
    expect(splitClinicalNote('Taken from the source document by hand')).toEqual(
      ['Taken from the source document by hand'],
    );
  });

  it('returns nothing for an absent or empty note', () => {
    expect(splitClinicalNote(undefined)).toEqual([]);
    expect(splitClinicalNote('   \n  ')).toEqual([]);
  });
});
