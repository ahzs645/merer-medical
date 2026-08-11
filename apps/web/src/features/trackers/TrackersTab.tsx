import { useEffect, useMemo, useState } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  FaceSmileIcon,
  HeartIcon,
  MoonIcon,
  PlusIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { WorkflowRecord } from '../../models/workflow-record/WorkflowRecord.type';
import {
  deleteWorkflowRecord,
  listWorkflowRecords,
  upsertWorkflowRecord,
} from '../../repositories/WorkflowRecordRepository';
import { formatDisplayText } from '../../shared/utils/StyleUtils';
import { AppPage } from '../../shared/components/AppPage';
import {
  RecordHeaderButton,
  RecordPageHeader,
} from '../../shared/components/records/RecordPageHeader';
import { TrackerEntrySheet, type TrackerEntryDraft } from './TrackerEntrySheet';
import {
  TRACKER_ENTRY_KIND,
  TRACKER_KINDS,
  type TrackerEntry,
  type TrackerKind,
} from './trackerTypes';

function storageKey(userId: string) {
  return `mere-medical:tracker-entries:${userId}`;
}

export function TrackersTab() {
  const db = useRxDb();
  const user = useUser();
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchEntries() {
      const records = await listWorkflowRecords<TrackerEntry>(
        db,
        user.id,
        TRACKER_ENTRY_KIND,
      );
      if (records.length > 0) {
        if (isMounted) setEntries(records.map((record) => record.payload));
        return;
      }

      const legacyEntries = readLegacyTrackerEntries(user.id);
      if (legacyEntries.length > 0) {
        await Promise.all(
          legacyEntries.map((entry) =>
            saveTrackerEntryRecord(db, user.id, entry),
          ),
        );
        localStorage.removeItem(storageKey(user.id));
      }
      if (isMounted) setEntries(legacyEntries);
    }

    fetchEntries();

    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  const recentEntries = useMemo(
    () =>
      [...entries]
        .sort(
          (a, b) =>
            new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
        )
        .slice(0, 25),
    [entries],
  );

  const counts = useMemo(() => {
    return TRACKER_KINDS.reduce(
      (acc, item) => {
        acc[item.kind] = entries.filter(
          (entry) => entry.kind === item.kind,
        ).length;
        return acc;
      },
      {} as Record<TrackerKind, number>,
    );
  }, [entries]);

  async function addEntry(draft: TrackerEntryDraft) {
    const entry: TrackerEntry = {
      id: crypto.randomUUID(),
      kind: draft.kind,
      label: draft.label,
      value: draft.value,
      unit: draft.unit,
      recordedAt: new Date(draft.recordedAt).toISOString(),
      note: draft.note,
    };
    await saveTrackerEntryRecord(db, user.id, entry);
    setEntries((current) => [entry, ...current]);
  }

  async function deleteEntry(id: string) {
    await deleteWorkflowRecord(db, user.id, id);
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <AppPage
      banner={
        <RecordPageHeader
          title="Trackers"
          description="Log symptoms, vitals, mood, sleep, and activity between visits."
          action={
            <RecordHeaderButton
              onClick={() => setAddOpen(true)}
              label="Add entry"
              compact
            />
          }
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        {/* Entries first in source and on screen, totals beside them from `lg`
            and under them below it. The add form used to sit here, above both,
            so a page for reading back what you logged opened on empty fields —
            it is a sheet now, off the "Add entry" button in the banner. */}
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <section className="rounded-md bg-white shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
              <ChartBarIcon className="h-5 w-5 text-primary-700" />
              <h2 className="text-sm font-semibold text-gray-900">
                Recent entries
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {recentEntries.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <SparklesIcon className="mx-auto h-10 w-10 text-gray-400" />
                  <h3 className="mt-3 text-sm font-semibold text-gray-900">
                    No tracker entries yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Add an entry to start a patient-generated history.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="bg-primary hover:bg-primary-700 mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 text-sm font-semibold text-white shadow-sm"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add entry
                  </button>
                </div>
              ) : (
                recentEntries.map((entry) => (
                  <TrackerEntryRow
                    key={entry.id}
                    entry={entry}
                    onDelete={deleteEntry}
                  />
                ))
              )}
            </div>
          </section>

          <section className="h-fit rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Totals</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
              {TRACKER_KINDS.map((item) => (
                <div
                  key={item.kind}
                  className="flex items-baseline justify-between gap-2 rounded-md bg-gray-50 px-3 py-2"
                >
                  <span className="text-xs font-medium text-gray-600">
                    {item.label}
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    {counts[item.kind]}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <TrackerEntrySheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={addEntry}
      />
    </AppPage>
  );
}

function TrackerEntryRow({
  entry,
  onDelete,
}: {
  entry: TrackerEntry;
  onDelete: (id: string) => void;
}) {
  const Icon = trackerIcon(entry.kind);

  return (
    <article className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary-50 p-2 text-primary-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {entry.label}
              </h3>
              <p className="text-sm text-gray-700">
                {entry.value}
                {entry.unit ? ` ${entry.unit}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-gray-600">
              <ClockIcon className="h-4 w-4" />
              {formatDateTime(entry.recordedAt)}
            </div>
          </div>
          <div className="-my-1 mt-1 flex items-center gap-1">
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {formatDisplayText(entry.kind)}
            </span>
            {/* Destructive, so it gets a real touch target and a colour that
                separates it from the category pill sitting next to it. */}
            <button
              type="button"
              onClick={() => onDelete(entry.id)}
              aria-label={`Delete entry: ${entry.label}`}
              className="inline-flex min-h-[44px] items-center rounded-md px-2 text-xs font-medium text-red-700 hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              Delete
            </button>
          </div>
          {entry.note && (
            <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
              {entry.note}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function readLegacyTrackerEntries(userId: string): TrackerEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTrackerEntryRecord(
  db: Parameters<typeof upsertWorkflowRecord>[0],
  userId: string,
  entry: TrackerEntry,
): Promise<WorkflowRecord<TrackerEntry>> {
  return upsertWorkflowRecord(db, {
    id: entry.id,
    user_id: userId,
    kind: TRACKER_ENTRY_KIND,
    payload: entry,
    created_at: entry.recordedAt,
  });
}

function trackerIcon(kind: TrackerKind) {
  if (kind === 'mood') return FaceSmileIcon;
  if (kind === 'sleep') return MoonIcon;
  if (kind === 'activity') return SparklesIcon;
  if (kind === 'vital') return HeartIcon;
  return ChartBarIcon;
}

function formatDateTime(value: string) {
  try {
    return format(parseISO(value), 'MMM d, yyyy h:mm a');
  } catch {
    return value;
  }
}
