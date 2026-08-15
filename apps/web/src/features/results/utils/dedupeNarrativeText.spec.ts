import { dedupeNarrativeText } from './resultNormalization';

const SENTENCE =
  'Issued trays 1-4 of 24. Attachments placed on upper 6, 7, 10, 11 and lower 22, 27.';

describe('dedupeNarrativeText', () => {
  it('prints a repeated sentence once, under the most specific heading', () => {
    const text = dedupeNarrativeText({
      impression: SENTENCE,
      narrative: SENTENCE,
      resultNote: SENTENCE,
      providerComments: [SENTENCE],
    });

    expect(text.impression).toBe(SENTENCE);
    expect(text.narrative).toBeUndefined();
    expect(text.resultNote).toBeUndefined();
    expect(text.providerComments).toEqual([]);
  });

  it('keeps genuinely different prose under each heading', () => {
    const text = dedupeNarrativeText({
      impression: 'Within normal limits.',
      narrative: 'Full study performed without contrast.',
      resultNote: 'Repeat in six months.',
      providerComments: ['Discussed with the patient.'],
    });

    expect(text.impression).toBe('Within normal limits.');
    expect(text.narrative).toBe('Full study performed without contrast.');
    expect(text.resultNote).toBe('Repeat in six months.');
    expect(text.providerComments).toEqual(['Discussed with the patient.']);
  });

  it('treats whitespace and casing differences as the same sentence', () => {
    const text = dedupeNarrativeText({
      impression: 'Normal study.',
      narrative: '  NORMAL STUDY.  ',
      providerComments: [],
    });

    expect(text.impression).toBe('Normal study.');
    expect(text.narrative).toBeUndefined();
  });

  it('drops only the duplicate comment, not the whole list', () => {
    const text = dedupeNarrativeText({
      resultNote: 'Follow up in a week.',
      providerComments: ['Follow up in a week.', 'Bring the previous films.'],
    });

    expect(text.resultNote).toBe('Follow up in a week.');
    expect(text.providerComments).toEqual(['Bring the previous films.']);
  });

  it('leaves a report with no prose alone', () => {
    const text = dedupeNarrativeText({ providerComments: [] });
    expect(text.impression).toBeUndefined();
    expect(text.narrative).toBeUndefined();
    expect(text.providerComments).toEqual([]);
  });
});
