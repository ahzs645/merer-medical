/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from '@testing-library/react';

import { HorizontalChoiceScroller } from './HorizontalChoiceScroller';

// jsdom has no layout. Model a strip of five 100px choices and actual space
// reserved for its controls; this exercises scroll/resize behavior, not CSS.
let availableWidth = 240;
let reducedMotion = true;
const choiceWidth = 100;
const resizeCallbacks = new Set<() => void>();
const originalResizeObserver = global.ResizeObserver;
const originalScrollBy = HTMLElement.prototype.scrollBy;
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
const scrollBy = jest.fn(function (
  this: HTMLElement,
  options: ScrollToOptions,
) {
  this.scrollLeft += options.left ?? 0;
  fireEvent.scroll(this);
});
const scrollIntoView = jest.fn();

function row() {
  return screen.getByRole('group', { name: 'Test choices' });
}

function rect(left: number, width: number): DOMRect {
  return {
    x: left,
    y: 0,
    left,
    right: left + width,
    top: 0,
    bottom: 44,
    width,
    height: 44,
    toJSON: () => undefined,
  };
}

function rowGeometry(element: HTMLElement) {
  const hasControls = Boolean(
    element.parentElement?.querySelector(
      '[aria-label="Test choices: More choices"]',
    ),
  );
  return rect(hasControls ? 48 : 0, availableWidth - (hasControls ? 96 : 0));
}

function choices(active: number) {
  return (
    <HorizontalChoiceScroller
      label="Test choices"
      activeKey={String(active)}
      activeSelector='[aria-pressed="true"]'
    >
      {Array.from({ length: 5 }, (_, index) => (
        <button key={index} data-choice={index} aria-pressed={active === index}>
          Choice {index + 1}
        </button>
      ))}
    </HorizontalChoiceScroller>
  );
}

function finishLayout() {
  act(() => {
    jest.runOnlyPendingTimers();
  });
}

function expectChoiceVisible(index: number) {
  const bounds = row().getBoundingClientRect();
  const selected = screen
    .getByRole('button', { name: `Choice ${index + 1}`, exact: true })
    .getBoundingClientRect();
  expect(selected.left).toBeGreaterThanOrEqual(bounds.left);
  expect(selected.right).toBeLessThanOrEqual(bounds.right);
}

beforeEach(() => {
  jest.useFakeTimers();
  availableWidth = 240;
  reducedMotion = true;
  document.documentElement.dir = 'ltr';
  scrollBy.mockClear();
  scrollIntoView.mockClear();
  resizeCallbacks.clear();
  HTMLElement.prototype.scrollBy = scrollBy;
  HTMLElement.prototype.scrollIntoView = scrollIntoView;
  global.ResizeObserver = class {
    private update: () => void;
    constructor(callback: () => void) {
      this.update = callback;
      resizeCallbacks.add(callback);
    }
    observe() {}
    unobserve() {}
    disconnect() {
      resizeCallbacks.delete(this.update);
    }
  } as unknown as typeof ResizeObserver;

  jest.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: reducedMotion,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
  const nativeComputedStyle = window.getComputedStyle;
  jest.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    const style = nativeComputedStyle(element);
    if (element.getAttribute('aria-label') === 'Test choices') {
      Object.defineProperty(style, 'direction', {
        value: document.documentElement.dir,
        configurable: true,
      });
    }
    return style;
  });
  jest
    .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
    .mockImplementation(function (this: HTMLElement) {
      return this.getAttribute('aria-label') === 'Test choices'
        ? rowGeometry(this).width
        : availableWidth;
    });
  jest
    .spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
    .mockImplementation(function (this: HTMLElement) {
      return this.getAttribute('aria-label') === 'Test choices'
        ? this.children.length * choiceWidth
        : availableWidth;
    });
  jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('aria-label') === 'Test choices') {
        return rowGeometry(this);
      }
      const index = this.getAttribute('data-choice');
      if (index !== null && this.parentElement) {
        const parent = this.parentElement;
        const bounds = rowGeometry(parent);
        const start =
          document.documentElement.dir === 'rtl'
            ? bounds.right - (Number(index) + 1) * choiceWidth
            : bounds.left + Number(index) * choiceWidth;
        return rect(start - parent.scrollLeft, choiceWidth);
      }
      return rect(0, availableWidth);
    });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  global.ResizeObserver = originalResizeObserver;
  HTMLElement.prototype.scrollBy = originalScrollBy;
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
});

