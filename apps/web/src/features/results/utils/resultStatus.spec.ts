import { notableResultStatus, resultStatusLabel } from './resultStatus';

/**
 * The Results list badged every row: an emerald "final" on the two hundred
 * results whose source had finished with them, and a grey "No status" on the
 * forty documents whose source never set the field. Both are the normal case,
 * so the badge was loudest where it had least to say.
 */
describe('notableResultStatus', () => {
  it('says nothing about a finished result', () => {
    expect(notableResultStatus('final')).toBeUndefined();
    expect(notableResultStatus('FINAL')).toBeUndefined();
  });

  it('says nothing where the source set no status', () => {
    expect(notableResultStatus('')).toBeUndefined();
    expect(notableResultStatus(undefined)).toBeUndefined();
    expect(notableResultStatus('unknown')).toBeUndefined();
  });

  it('speaks up for a result that may still change', () => {
    expect(notableResultStatus('preliminary')).toBe('Preliminary');
    expect(notableResultStatus('registered')).toBe('Awaiting result');
    expect(notableResultStatus('partial')).toBe('Partial');
  });

  it('speaks up for a result that changed after it was issued', () => {
    expect(notableResultStatus('amended')).toBe('Amended');
    expect(notableResultStatus('corrected')).toBe('Corrected');
    expect(notableResultStatus('entered-in-error')).toBe('Entered in error');
  });
});

describe('resultStatusLabel', () => {
  it('writes the ordinary case out for the metadata grid', () => {
    // The one place the field belongs however unremarkable — but in words.
    expect(resultStatusLabel('final')).toBe('Final');
    expect(resultStatusLabel('entered-in-error')).toBe('Entered in error');
  });

  it('leaves an unset status to the grid to omit', () => {
    expect(resultStatusLabel('')).toBeUndefined();
    expect(resultStatusLabel(undefined)).toBeUndefined();
  });

  it('humanises a status it has no entry for', () => {
    expect(resultStatusLabel('not-a-real-status')).toBe('Not a real status');
  });
});
