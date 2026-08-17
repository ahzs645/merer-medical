import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { ClinicalTimelineComment } from '../../../models/clinical-timeline-comment/ClinicalTimelineComment.type';
import { useUndoableDelete } from '../../../shared/hooks/useUndoableDelete';

/** ISO day bucket (yyyy-MM-dd) used to group comments on a data point. */
export function dayKeyFromMs(t: number): string {
  return format(t, 'yyyy-MM-dd');
}

/** Stable identity for a commented point, independent of lane split/order. */
export function commentKey(
  category: string,
  item: string,
  dayKey: string,
): string {
  return `${category}|${item}|${dayKey}`;
}

export interface CommentTarget {
  category: string;
  item: string;
  dayKey: string;
  laneTitle: string;
}

export interface TimelineCommentsApi {
  loading: boolean;
  /** Full keys (`category|item|dayKey`) that have at least one comment. */
  keysWithComments: Set<string>;
  /** Total comment count keyed by `category|item` (day-agnostic), for badges. */
  countByCategoryItem: Map<string, number>;
  getComments: (target: CommentTarget) => ClinicalTimelineComment[];
  addComment: (target: CommentTarget, body: string) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useTimelineComments(): TimelineCommentsApi {
  const db = useRxDb();
  const user = useUser();
  const deleteWithUndo = useUndoableDelete();
  const [comments, setComments] = useState<ClinicalTimelineComment[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const docs = await db.clinical_timeline_comments
      .find({ selector: { user_id: user.id } })
      .exec();
    setComments(docs.map((d) => d.toMutableJSON() as ClinicalTimelineComment));
    setLoading(false);
  }, [db, user.id]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    db.clinical_timeline_comments
      .find({ selector: { user_id: user.id } })
      .exec()
      .then((docs) => {
        if (!mounted) return;
        setComments(
          docs.map((d) => d.toMutableJSON() as ClinicalTimelineComment),
        );
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [db, user.id]);

  const { keysWithComments, countByCategoryItem, byKey } = useMemo(() => {
    const keys = new Set<string>();
    const counts = new Map<string, number>();
    const grouped = new Map<string, ClinicalTimelineComment[]>();
    for (const c of comments) {
      keys.add(c.target_key);
      const ci = `${c.category}|${c.item}`;
      counts.set(ci, (counts.get(ci) || 0) + 1);
      const arr = grouped.get(c.target_key) || [];
      arr.push(c);
      grouped.set(c.target_key, arr);
    }
    return {
      keysWithComments: keys,
      countByCategoryItem: counts,
      byKey: grouped,
    };
  }, [comments]);

  const getComments = useCallback(
    (target: CommentTarget) => {
      const key = commentKey(target.category, target.item, target.dayKey);
      const list = byKey.get(key) || [];
      return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    [byKey],
  );

  const addComment = useCallback(
    async (target: CommentTarget, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const author =
        [user.first_name, user.last_name].filter(Boolean).join(' ') || 'You';
      await db.clinical_timeline_comments.insert({
        id: generateId(),
        user_id: user.id,
        target_key: commentKey(target.category, target.item, target.dayKey),
        category: target.category,
        item: target.item,
        lane_title: target.laneTitle,
        day_key: target.dayKey,
        body: trimmed,
        author,
        created_at: new Date().toISOString(),
      });
      await reload();
    },
    [db, user.id, user.first_name, user.last_name, reload],
  );

  const deleteComment = useCallback(
    async (id: string) => {
      const doc = await db.clinical_timeline_comments.findOne(id).exec();
      if (!doc) return;
      // Kept before the row goes, so Undo can put back the note you wrote
      // rather than an approximation of it.
      const deleted = doc.toMutableJSON();
      await deleteWithUndo({
        description: 'Comment',
        remove: async () => {
          await doc.remove();
          await reload();
        },
        restore: async () => {
          await db.clinical_timeline_comments.insert(deleted);
          await reload();
        },
      });
    },
    [db, reload, deleteWithUndo],
  );

  return {
    loading,
    keysWithComments,
    countByCategoryItem,
    getComments,
    addComment,
    deleteComment,
  };
}
