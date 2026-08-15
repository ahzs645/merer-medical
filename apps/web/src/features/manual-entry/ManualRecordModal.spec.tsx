/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { ManualRecordModal } from './ManualRecordModal';

// The dirty flag the close guard reads. `mock`-prefixed so the hoisted
// jest.mock factory below may reach it.
let mockIsDirty = false;

// The form and its hook are the rest of the feature; this file is only the box
// they sit in, so both are stubbed out to keep the shape under test.
jest.mock('./hooks/useManualRecordForm', () => ({
  useManualRecordForm: () => ({
    isEditing: false,
    isDirty: () => mockIsDirty,
  }),
}));
jest.mock('./ManualRecordForm', () => ({
  ManualRecordForm: () => null,
}));

// The panel is the sheet. Reached through the title's header row rather than
// Headless UI's generated ids, which change between renders.
function getPanel() {
  const header = screen.getByText('Add record').closest('div');
  if (!header?.parentElement) throw new Error('modal panel not found');

  return header.parentElement;
}

describe('ManualRecordModal', () => {
  // Headless UI's Dialog watches its panel with an IntersectionObserver, which
  // jsdom does not implement; without a stand-in every render throws before a
  // single class can be read.
  beforeAll(() => {
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  });

  beforeEach(() => {
    mockIsDirty = false;
  });

  /**
   * On a 390px phone a centred card floats with dead space around it while the
   * Save button sits hundreds of pixels down. The panel is one component in two
   * shapes: a bottom sheet below `sm`, the card it always was from `sm` up.
   */
  it('is a bottom sheet below sm and a centred card from sm up', () => {
    render(<ManualRecordModal open onClose={jest.fn()} />);

    const panel = getPanel();
    expect(panel.className).toContain('rounded-t-2xl');
    expect(panel.className).toContain('sm:rounded-lg');
    // Capped so the long form scrolls inside the sheet instead of growing past
    // the top of the screen; uncapped again from `sm` up, where the scrolling
    // body keeps its own 80vh.
    expect(panel.className).toContain('max-h-[85vh]');
    expect(panel.className).toContain('sm:max-h-none');
    expect(panel.parentElement?.className).toContain('items-end');
    expect(panel.parentElement?.className).toContain('sm:items-start');
  });

  /**
   * A top margin on a first child collapses out through the panel and leaves
   * the handle sitting on the sheet's edge instead of inside it — the bug the
   * More sheet in `TabWrapper` was fixed for. The spacing is padding on the
   * panel.
   */
  it('spaces the grab handle with padding on the panel, not margin on the handle', () => {
    render(<ManualRecordModal open onClose={jest.fn()} />);

    const panel = getPanel();
    const handle = panel.querySelector('[aria-hidden="true"]');
    expect(handle).not.toBeNull();
    expect(handle?.className).toContain('sm:hidden');
    expect(handle?.className).not.toMatch(/(^|\s)-?mt-/);
    expect(panel.className).toContain('pt-2.5');
  });

  /**
   * The form pins its Save/Cancel row with `sticky bottom-0`, which sticks to
   * whichever ancestor scrolls. Exactly one box inside the panel may scroll, or
   * the title bar scrolls away with the fields and the row unpins from the
   * sheet's bottom edge.
   */
  it('keeps the scroll on the body so the sticky Save row still pins', () => {
    render(<ManualRecordModal open onClose={jest.fn()} />);

    const panel = getPanel();
    expect(panel.className).not.toContain('overflow-y-auto');
    const scrollers = panel.querySelectorAll('.overflow-y-auto');
    expect(scrollers).toHaveLength(1);
    expect(scrollers[0].className).toContain('flex-1');
  });

  /**
   * The question is asked in the app's own dialog now, not `window.confirm`.
   * What has to hold either way: a dirty form is never discarded by the
   * dismissal itself.
   */
  it.each([
    ['the close button', () => fireEvent.click(screen.getByLabelText('Close'))],
    ['Escape', () => fireEvent.keyDown(document, { key: 'Escape' })],
  ])('still guards a dirty form against %s', (_label, dismiss) => {
    mockIsDirty = true;
    const confirmSpy = jest.spyOn(window, 'confirm');
    const onClose = jest.fn();
    render(<ManualRecordModal open onClose={onClose} />);

    dismiss();

    expect(screen.getByText('Discard unsaved changes?')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    // The browser dialog is gone for good; this is the regression guard.
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('closes only once the discard is confirmed', () => {
    mockIsDirty = true;
    const onClose = jest.fn();
    render(<ManualRecordModal open onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Close'));
    fireEvent.click(screen.getByText('Keep editing'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Close'));
    fireEvent.click(screen.getByText('Discard'));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes a clean form without asking', () => {
    mockIsDirty = false;
    const onClose = jest.fn();
    render(<ManualRecordModal open onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Close'));

    expect(screen.queryByText('Discard unsaved changes?')).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });
});
