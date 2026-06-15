export type TrackerKind = 'symptom' | 'vital' | 'mood' | 'sleep' | 'activity';

export type TrackerEntry = {
  id: string;
  kind: TrackerKind;
  label: string;
  value: string;
  unit: string;
  recordedAt: string;
  note: string;
};

export const TRACKER_KINDS: { kind: TrackerKind; label: string }[] = [
  { kind: 'symptom', label: 'Symptom' },
  { kind: 'vital', label: 'Vital' },
  { kind: 'mood', label: 'Mood' },
  { kind: 'sleep', label: 'Sleep' },
  { kind: 'activity', label: 'Activity' },
];

/** Workflow-record kind used to persist tracker entries. */
export const TRACKER_ENTRY_KIND = 'tracker-entry';
