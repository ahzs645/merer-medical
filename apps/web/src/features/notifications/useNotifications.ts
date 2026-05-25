import { useEffect, useMemo, useState } from 'react';
import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { MereNotification } from '../../models/notification/Notification.type';
import {
  dismissAllNotifications,
  dismissNotification,
  markAllNotificationsRead,
  markNotificationRead,
  observeNotifications,
} from '../../repositories/NotificationRepository';

export function useNotifications() {
  const db = useRxDb();
  const user = useUser();
  const userId = user?.id;
  const [notifications, setNotifications] = useState<MereNotification[]>([]);

  useEffect(() => {
    if (!db || !userId) return;
    const subscription = observeNotifications(db, userId).subscribe(
      setNotifications,
    );
    return () => subscription.unsubscribe();
  }, [db, userId]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    markRead: (id: string) => markNotificationRead(db, id),
    markAllRead: () => markAllNotificationsRead(db, userId),
    dismiss: (id: string) => dismissNotification(db, id),
    dismissAll: () => dismissAllNotifications(db, userId),
  };
}
