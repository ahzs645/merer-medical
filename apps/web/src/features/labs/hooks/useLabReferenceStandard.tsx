import { useCallback, useState } from 'react';

import { useOptionalUser } from '../../../app/providers/UserProvider';
import { referenceOverlayModes } from '../enrichment/labEnrichment';
import type { ReferenceOverlayMode } from '../enrichment/types';

const STORAGE_PREFIX = 'mere:lab-reference-standard:v1:';

/**
 * Kept as the fallback rather than changed, so an existing user's tables do not
 * silently re-band the first time they open the app after this ships. Anyone
 * whose records come from elsewhere sets it once and it sticks.
 */
export const DEFAULT_REFERENCE_STANDARD: ReferenceOverlayMode = 'canadian';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function read(userId: string): ReferenceOverlayMode {
  if (!userId || typeof window === 'undefined') {
    return DEFAULT_REFERENCE_STANDARD;
  }
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return referenceOverlayModes.includes(raw as ReferenceOverlayMode)
      ? (raw as ReferenceOverlayMode)
      : DEFAULT_REFERENCE_STANDARD;
  } catch {
    return DEFAULT_REFERENCE_STANDARD;
  }
}

function write(userId: string, value: ReferenceOverlayMode): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), value);
  } catch {
    // Best-effort: a full or unavailable localStorage just means the choice
    // won't survive a reload.
  }
}

/**
 * Which population's reference ranges lab values are banded against.
 *
 * This was `useState('canadian')` in three separate places, so every visit to
 * Labs or Results reset it — and a record imported from a UK letter had its own
 * `(L)`/`(H)` flags re-derived against Canadian ranges on every page load, with
 * no way to say otherwise for longer than one screen. "Original" honours the
 * range the source printed.
 *
 * Per-user and local to the device: it is a way of reading the records, not a
 * fact about them, so it stays out of the record store and out of exported
 * packages.
 */
export function useLabReferenceStandard(): [
  ReferenceOverlayMode,
  (next: ReferenceOverlayMode) => void,
] {
  const user = useOptionalUser();
  const userId = user?.id ?? '';
  const [standard, setStandard] = useState<ReferenceOverlayMode>(() =>
    read(userId),
  );

  const update = useCallback(
    (next: ReferenceOverlayMode) => {
      setStandard(next);
      write(userId, next);
    },
    [userId],
  );

  return [standard, update];
}
