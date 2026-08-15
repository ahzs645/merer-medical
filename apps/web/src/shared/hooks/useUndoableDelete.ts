import { useCallback } from 'react';

import { useNotificationDispatch } from '../../app/providers/NotificationProvider';

/**
 * One treatment for deleting something small you wrote yourself.
 *
 * Deleting used to mean three different things depending on where you were
 * standing: a tracker entry and a timeline comment vanished on one tap with no
 * confirmation and no way back, a manual record raised the browser's own
 * `window.confirm` (an OS dialog in an app that has designed modals for exactly
 * this), and turning off encryption got a proper explanatory modal. The two
 * with no confirmation at all were the two whose buttons sit inside a scrolling
 * list, under a thumb.
 *
 * A confirm in front of every small delete is the wrong trade — it interrupts
 * the common case to guard the rare one. This offers the reverse: the delete
 * happens, and the toast that reports it carries the way back. The notification
 * layer already supports an action button and already lives above everything
 * else, so this is the existing furniture rather than new furniture.
 *
 * Things that can't be restored faithfully — a record with attachments the
 * delete also removes — should ask first instead; `ConfirmDeleteDialog` is for
 * those.
 */
export function useUndoableDelete() {
  const notifyDispatch = useNotificationDispatch();

  return useCallback(
    async function deleteWithUndo({
      description,
      remove,
      restore,
    }: {
      /** What was deleted, as the toast will name it: "Blood pressure entry". */
      description: string;
      remove: () => Promise<void> | void;
      /** Puts it back. Runs when the reader presses Undo. */
      restore: () => Promise<void> | void;
    }) {
      try {
        await remove();
      } catch (error) {
        notifyDispatch({
          type: 'set_notification',
          message: `Could not delete ${description}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          variant: 'error',
        });
        return;
      }

      notifyDispatch({
        type: 'set_notification',
        message: `${description} deleted`,
        variant: 'success',
        button: {
          text: 'Undo',
          action: () => {
            Promise.resolve(restore()).catch((error) => {
              notifyDispatch({
                type: 'set_notification',
                message: `Could not restore ${description}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                variant: 'error',
              });
            });
          },
        },
      });
    },
    [notifyDispatch],
  );
}
