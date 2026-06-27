import { format } from 'date-fns';
import { useState } from 'react';

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
  const [body, setBody] = useState('');
  const accent = CATEGORY_COLOR[target.category as LaneCategory] || '#0071e3';
  const dateLabel = (() => {
    const d = new Date(`${target.dayKey}T00:00:00`);
    return Number.isNaN(d.getTime()) ? target.dayKey : format(d, 'PP');
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">Comments</div>
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
            onClick={onClose}
            className="ml-3 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            placeholder="Add a comment…"
            className="focus:border-primary-500 focus:ring-primary-500 min-h-[72px] w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-400">{body.length} / 500</span>
            <button
              type="button"
              disabled={body.trim().length === 0}
              onClick={() => {
                onPost(body);
                setBody('');
              }}
              className="bg-primary rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition disabled:cursor-default disabled:bg-gray-300"
            >
              Post
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-1 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {comments.length} comment{comments.length === 1 ? '' : 's'}
          </span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          {comments.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No comments yet
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="group border-b border-gray-100 py-2.5 last:border-0"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-800">
                    {c.author || 'You'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">
                      {safeTime(c.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      className="text-[10px] text-gray-300 hover:text-red-500"
                      aria-label="Delete comment"
                    >
                      Delete
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
      </div>
    </div>
  );
}
