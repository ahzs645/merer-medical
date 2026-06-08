import { useCallback, useState } from 'react';

import type { VaccineGroup } from '@mere/immunization-forecast';

import { useUser } from '../../../app/providers/UserProvider';

/**
 * How a recommendation was dismissed:
 * - `snoozed`: hidden for now, the patient may still act on it later.
 * - `permanent`: the patient does not intend to take this vaccine.
 *
 * Both are reversible from the "dismissed" view; the distinction is shown to
 * the user so a deliberate "won't take" reads differently from a quick hide.
 */
export type DismissMode = 'snoozed' | 'permanent';

export type DismissalMap = Partial<Record<VaccineGroup, DismissMode>>;

const STORAGE_PREFIX = 'mere:immunization-dismissals:v1:';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function readDismissals(userId: string): DismissalMap {
  if (!userId || typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as DismissalMap) : {};
  } catch {
    return {};
  }
}

function writeDismissals(userId: string, value: DismissalMap): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(value));
  } catch {
    // Best-effort: a full or unavailable localStorage just means the
    // preference won't persist across sessions.
  }
}

/**
 * Per-user, persisted set of dismissed vaccine recommendations. Keyed by
 * vaccine group (not rule id) so a dismissal sticks even when the patient
 * switches country schedules.
 */
export function useDismissedRecommendations() {
  const user = useUser();
  const userId = user?.id ?? '';
  const [dismissals, setDismissals] = useState<DismissalMap>(() =>
    readDismissals(userId),
  );

  const persist = useCallback(
    (next: DismissalMap) => {
      setDismissals(next);
      writeDismissals(userId, next);
    },
    [userId],
  );

  const dismiss = useCallback(
    (group: VaccineGroup, mode: DismissMode) => {
      persist({ ...dismissals, [group]: mode });
    },
    [dismissals, persist],
  );

  const restore = useCallback(
    (group: VaccineGroup) => {
      const next = { ...dismissals };
      delete next[group];
      persist(next);
    },
    [dismissals, persist],
  );

  return { dismissals, dismiss, restore };
}
