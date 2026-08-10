/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { LabReferenceSelect } from './LabReferenceSelect';

/**
 * The coverage card went into a modal and this did not go with it. If it ever
 * does, every result on the page is being judged against a standard the reader
 * cannot see, so these guard the two things that keep it usable in the banner:
 * it is named, and it is reachable by a finger.
 */
describe('LabReferenceSelect', () => {
  it('is labelled, so a bare "Canadian" is never all you see', () => {
    render(<LabReferenceSelect mode="canadian" setMode={() => undefined} />);

    const select = screen.getByLabelText('Reference') as HTMLSelectElement;
    expect(select.value).toBe('canadian');
    expect([...select.options].map((option) => option.textContent)).toEqual([
      'Canadian',
      'Australian',
      'UK',
      'Original',
    ]);
  });

  it('keeps the 44px touch target it had inside the card', () => {
    render(<LabReferenceSelect mode="uk" setMode={() => undefined} />);

    expect(screen.getByLabelText('Reference').className).toContain('h-11');
  });

  it('reports the standard the reader picked', () => {
    const setMode = jest.fn();
    render(<LabReferenceSelect mode="canadian" setMode={setMode} />);

    fireEvent.change(screen.getByLabelText('Reference'), {
      target: { value: 'australian' },
    });

    expect(setMode).toHaveBeenCalledWith('australian');
  });
});
