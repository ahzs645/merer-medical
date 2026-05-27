import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { MereNotification } from '../../models/notification/Notification.type';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useNotifications } from './useNotifications';

function variantIcon(variant: MereNotification['variant']) {
  switch (variant) {
    case 'success':
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    case 'warning':
      return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />;
    case 'error':
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    default:
      return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
  }
}

function relativeTime(iso: string, language: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), {
      addSuffix: true,
      locale: language === 'ar' ? ar : undefined,
    });
  } catch {
    return '';
  }
}

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    dismiss,
    dismissAll,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { language, t } = useInterfaceLanguage();

  function onItemClick(notification: MereNotification) {
    if (!notification.read) {
      void markRead(notification.id);
    }
    if (notification.action_route) {
      setOpen(false);
      navigate(notification.action_route);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          unreadCount > 0
            ? `${t('Notifications')}, ${unreadCount} ${t('unread')}`
            : t('Notifications')
        }
        className="relative flex w-24 flex-col items-center justify-center p-2 text-white duration-75 active:scale-90 sm:active:scale-95 md:m-1 md:w-auto md:flex-row md:justify-start md:rounded-md md:p-4"
      >
        <span className="relative h-5 w-5 text-slate-800 md:me-4 md:h-8 md:w-8 md:text-white">
          <BellIcon className="h-full w-full" />
          {unreadCount > 0 && (
            <span className="absolute -end-2 -top-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        <p className="pt-1 text-[11px] text-slate-800 md:pt-0 md:text-base md:text-white">
          {t('Alerts')}
        </p>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[75vh] flex-col rounded-t-xl bg-white shadow-xl sm:inset-x-auto sm:end-4 sm:top-4 sm:bottom-auto sm:max-h-[75vh] sm:w-96 sm:rounded-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                {t('Notifications')}
              </h2>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="text-xs font-semibold text-primary-700 hover:underline"
                  >
                    {t('Mark all read')}
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void dismissAll()}
                    className="text-xs font-semibold text-gray-500 hover:underline"
                  >
                    {t('Clear all')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('Close notifications')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-gray-500">
                  {t("You're all caught up.")}
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className={`flex items-start gap-3 px-4 py-3 ${
                        notification.read ? 'bg-white' : 'bg-primary-50'
                      }`}
                    >
                      <span className="mt-0.5 flex-shrink-0">
                        {variantIcon(notification.variant)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onItemClick(notification)}
                        className="min-w-0 flex-1 text-start"
                      >
                        {notification.title && (
                          <p className="text-sm font-semibold text-gray-900">
                            {t(notification.title)}
                          </p>
                        )}
                        <p className="text-sm text-gray-700">
                          {t(notification.message)}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {relativeTime(notification.created_at, language)}
                          {notification.action_label
                            ? ` • ${t(notification.action_label)}`
                            : ''}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => void dismiss(notification.id)}
                        aria-label={t('Dismiss notification')}
                        className="flex-shrink-0 text-gray-300 hover:text-gray-500"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
