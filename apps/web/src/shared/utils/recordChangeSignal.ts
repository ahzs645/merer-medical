import { useEffect, useState } from 'react';

/**
 * A lightweight in-app signal for "clinical records changed" events
 * (manual add / edit / delete). Record-list hooks subscribe via
 * useRecordChangeTick and re-fetch when it increments, which lets hosts
 * refresh in place instead of forcing a full page reload — a reload is
 * jarring and, in demo mode, wipes the entire in-memory database.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function notifyRecordsChanged(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Returns a counter that increments whenever records change. Add it to a
 * data-fetch effect's dependency list to re-run the query on changes.
 */
export function useRecordChangeTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((current) => current + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return tick;
}
