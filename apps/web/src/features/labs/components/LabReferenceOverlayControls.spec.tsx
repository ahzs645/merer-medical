/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { LabReferenceOverlayControls } from './LabReferenceOverlayControls';
import { LabReferenceOverlay } from '../enrichment/types';

const canadian: LabReferenceOverlay = {
  mode: 'canadian',
  label: 'Canadian',
  display: '1.0 - 3.5',
  color: '#16A34A',
  kind: 'range',
  unit: 'x10E9/L',
  low: 1,
  high: 3.5,
  ageBand: 'All ages',
};

/** What LYMPHS in percent actually gets back from all three standards. */
const adviceOnly: LabReferenceOverlay[] = [
  {
    mode: 'canadian',
    label: 'Canadian',
    display: 'Use absolute count',
    color: '#16A34A',
    kind: 'note',
    ageBand: 'All ages',
  },
  {
    mode: 'uk',
    label: 'UK',
    display: 'Use absolute count',
    color: '#7C3AED',
    kind: 'note',
    ageBand: 'All ages',
  },
  {
    mode: 'original',
    label: 'Original',
    display: 'Not Estab.',
    color: '#CA8A04',
    kind: 'range',
    unit: '%',
  },
];

/**
 * The panel promises a coloured band on the chart. These are about it only
 * promising one when it can keep it — three ticked checkboxes over a chart none
 * of them touched was the shape this had on every percentage lab.
 */
describe('LabReferenceOverlayControls', () => {
  it('offers no checkbox for a standard with no numbers to draw', () => {
    render(
      <LabReferenceOverlayControls
        overlays={adviceOnly}
        enabledModes={['canadian', 'original']}
        setEnabledModes={() => undefined}
      />,
    );

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByText('Reference overlays')).toBeNull();
  });

  it('still says what those standards said, in one line', () => {
    render(
      <LabReferenceOverlayControls
        overlays={adviceOnly}
        enabledModes={[]}
        setEnabledModes={() => undefined}
      />,
    );

    expect(
      screen.getByText(/No reference range to draw for this test/),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Canadian: Use absolute count · UK: Use absolute count · Original: Not Estab.',
      ),
    ).toBeTruthy();
  });

  it('renders nothing at all when there are no overlays', () => {
    const { container } = render(
      <LabReferenceOverlayControls
        overlays={[]}
        enabledModes={[]}
        setEnabledModes={() => undefined}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('keeps the checkbox for a standard that has a range', () => {
    const setEnabledModes = jest.fn();
    render(
      <LabReferenceOverlayControls
        overlays={[canadian, ...adviceOnly.slice(1)]}
        enabledModes={['canadian']}
        setEnabledModes={setEnabledModes}
      />,
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(setEnabledModes).toHaveBeenCalledWith([]);

    // The two that cannot be drawn keep their words, below the divider.
    expect(
      screen.getByText('UK: Use absolute count · Original: Not Estab.'),
    ).toBeTruthy();
  });

  it('hides the All / Canadian / None row when there is only one overlay', () => {
    render(
      <LabReferenceOverlayControls
        overlays={[canadian]}
        enabledModes={['canadian']}
        setEnabledModes={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: 'All' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'None' })).toBeNull();
  });

  it('never offers a Canadian shortcut that would clear the chart', () => {
    const setEnabledModes = jest.fn();
    render(
      <LabReferenceOverlayControls
        overlays={[
          { ...canadian, mode: 'uk', label: 'UK' },
          { ...canadian, mode: 'australian', label: 'Australian' },
        ]}
        enabledModes={['uk']}
        setEnabledModes={setEnabledModes}
      />,
    );

    // It used to render regardless and call setEnabledModes([]) — a button
    // labelled with a standard that turned every overlay off.
    expect(screen.queryByRole('button', { name: 'Canadian' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    // In the panel's own order, which puts Australian ahead of UK.
    expect(setEnabledModes).toHaveBeenCalledWith(['australian', 'uk']);
  });
});
