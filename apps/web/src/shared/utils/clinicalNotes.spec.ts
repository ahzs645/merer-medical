import {
  providerFromNotes,
  splitClinicalNote,
  withoutProviderLine,
} from './clinicalNotes';

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

describe('providerFromNotes', () => {
  const notes = [
    'Provider: Institute of Cell Therapy, Kyiv',
    'Source: Eisa_Georgia Lab 2026.pdf',
    'Original flag: normal',
  ];

  it('recovers a provider a package could only record in its note', () => {
    expect(providerFromNotes(notes)).toBe('Institute of Cell Therapy, Kyiv');
  });

  it('has nothing to say when no line names one', () => {
    expect(providerFromNotes(['Source: a.pdf'])).toBeUndefined();
    expect(providerFromNotes([])).toBeUndefined();
  });

  it('ignores a line that only mentions a provider in passing', () => {
    expect(
      providerFromNotes(['Discussed with the provider: see letter']),
    ).toBeUndefined();
  });

  it('drops the line once its value has a field of its own', () => {
    expect(withoutProviderLine(notes)).toEqual([
      'Source: Eisa_Georgia Lab 2026.pdf',
      'Original flag: normal',
    ]);
  });
});
