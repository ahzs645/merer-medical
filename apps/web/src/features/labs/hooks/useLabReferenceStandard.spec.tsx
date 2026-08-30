import { act, renderHook } from '@testing-library/react';

import {
  DEFAULT_REFERENCE_STANDARD,
  useLabReferenceStandard,
} from './useLabReferenceStandard';

const KEY = 'mere:lab-reference-standard:v1:';

jest.mock('../../../app/providers/UserProvider', () => ({
  useOptionalUser: () => mockUser,
}));

let mockUser: { id: string } | undefined = { id: 'user-1' };

describe('useLabReferenceStandard', () => {
  beforeEach(() => {
    mockUser = { id: 'user-1' };
    window.localStorage.clear();
  });

  it('starts on the default when nothing has been chosen', () => {
    const { result } = renderHook(() => useLabReferenceStandard());
    expect(result.current[0]).toBe(DEFAULT_REFERENCE_STANDARD);
  });

  /**
   * The point of the hook: this was `useState('canadian')` in three places, so
   * a UK record's own ranges were re-derived against Canadian ones on every
   * page load and the choice never outlived a single screen.
   */
  it('remembers a choice across remounts', () => {
    const first = renderHook(() => useLabReferenceStandard());
    act(() => first.result.current[1]('original'));
    expect(first.result.current[0]).toBe('original');

    const second = renderHook(() => useLabReferenceStandard());
    expect(second.result.current[0]).toBe('original');
    expect(window.localStorage.getItem(`${KEY}user-1`)).toBe('original');
  });

  it('keeps the choice per user', () => {
    const first = renderHook(() => useLabReferenceStandard());
    act(() => first.result.current[1]('uk'));

    mockUser = { id: 'user-2' };
    const second = renderHook(() => useLabReferenceStandard());
    expect(second.result.current[0]).toBe(DEFAULT_REFERENCE_STANDARD);
  });

  it('ignores a stored value that is not a reference standard', () => {
    window.localStorage.setItem(`${KEY}user-1`, 'atlantis');
    const { result } = renderHook(() => useLabReferenceStandard());
    expect(result.current[0]).toBe(DEFAULT_REFERENCE_STANDARD);
  });

  it('still renders without a user, and does not persist', () => {
    mockUser = undefined;
    const { result } = renderHook(() => useLabReferenceStandard());
    expect(result.current[0]).toBe(DEFAULT_REFERENCE_STANDARD);
    act(() => result.current[1]('uk'));
    expect(result.current[0]).toBe('uk');
    expect(window.localStorage.length).toBe(0);
  });
});
