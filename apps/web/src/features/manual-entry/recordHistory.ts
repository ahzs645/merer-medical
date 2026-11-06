import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { splitClinicalNote } from '../../shared/utils/clinicalNotes';
import { AuditLogEntry, auditActionLabel } from '../audit/auditLog';

/**
 * Everything the app already knows about how one record came to be what it
 * is, gathered in one place: when it is dated, when it was added or edited on
 * this device, what review the transposer wrote into it (and which of its
 * statements are assumptions), and what changed between saved versions.
 *
 * None of it is new data. It lived in four places — the audit log on a
 * Utilities page, `raw.audit`, the note prose and `version_history` — and a
 * person asking "where did this come from and who changed it" could reach
 * none of them from the record.
 */
export interface RecordHistoryEvent {
  at?: string;
  label: string;
  detail?: string;
}

export interface RecordReviewNote {
  text: string;
  /** A decision made to fill a gap the source left, not a copied fact. */
  assumption: boolean;
}

export interface RecordVersionChange {
  path: string;
  before?: string;
  after?: string;
}

export interface RecordVersion {
  /** 1-based: version 1 is the oldest saved. */
  from: number;
  to: number;
  changes: RecordVersionChange[];
  /** Changes beyond the ones listed. */
  more: number;
}

export interface RecordHistory {
  events: RecordHistoryEvent[];
  review?: { status?: string; verifiedAt?: string; verifiedBy?: string };
  reviewNotes: RecordReviewNote[];
  versions: RecordVersion[];
}

type AnyRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is AnyRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const ASSUMED = /\bASSUMED\b|\bASSUMPTION\b/;
const MAX_CHANGES = 12;

export function buildRecordHistory(
  item: ClinicalDocument,
  auditLog: AuditLogEntry[] = [],
): RecordHistory {
  const raw = isRecord(item.data_record.raw) ? item.data_record.raw : {};
  const resource = isRecord(raw['resource']) ? raw['resource'] : {};

  const events: RecordHistoryEvent[] = auditLog
    .filter((entry) => entry.targetId === item.id)
    .map((entry) => ({
      at: entry.occurredAt,
      label: auditActionLabel(entry.action),
      detail: entry.summary,
    }));
  if (item.metadata?.date && !item.metadata.date.startsWith('1970-01-01')) {
    events.push({ at: item.metadata.date, label: 'Date of the record' });
  }
  events.sort((a, b) => (b.at || '').localeCompare(a.at || ''));

  const audit = isRecord(raw['audit']) ? raw['audit'] : undefined;
  const review = audit
    ? {
        status: str(audit['status']),
        verifiedAt: str(audit['verifiedAt']),
        verifiedBy: str(audit['verifiedBy']),
      }
    : undefined;

  const reviewNotes: RecordReviewNote[] = [];
  const seen = new Set<string>();
  const addNote = (text: string, assumption: boolean) => {
    const trimmed = text.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    reviewNotes.push({ text: trimmed, assumption });
  };
  if (audit && Array.isArray(audit['notes'])) {
    audit['notes']
      .filter((note): note is string => typeof note === 'string')
      .forEach((note) => addNote(note, ASSUMED.test(note)));
  }
  // Assumptions live in the record's own notes, beside what they qualify.
  // Only those lines are lifted out; the rest of the note is the record.
  const notes = Array.isArray(resource['note']) ? resource['note'] : [];
  notes
    .filter(isRecord)
    .flatMap((note) => splitClinicalNote(str(note['text'])))
    .filter((line) => ASSUMED.test(line))
    .forEach((line) => addNote(line, true));

  const snapshots = [
    ...(Array.isArray(item.data_record.version_history)
      ? item.data_record.version_history
      : []),
    item.data_record.raw,
  ].map((snapshot) =>
    isRecord(snapshot) && isRecord(snapshot['resource'])
      ? snapshot['resource']
      : isRecord(snapshot)
        ? snapshot
        : {},
  );
  const versions: RecordVersion[] = [];
  for (let index = 0; index + 1 < snapshots.length; index += 1) {
    const changes = diffResources(snapshots[index], snapshots[index + 1]);
    if (changes.length === 0) continue;
    versions.push({
      from: index + 1,
      to: index + 2,
      changes: changes.slice(0, MAX_CHANGES),
      more: Math.max(0, changes.length - MAX_CHANGES),
    });
  }
  versions.reverse();

  return { events, review, reviewNotes, versions };
}

/** Leaf-by-leaf differences, skipping bookkeeping a person never typed. */
export function diffResources(
  before: AnyRecord,
  after: AnyRecord,
): RecordVersionChange[] {
  const a = flatten(before);
  const b = flatten(after);
  const paths = Array.from(new Set([...a.keys(), ...b.keys()])).sort();
  return paths
    .filter((path) => a.get(path) !== b.get(path))
    .map((path) => ({ path, before: a.get(path), after: b.get(path) }));
}

const SKIP = new Set(['id', 'meta', 'resourceType']);

function flatten(
  value: unknown,
  prefix = '',
  out = new Map<string, string>(),
): Map<string, string> {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => flatten(entry, `${prefix}[${index}]`, out));
  } else if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (!prefix && SKIP.has(key)) continue;
      flatten(entry, prefix ? `${prefix}.${key}` : key, out);
    }
  } else if (value !== undefined && value !== null && value !== '') {
    out.set(prefix, String(value));
  }
  return out;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}
