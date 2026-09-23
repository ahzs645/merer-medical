/**
 * @jest-environment jsdom
 */
import { act, render } from '@testing-library/react';

import { isTextEntry, useSoftKeyboardOpen } from './useSoftKeyboardOpen';

function Probe() {
  return <p data-testid="kbd">{useSoftKeyboardOpen() ? 'open' : 'closed'}</p>;
}

function setHeight(height: number) {
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
}

function reading() {
  return document.querySelector('[data-testid="kbd"]')?.textContent;
}

describe('useSoftKeyboardOpen', () => {
  beforeEach(() => setHeight(852));

  it('is open only while a text field has focus and the height has dropped', () => {
    render(
      <>
        <Probe />
        <input aria-label="Name" />
      </>,
    );
    const input = document.querySelector('input') as HTMLInputElement;

    act(() => input.focus());
    expect(reading()).toBe('closed');

    act(() => setHeight(460));
    expect(reading()).toBe('open');

    act(() => setHeight(852));
    expect(reading()).toBe('closed');
  });

  it('ignores a shorter window when nothing is being typed into', () => {
    render(<Probe />);
    act(() => setHeight(460));
    expect(reading()).toBe('closed');
  });
});

describe('isTextEntry', () => {
  it('counts text fields and not checkboxes, selects or buttons', () => {
    const make = (html: string) => {
      const div = document.createElement('div');
      div.innerHTML = html;
      return div.firstElementChild;
    };
    expect(isTextEntry(make('<input type="search">'))).toBe(true);
    expect(isTextEntry(make('<textarea></textarea>'))).toBe(true);
    expect(isTextEntry(make('<input type="checkbox">'))).toBe(false);
    expect(isTextEntry(make('<select></select>'))).toBe(false);
    expect(isTextEntry(make('<input readonly>'))).toBe(false);
    expect(isTextEntry(make('<button></button>'))).toBe(false);
  });
});
