import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Dialog, Transition } from '@headlessui/react';
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
import { NavTooltip } from '../../shared/components/TabButton';

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

export function NotificationCenter({
  collapsed = false,
}: {
  /** Desktop rail is icons only; the label becomes a hover tooltip. */
  collapsed?: boolean;
} = {}) {
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
        className={`group relative flex w-24 flex-col items-center justify-center p-2 text-white duration-75 active:scale-90 sm:active:scale-95 md:m-1 md:w-auto md:flex-row md:rounded-md ${
          collapsed ? 'md:justify-center md:p-3' : 'md:justify-start md:p-4'
        }`}
      >
        <span
          className={`relative h-5 w-5 text-slate-800 md:h-8 md:w-8 md:text-white ${
            collapsed ? 'md:me-0' : 'md:me-4'
          }`}
        >
          <BellIcon className="h-full w-full" />
          {unreadCount > 0 && (
            <span className="absolute -end-2 -top-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        <p
          className={`pt-1 text-xs text-slate-800 md:pt-0 md:text-base md:text-white ${
            collapsed ? 'md:hidden' : ''
          }`}
        >
          {t('Alerts')}
        </p>
        <NavTooltip label={t('Alerts')} collapsed={collapsed} />
      </button>

      <Transition show={open} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-40"
          onClose={() => setOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className="fixed inset-0 z-40 bg-black/30"
              aria-hidden="true"
            />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <Dialog.Panel className="fixed inset-x-0 bottom-0 z-50 flex max-h-[75vh] flex-col rounded-t-xl bg-white shadow-xl sm:inset-x-auto sm:end-4 sm:top-4 sm:bottom-auto sm:max-h-[75vh] sm:w-96 sm:rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
                <Dialog.Title
                  as="h2"
                  className="text-sm font-semibold text-gray-900"
                >
                  {t('Notifications')}
                </Dialog.Title>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void markAllRead()}
                      className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-primary-700 hover:underline"
                    >
                      {t('Mark all read')}
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void dismissAll()}
                      className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-gray-500 hover:underline"
                    >
                      {t('Clear all')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t('Close notifications')}
                    className="flex h-11 w-11 items-center justify-center rounded-md text-gray-500 hover:text-gray-700"
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
                          <p className="mt-1 text-xs text-gray-500">
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
                          className="flex h-11 w-11 flex-shrink-0 items-center justify-center text-gray-500 hover:text-gray-700"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </Dialog>
      </Transition>
    </>
  );
}
