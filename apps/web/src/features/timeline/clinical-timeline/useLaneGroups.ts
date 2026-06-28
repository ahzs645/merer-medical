import { useCallback, useEffect, useState } from 'react';

import { useUser } from '../../../app/providers/UserProvider';

export interface LaneGroup {
  name: string;
  laneIds: string[];
}

/**
 * Saved "custom groups" of lanes (a named subset to quickly show together).
 * Persisted per user in localStorage — a UI convenience, not clinical data,
 * so it stays out of the exported record.
 */
export function useLaneGroups() {
  const user = useUser();
  const storageKey = `mere.clinicalTimeline.laneGroups.${user.id}`;
  const [groups, setGroups] = useState<LaneGroup[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setGroups(raw ? (JSON.parse(raw) as LaneGroup[]) : []);
    } catch {
      setGroups([]);
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: LaneGroup[]) => {
      setGroups(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* localStorage unavailable — keep the in-memory copy only */
      }
    },
    [storageKey],
  );

  const saveGroup = useCallback(
    (name: string, laneIds: string[]) => {
      const trimmed = name.trim();
      if (!trimmed || laneIds.length === 0) return;
      persist([
        ...groups.filter((g) => g.name !== trimmed),
        { name: trimmed, laneIds },
      ]);
    },
    [groups, persist],
  );

  const deleteGroup = useCallback(
    (name: string) => {
      persist(groups.filter((g) => g.name !== name));
    },
    [groups, persist],
  );

  return { groups, saveGroup, deleteGroup };
}
