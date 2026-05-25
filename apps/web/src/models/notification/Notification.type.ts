export type NotificationVariant = 'info' | 'success' | 'warning' | 'error';

export interface MereNotification {
  id: string;
  user_id: string;
  title?: string;
  message: string;
  variant: NotificationVariant;
  /** Where the notification came from, e.g. 'sync' or 'system'. */
  source?: string;
  created_at: string;
  read: boolean;
  /** Optional in-app route the notification links to when acted on. */
  action_route?: string;
  action_label?: string;
}
