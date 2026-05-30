import { FormEvent, useEffect, useMemo, useState } from 'react';
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
import { AppPage } from '../../shared/components/AppPage';
import { StylizedSelect } from '../../shared/components/StylizedSelect';

type TrackerKind = 'symptom' | 'vital' | 'mood' | 'sleep' | 'activity';

type TrackerEntry = {
  id: string;
  kind: TrackerKind;
  label: string;
  value: string;
  unit: string;
  recordedAt: string;
  note: string;
};

const TRACKER_KINDS: { kind: TrackerKind; label: string }[] = [
  { kind: 'symptom', label: 'Symptom' },
  { kind: 'vital', label: 'Vital' },
  { kind: 'mood', label: 'Mood' },
  { kind: 'sleep', label: 'Sleep' },
  { kind: 'activity', label: 'Activity' },
];

function storageKey(userId: string) {
  return `mere-medical:tracker-entries:${userId}`;
}

export function TrackersTab() {
  const db = useRxDb();
  const user = useUser();
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  const [kind, setKind] = useState<TrackerKind>('symptom');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [recordedAt, setRecordedAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [note, setNote] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchEntries() {
      const records = await listWorkflowRecords<TrackerEntry>(
        db,
        user.id,
        'tracker-entry',
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

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedValue = value.trim();
    const normalizedLabel = label.trim() || defaultLabel(kind);
    if (!normalizedValue) return;

    const entry: TrackerEntry = {
      id: crypto.randomUUID(),
      kind,
      label: normalizedLabel,
      value: normalizedValue,
      unit: unit.trim(),
      recordedAt: new Date(recordedAt).toISOString(),
      note: note.trim(),
    };
    await saveTrackerEntryRecord(db, user.id, entry);
    setEntries((current) => [entry, ...current]);
    setLabel('');
    setValue('');
    setUnit('');
    setRecordedAt(new Date().toISOString().slice(0, 16));
    setNote('');
  }

  async function deleteEntry(id: string) {
    await deleteWorkflowRecord(db, user.id, id);
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <AppPage
      banner={
        <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-xl font-semibold text-gray-900">Trackers</h1>
            <p className="mt-1 text-sm text-gray-600">
              Log symptoms, vitals, mood, sleep, and activity between visits.
            </p>
          </div>
        </div>
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="grid content-start gap-4">
            <form
              onSubmit={addEntry}
              className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
            >
              <h2 className="text-sm font-semibold text-gray-900">
                Add tracker entry
              </h2>
              <div className="mt-4 grid gap-3">
                <StylizedSelect
                  value={kind}
                  onChange={(value) => setKind(value as TrackerKind)}
                  options={TRACKER_KINDS.map((item) => ({
                    value: item.kind,
                    label: item.label,
                  }))}
                />
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder={`${defaultLabel(kind)} name`}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                  <input
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="Value"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                    placeholder="Unit"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <input
                  type="datetime-local"
                  value={recordedAt}
                  onChange={(event) => setRecordedAt(event.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional note"
                  rows={3}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add entry
                </button>
              </div>
            </form>

            <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Totals</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {TRACKER_KINDS.map((item) => (
                  <div key={item.kind} className="rounded-md bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-600">
                      {item.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {counts[item.kind]}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </section>

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
        </div>
      </div>
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
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
              {entry.kind}
            </span>
            <button
              type="button"
              onClick={() => onDelete(entry.id)}
              className="text-xs font-medium text-gray-500 hover:text-red-600"
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

function defaultLabel(kind: TrackerKind) {
  if (kind === 'vital') return 'Vital';
  if (kind === 'mood') return 'Mood';
  if (kind === 'sleep') return 'Sleep';
  if (kind === 'activity') return 'Activity';
  return 'Symptom';
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
    kind: 'tracker-entry',
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
