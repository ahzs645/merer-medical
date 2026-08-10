/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { InfoTip } from './InfoTip';

/**
 * The point of this control is that it works where hover does not. If the
 * explanation ever needs a pointer to reach it, a phone has lost it entirely.
 */
describe('InfoTip', () => {
  const hint = 'Listing only lab tests with a high, low, or borderline result.';

  it('hides the explanation until the button is pressed', () => {
    render(<InfoTip label="Why these lab tests">{hint}</InfoTip>);

    expect(screen.queryByText(hint)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Why these lab tests' }));

    expect(screen.getByText(hint)).toBeTruthy();
  });

  it('names the button for anyone who cannot see the glyph', () => {
    render(<InfoTip label="Why these lab tests">{hint}</InfoTip>);

    const button = screen.getByRole('button', { name: 'Why these lab tests' });
    // 44px of target even though it only spends a line's worth of height.
    expect(button.className).toContain('h-11');
    expect(button.className).toContain('w-11');
  });
});
