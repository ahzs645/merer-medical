import { FormEvent, useId, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

import { FormSheet } from '../../shared/components/FormSheet';
import { StylizedSelect } from '../../shared/components/StylizedSelect';
import { TRACKER_KINDS, type TrackerKind } from './trackerTypes';

export interface TrackerEntryDraft {
  kind: TrackerKind;
  label: string;
  value: string;
  unit: string;
  recordedAt: string;
  note: string;
}

export function defaultTrackerLabel(kind: TrackerKind) {
  if (kind === 'vital') return 'Vital';
  if (kind === 'mood') return 'Mood';
  if (kind === 'sleep') return 'Sleep';
  if (kind === 'activity') return 'Activity';
  return 'Symptom';
}

function nowForInput() {
  return new Date().toISOString().slice(0, 16);
}

/**
 * Logging an entry, as a sheet on a phone and a dialog on a desktop.
 *
 * It used to be a card pinned to the top of the page, which meant Trackers —
 * a page for reading back what you have logged — opened on a blank form, with
 * the entries themselves below the fold. The form is a thing you do
 * occasionally; the entries are the thing you came for.
 *
 * Every field carries a real `<label>`. They were placeholder-only, so the
 * moment you typed a value the field stopped saying what it was, and "Value"
 * next to "Unit" next to an unlabelled datetime is not something you can come
 * back to halfway through.
 */
export function TrackerEntrySheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: TrackerEntryDraft) => Promise<void> | void;
}) {
  const fieldId = useId();
  const [kind, setKind] = useState<TrackerKind>('symptom');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [recordedAt, setRecordedAt] = useState(nowForInput);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setKind('symptom');
    setLabel('');
    setValue('');
    setUnit('');
    setRecordedAt(nowForInput());
    setNote('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        kind,
        label: label.trim() || defaultTrackerLabel(kind),
        value: value.trim(),
        unit: unit.trim(),
        recordedAt,
        note: note.trim(),
      });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    'min-h-[44px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
  const labelClass = 'block text-sm font-medium text-gray-700';

  return (
    <FormSheet open={open} title="Add tracker entry" onRequestClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="grid gap-4 px-4 py-4 sm:px-6">
          <div>
            <label htmlFor={`${fieldId}-kind`} className={labelClass}>
              Type
            </label>
            <div className="mt-1">
              <StylizedSelect
                id={`${fieldId}-kind`}
                value={kind}
                onChange={(next) => setKind(next as TrackerKind)}
                options={TRACKER_KINDS.map((item) => ({
                  value: item.kind,
                  label: item.label,
                }))}
              />
            </div>
          </div>

          <div>
            <label htmlFor={`${fieldId}-label`} className={labelClass}>
              Name
            </label>
            <input
              id={`${fieldId}-label`}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={defaultTrackerLabel(kind)}
              className={`mt-1 ${fieldClass}`}
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave blank to file it under “{defaultTrackerLabel(kind)}”.
            </p>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
            <div>
              <label htmlFor={`${fieldId}-value`} className={labelClass}>
                Value
              </label>
              <input
                id={`${fieldId}-value`}
                required
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className={`mt-1 ${fieldClass}`}
              />
            </div>
            <div>
              <label htmlFor={`${fieldId}-unit`} className={labelClass}>
                Unit
              </label>
              <input
                id={`${fieldId}-unit`}
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                className={`mt-1 ${fieldClass}`}
              />
            </div>
          </div>

          <div>
            <label htmlFor={`${fieldId}-when`} className={labelClass}>
              When
            </label>
            <input
              id={`${fieldId}-when`}
              type="datetime-local"
              value={recordedAt}
              onChange={(event) => setRecordedAt(event.target.value)}
              className={`mt-1 ${fieldClass}`}
            />
          </div>

          <div>
            <label htmlFor={`${fieldId}-note`} className={labelClass}>
              Note <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <textarea
              id={`${fieldId}-note`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className={`mt-1 ${fieldClass}`}
            />
          </div>
        </div>

        {/* Sticky so the action stays reachable while the fields scroll, the
            same contract the manual record form keeps inside this shell. */}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value.trim() || saving}
            className="bg-primary hover:bg-primary-700 inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusIcon className="h-5 w-5" />
            {saving ? 'Adding…' : 'Add entry'}
          </button>
        </div>
      </form>
    </FormSheet>
  );
}
