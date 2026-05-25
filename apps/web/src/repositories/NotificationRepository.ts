import { RxDatabase } from 'rxdb';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DatabaseCollections } from '../app/providers/DatabaseCollections';
import {
  MereNotification,
  NotificationVariant,
} from '../models/notification/Notification.type';
import uuid4 from '../shared/utils/UUIDUtils';

// Keep the per-user notification log bounded so background sync events
// don't grow it without limit.
const MAX_NOTIFICATIONS_PER_USER = 100;

export type AddNotificationInput = {
  user_id: string;
  message: string;
  variant: NotificationVariant;
  title?: string;
  source?: string;
  action_route?: string;
  action_label?: string;
};

export async function addNotification(
  db: RxDatabase<DatabaseCollections>,
  input: AddNotificationInput,
): Promise<MereNotification> {
  const doc: MereNotification = {
    id: uuid4(),
    user_id: input.user_id,
    title: input.title,
    message: input.message,
    variant: input.variant,
    source: input.source,
    created_at: new Date().toISOString(),
    read: false,
    action_route: input.action_route,
    action_label: input.action_label,
  };
  await db.notifications.insert(doc);
  await pruneNotifications(db, input.user_id);
  return doc;
}

async function pruneNotifications(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
): Promise<void> {
  const docs = await db.notifications
    .find({ selector: { user_id: userId }, sort: [{ created_at: 'desc' }] })
    .exec();
  const overflow = docs.slice(MAX_NOTIFICATIONS_PER_USER);
  await Promise.all(overflow.map((doc) => doc.remove()));
}

export function observeNotifications(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
): Observable<MereNotification[]> {
  return db.notifications
    .find({ selector: { user_id: userId }, sort: [{ created_at: 'desc' }] })
    .$.pipe(map((docs) => docs.map((doc) => doc.toJSON() as MereNotification)));
}

export async function markNotificationRead(
  db: RxDatabase<DatabaseCollections>,
  id: string,
): Promise<void> {
  const doc = await db.notifications.findOne({ selector: { id } }).exec();
  if (doc && !doc.get('read')) {
    await doc.update({ $set: { read: true } });
  }
}

export async function markAllNotificationsRead(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
): Promise<void> {
  const docs = await db.notifications
    .find({ selector: { user_id: userId, read: false } })
    .exec();
  await Promise.all(docs.map((doc) => doc.update({ $set: { read: true } })));
}

export async function dismissNotification(
  db: RxDatabase<DatabaseCollections>,
  id: string,
): Promise<void> {
  const doc = await db.notifications.findOne({ selector: { id } }).exec();
  if (doc) {
    await doc.remove();
  }
}

export async function dismissAllNotifications(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
): Promise<void> {
  const docs = await db.notifications
    .find({ selector: { user_id: userId } })
    .exec();
  await Promise.all(docs.map((doc) => doc.remove()));
}
