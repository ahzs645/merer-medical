/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';

import { useUndoableDelete } from './useUndoableDelete';

// `mock`-prefixed so the hoisted jest.mock factory below may reach it.
const mockDispatch = jest.fn();
jest.mock('../../app/providers/NotificationProvider', () => ({
  useNotificationDispatch: () => mockDispatch,
}));

function lastNotification() {
  return mockDispatch.mock.calls[mockDispatch.mock.calls.length - 1][0];
}

describe('useUndoableDelete', () => {
  beforeEach(() => mockDispatch.mockClear());

  it('deletes without asking, and hands back the way to undo it', async () => {
    const remove = jest.fn();
    const restore = jest.fn();
    const { result } = renderHook(() => useUndoableDelete());

    await act(async () => {
      await result.current({
        description: 'Blood pressure entry',
        remove,
        restore,
      });
    });

    expect(remove).toHaveBeenCalled();
    // Nothing was asked first: the way back is in the toast instead.
    expect(restore).not.toHaveBeenCalled();

    const notification = lastNotification();
    expect(notification.message).toBe('Blood pressure entry deleted');
    expect(notification.variant).toBe('success');
    expect(notification.button.text).toBe('Undo');

    act(() => notification.button.action());
    expect(restore).toHaveBeenCalled();
  });

  it('reports a failed delete instead of claiming it worked', async () => {
    const remove = jest.fn().mockRejectedValue(new Error('database is closed'));
    const restore = jest.fn();
    const { result } = renderHook(() => useUndoableDelete());

    await act(async () => {
      await result.current({ description: 'Comment', remove, restore });
    });

    const notification = lastNotification();
    expect(notification.variant).toBe('error');
    expect(notification.message).toContain('database is closed');
    // No Undo offered for something that is still there.
    expect(notification.button).toBeUndefined();
  });

  it('says so when the undo itself fails, rather than failing silently', async () => {
    const restore = jest.fn().mockRejectedValue(new Error('gone'));
    const { result } = renderHook(() => useUndoableDelete());

    await act(async () => {
      await result.current({
        description: 'Comment',
        remove: jest.fn(),
        restore,
      });
    });

    const success = lastNotification();
    await act(async () => {
      success.button.action();
    });

    expect(lastNotification().variant).toBe('error');
    expect(lastNotification().message).toContain('Could not restore Comment');
  });
});
