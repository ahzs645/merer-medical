/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { type ReactNode } from 'react';

import { useListViewParams } from './useListViewParams';

function wrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    );
  };
}

/** Reads the hook and the address bar together, which is the whole point. */
function renderWithUrl(initialEntry = '/records/labs') {
  return renderHook(
    () => ({
      params: useListViewParams<'all' | 'attention'>({ defaultFilter: 'all' }),
      location: useLocation(),
    }),
    { wrapper: wrapper(initialEntry) },
  );
}

describe('useListViewParams', () => {
  it('opens on the default with a clean address', () => {
    const { result } = renderWithUrl();
    expect(result.current.params.query).toBe('');
    expect(result.current.params.filterId).toBe('all');
    expect(result.current.location.search).toBe('');
  });

  it('puts a chosen filter in the URL, so the view has an address', () => {
    const { result } = renderWithUrl();
    act(() => result.current.params.setFilterId('attention'));

    expect(result.current.params.filterId).toBe('attention');
    expect(result.current.location.search).toBe('?filter=attention');
  });

  it('reads the view back out of the URL it was given', () => {
    const { result } = renderWithUrl(
      '/records/labs?filter=attention&q=ferritin',
    );

    expect(result.current.params.filterId).toBe('attention');
    expect(result.current.params.query).toBe('ferritin');
  });

  it('drops a value equal to the default rather than spelling it out', () => {
    const { result } = renderWithUrl('/records/labs?filter=attention');
    act(() => result.current.params.setFilterId('all'));

    expect(result.current.location.search).toBe('');
  });

  it('drops an emptied search box from the address', () => {
    const { result } = renderWithUrl('/records/labs?q=ferritin');
    act(() => result.current.params.setQuery(''));

    expect(result.current.location.search).toBe('');
  });

  it('keeps params it does not own', () => {
    const { result } = renderWithUrl('/records/labs?highlight=abc');
    act(() => result.current.params.setQuery('sodium'));

    const params = new URLSearchParams(result.current.location.search);
    expect(params.get('highlight')).toBe('abc');
    expect(params.get('q')).toBe('sodium');
  });

  it('replaces rather than pushes, so typing does not fill the history', () => {
    // One entry per keystroke would mean eight presses of Back to leave a
    // search box, which is the reason this writes with `replace`.
    const { result } = renderWithUrl();
    const before = window.history.length;

    act(() => result.current.params.setQuery('f'));
    act(() => result.current.params.setQuery('fe'));
    act(() => result.current.params.setQuery('fer'));

    expect(result.current.params.query).toBe('fer');
    expect(window.history.length).toBe(before);
  });

  it('lets a page name its own filter key', () => {
    const { result } = renderHook(
      () => ({
        params: useListViewParams({
          defaultFilter: 'all',
          filterKey: 'category',
        }),
        location: useLocation(),
      }),
      { wrapper: wrapper('/records/imaging') },
    );

    act(() => result.current.params.setFilterId('scan'));
    expect(result.current.location.search).toBe('?category=scan');
  });
});