describe('HorizontalChoiceScroller', () => {
  it('allows browsing away from the selected choice and disables controls at the relevant edge', () => {
    render(choices(0));
    finishLayout();
    expect(
      (
        screen.getByRole('button', {
          name: 'Test choices: Previous choices',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(
      screen.getByRole('button', { name: 'Test choices: More choices' }),
    );
    expect(row().scrollLeft).toBeGreaterThan(0);
    expect(
      (
        screen.getByRole('button', {
          name: 'Test choices: Previous choices',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);

    row().scrollLeft = choiceWidth * 5 - row().clientWidth;
    fireEvent.scroll(row());
    expect(
      (
        screen.getByRole('button', {
          name: 'Test choices: More choices',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(
      screen.getByRole('button', { name: 'Test choices: Previous choices' }),
    );
    expect(row().scrollLeft).toBeLessThan(choiceWidth * 5 - row().clientWidth);
  });

  it.each(['ltr', 'rtl'])(
    'reveals a newly selected off-screen choice in %s without scrolling the page',
    (direction) => {
      document.documentElement.dir = direction;
      const view = render(choices(0));
      finishLayout();
      view.rerender(choices(4));
      finishLayout();

      expectChoiceVisible(4);
      expect(row().scrollLeft * (direction === 'rtl' ? -1 : 1)).toBeGreaterThan(
        0,
      );
      expect(scrollIntoView).not.toHaveBeenCalled();
    },
  );

  it('reveals a keyboard-focused choice without changing the active selection', () => {
    render(choices(0));
    finishLayout();
    fireEvent.focus(
      screen.getByRole('button', { name: 'Choice 5', exact: true }),
    );

    expectChoiceVisible(4);
    expect(
      screen
        .getByRole('button', { name: 'Choice 1', exact: true })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('removes the arrows when a resize makes all choices fit without the controls', () => {
    render(choices(0));
    finishLayout();
    expect(
      screen.getByRole('button', { name: 'Test choices: More choices' }),
    ).toBeTruthy();

    // The choices fit the full 550px but not the 454px left by two arrows.
    // Measuring only the narrowed row would leave those arrows stuck on.
    availableWidth = 550;
    act(() => {
      [...resizeCallbacks].forEach((update) => update());
    });
    finishLayout();
    expect(
      screen.queryByRole('button', { name: 'Test choices: More choices' }),
    ).toBeNull();
    expectChoiceVisible(4);

    availableWidth = 240;
    fireEvent(window, new Event('resize'));
    finishLayout();
    expect(
      screen.getByRole('button', { name: 'Test choices: More choices' }),
    ).toBeTruthy();
  });

  it.each([
    ['ltr', true, 'auto', 1],
    ['rtl', false, 'smooth', -1],
  ] as const)(
    'scrolls toward later choices in %s with the requested motion preference',
    (direction, reduce, behavior, sign) => {
      document.documentElement.dir = direction;
      reducedMotion = reduce;
      render(choices(0));
      finishLayout();
      fireEvent.click(
        screen.getByRole('button', { name: 'Test choices: More choices' }),
      );

      expect(scrollBy).toHaveBeenLastCalledWith({
        left: row().clientWidth * 0.8 * sign,
        behavior,
      });
    },
  );

  it('remeasures after the document direction changes without a resize event', async () => {
    render(choices(4));
    finishLayout();
    await act(async () => {
      row().scrollLeft = 0;
      document.documentElement.dir = 'rtl';
      await Promise.resolve();
    });

    expectChoiceVisible(4);
    expect(row().scrollLeft).toBeLessThan(0);
    expect(
      (
        screen.getByRole('button', {
          name: 'Test choices: More choices',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
