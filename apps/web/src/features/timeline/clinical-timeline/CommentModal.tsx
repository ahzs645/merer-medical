import { Dialog, Transition } from '@headlessui/react';
import { format } from 'date-fns';
import { Fragment, useState } from 'react';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { ClinicalTimelineComment } from '../../../models/clinical-timeline-comment/ClinicalTimelineComment.type';
import { CATEGORY_COLOR } from './types';
import { LaneCategory } from './types';
import { CommentTarget } from './useTimelineComments';

function safeTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : format(d, 'MMM d, yyyy · h:mm a');
}

export function CommentModal({
  target,
  comments,
  onPost,
  onDelete,
  onClose,
}: {
  target: CommentTarget;
  comments: ClinicalTimelineComment[];
  onPost: (body: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useInterfaceLanguage();
  const [body, setBody] = useState('');
  const [show, setShow] = useState(true);
  const accent = CATEGORY_COLOR[target.category as LaneCategory] || '#0071e3';
  const dateLabel = (() => {
    const d = new Date(`${target.dayKey}T00:00:00`);
    return Number.isNaN(d.getTime()) ? target.dayKey : format(d, 'PP');
  })();

  return (
    <Transition.Root show={show} as={Fragment} afterLeave={onClose} appear>
      <Dialog
        as="div"
        className="relative z-dialog"
        onClose={() => setShow(false)}
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
          <div className="fixed inset-0 bg-black/25" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="min-w-0">
                  <Dialog.Title
                    as="div"
                    className="text-sm font-semibold text-gray-900"
                  >
                    {t('Comments')}
                  </Dialog.Title>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                    <span
                      className="inline-block h-2 w-2 flex-shrink-0 rounded-sm"
                      style={{ backgroundColor: accent }}
                    />
                    <span className="truncate">
                      {target.item} · {dateLabel}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShow(false)}
                  className="group ms-3 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
                  aria-label={t('Close')}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-600 group-hover:bg-gray-300">
                    ✕
                  </span>
                </button>
              </div>

              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={500}
                  placeholder={t('Add a comment…')}
                  className="focus:border-primary-500 focus:ring-primary-500 min-h-[72px] w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    {body.length} / 500
                  </span>
                  <button
                    type="button"
                    disabled={body.trim().length === 0}
                    onClick={() => {
                      onPost(body);
                      setBody('');
                    }}
                    className="bg-primary rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition disabled:cursor-default disabled:bg-gray-300"
                  >
                    {t('Post')}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 pb-1 pt-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  {(comments.length === 1
                    ? t('{count} comment')
                    : t('{count} comments')
                  ).replace('{count}', `${comments.length}`)}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
                {comments.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-600">
                    {t('No comments yet')}
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="group border-b border-gray-100 py-2.5 last:border-0"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-800">
                          {c.author || t('You')}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-gray-600">
                            {safeTime(c.created_at)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDelete(c.id)}
                            className="min-h-[44px] rounded-md px-2 text-[11px] font-medium text-gray-600 hover:text-red-600"
                            aria-label={t('Delete comment')}
                          >
                            {t('Delete')}
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">
                        {c.body}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
