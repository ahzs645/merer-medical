/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { useVisitQuestions } from './useVisitQuestions';

let mockUserId = 'profile-a';
jest.mock('../../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: mockUserId }),
}));

describe('visit notes persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUserId = 'profile-a';
  });

  it('reads previously saved questions and adds purpose without losing them', () => {
    localStorage.setItem(
      'mere:visit-prep:questions:profile-a',
      JSON.stringify({
        questions: 'Which records should I bring?',
        savedAt: '2026-11-01T12:00:00Z',
      }),
    );
    const { result, unmount } = renderHook(() => useVisitQuestions());
    expect(result.current.questions).toBe('Which records should I bring?');
    expect(result.current.visitPurpose).toBe('');
    act(() => result.current.updateVisitPurpose('Annual follow-up'));
    act(() => result.current.saveQuestions());
    expect(result.current.questionsSaveStatus).toBe('saved');
    unmount();
    const restored = renderHook(() => useVisitQuestions());
    expect(restored.result.current.visitPurpose).toBe('Annual follow-up');
    expect(restored.result.current.questions).toBe(
      'Which records should I bring?',
    );
  });

  it('keeps saved visit notes separated by profile', () => {
    const { result, rerender } = renderHook(() => useVisitQuestions());
    act(() => {
      result.current.updateVisitPurpose('Profile A purpose');
      result.current.updateQuestions('Profile A question');
    });
    act(() => result.current.saveQuestions());
    mockUserId = 'profile-b';
    rerender();
    expect(result.current.visitPurpose).toBe('');
    expect(result.current.questions).toBe('');
    act(() => result.current.updateVisitPurpose('Profile B purpose'));
    act(() => result.current.saveQuestions());
    mockUserId = 'profile-a';
    rerender();
    expect(result.current.visitPurpose).toBe('Profile A purpose');
    expect(result.current.questions).toBe('Profile A question');
  });

  it('retains the edited purpose and questions after storage failure', () => {
    const { result } = renderHook(() => useVisitQuestions());
    const failure = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('storage full');
      });
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    act(() => {
      result.current.updateVisitPurpose('Follow-up');
      result.current.updateQuestions('What has changed?');
    });
    act(() => result.current.saveQuestions());
    expect(result.current.questionsSaveStatus).toBe('error');
    expect(result.current.visitPurpose).toBe('Follow-up');
    expect(result.current.questions).toBe('What has changed?');
    failure.mockRestore();
    consoleError.mockRestore();
  });
});
