import { RxJsonSchema, RxCollection } from 'rxdb';
import { notificationSchemaLiteral } from './Notification.schema';
import { MereNotification } from './Notification.type';

export const NotificationSchema: RxJsonSchema<MereNotification> =
  notificationSchemaLiteral;

export type NotificationCollection = RxCollection<MereNotification>;
