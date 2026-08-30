import { useCallback, useEffect, useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { RxDocument } from 'rxdb';

import { UserDocument } from '../../../models/user-document/UserDocument.type';
import { useNotificationDispatch } from '../../../app/providers/NotificationProvider';
import { useUserManagement } from '../../../app/providers/UserProvider';
import { ConfirmDeleteDialog } from '../../../shared/components/ConfirmDeleteDialog';
import { UserListItem } from './UserListItem';
import { getUserDisplayName } from '../hooks/useUserSwitchLogic';

/**
 * A profile in the switcher, with the way out of it.
 *
 * Profiles could be created — every imported package with a patient of its own
 * makes one — and never removed, so a store filled up with people you had
 * finished with and there was no screen that could do anything about it.
 */
export function ProfileRow({
  user,
  isSelected,
  isCurrent,
  canDelete,
  onSelect,
}: {
  user: RxDocument<UserDocument>;
  /** Highlighted in the switcher, i.e. what SWITCH would move to. */
  isSelected: boolean;
  /** The profile actually in use right now. */
  isCurrent: boolean;
  /** False for the last profile: the app assumes somebody is selected. */
  canDelete: boolean;
  onSelect: () => void;
}) {
  const { deleteUser, countUserRecords } = useUserManagement();
  const notifyDispatch = useNotificationDispatch();
  const [confirming, setConfirming] = useState(false);
  const [recordCount, setRecordCount] = useState<number>();
  const [busy, setBusy] = useState(false);
  const name = getUserDisplayName(user);
  const userId = user.get('id');

  // Counted when the dialog opens rather than for every row on render: the
  // number is only needed by the person about to decide, and counting a profile
  // means reading its whole record set.
  useEffect(() => {
    if (!confirming) return;
    let cancelled = false;
    setRecordCount(undefined);
    countUserRecords(userId)
      .then((count) => {
        if (!cancelled) setRecordCount(count);
      })
      .catch(() => {
        if (!cancelled) setRecordCount(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [confirming, countUserRecords, userId]);

  const confirmDelete = useCallback(async () => {
    setBusy(true);
    try {
      await deleteUser(userId);
      notifyDispatch({
        type: 'set_notification',
        message: `Deleted ${name} and their records.`,
        variant: 'success',
      });
      setConfirming(false);
    } catch (error) {
      notifyDispatch({
        type: 'set_notification',
        message: (error as Error).message,
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  }, [deleteUser, name, notifyDispatch, userId]);

  return (
    <div className="flex items-stretch gap-2">
      <div className="min-w-0 flex-1">
        <UserListItem user={user} isSelected={isSelected} onClick={onSelect} />
      </div>
      {canDelete && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          // 44px wide as well as tall: on a phone this sits beside a row the
          // whole width of the screen, and a narrow target next to a large one
          // is how you delete a profile you meant to switch to.
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-2 border-gray-200 text-gray-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          aria-label={`Delete ${name}`}
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      )}

      <ConfirmDeleteDialog
        open={confirming}
        title={`Delete ${name}?`}
        body={
          <>
            {recordCount === undefined
              ? 'Counting what is filed under this profile…'
              : `${recordCount} record${recordCount === 1 ? '' : 's'} filed under this profile will be deleted with it.`}
            {isCurrent && (
              <>
                {' '}
                This is the profile you are using, so the app will switch to
                another one.
              </>
            )}{' '}
            This cannot be undone. Export the profile first if you want to keep
            a copy.
          </>
        }
        confirmLabel="Delete profile"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
