import { useEffect } from 'react';
import { debounceTime } from 'rxjs/operators';

import { notifyRecordsChanged } from '../../shared/utils/recordChangeSignal';
import { useRxDb } from './RxDbProvider';

/**
 * Turns writes to `clinical_documents` into the app-wide "records changed"
 * signal, so every record screen refreshes when records actually arrive.
 *
 * Before this, the signal had exactly two publishers — the manual add/edit form
 * and the manual delete action — which meant it fired only for records the
 * reader typed themselves. A portal sync or an `.emrpkg` import could write
 * hundreds of documents and nothing on screen moved: a sync finishing while you
 * sat on Medications left Medications exactly as it was.
 *
 * The mismatch was visible in one frame, because the Records side-nav tallies
 * (`useRecordCounts`) already subscribed to the collection directly. After a
 * sync the nav read "Medications 7" beside a list showing three, and the nav
 * was the one telling the truth.
 *
 * Subscribing once here, rather than in each of the dozen hooks that consume
 * the tick, keeps a single subscription over the collection and leaves those
 * hooks unchanged. Debounced on the same 400ms `useRecordCounts` uses, so a
 * bulk import triggers one refresh rather than one per inserted row.
 *
 * The manual-entry paths still call `notifyRecordsChanged()` directly: their
 * writes land on screens the reader is looking at right then, and waiting out
 * the debounce would read as lag on your own edit.
 */
export function RecordChangeBridge() {
  const db = useRxDb();

  useEffect(() => {
    const subscription = db.clinical_documents.$.pipe(
      debounceTime(400),
    ).subscribe(() => notifyRecordsChanged());
    return () => subscription.unsubscribe();
  }, [db]);

  return null;
}
