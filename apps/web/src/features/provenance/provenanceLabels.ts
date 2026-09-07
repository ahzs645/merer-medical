import type { RecordProvenance } from './provenance';

/**
 * Provenance in the reader's words.
 *
 * The panel used to print the stored values: `Source type: manual`, `Entry
 * method: manual-entry`, `Mapping: manual`, `Original format: FHIR.DSTU2`,
 * `Content type: application/json`. Four of six fields were internal codes,
 * and the two that were not sat under a banner reading "Synced from a
 * connected source" — so a reader who did parse them was told the opposite of
 * the sentence above.
 */

const ENTRY_METHOD_LABELS: Record<
  NonNullable<RecordProvenance['entryMethod']>,
  string
> = {
  'portal-sync': 'Synced from a patient portal',
  'manual-entry': 'Entered by hand',
  'file-import': 'Imported from a file',
  'device-import': 'Imported from a device',
};

const MAPPING_LABELS: Record<
  NonNullable<RecordProvenance['mappingConfidence']>,
  string
> = {
  source: 'Kept as the source wrote it',
  mapped: 'Mapped onto standard fields',
  manual: 'Typed into this app',
  unknown: 'Unknown',
};

export function entryMethodLabel(
  entryMethod?: RecordProvenance['entryMethod'],
): string | undefined {
  return entryMethod ? ENTRY_METHOD_LABELS[entryMethod] : undefined;
}

export function mappingLabel(
  mapping?: RecordProvenance['mappingConfidence'],
): string | undefined {
  if (!mapping || mapping === 'unknown') return undefined;
  return MAPPING_LABELS[mapping];
}

/**
 * The connection's own `source` — `manual`, `epic`, `cerner`, `veradigm`. A
 * vendor name is a proper noun and stays as it is; `manual` is not one.
 */
export function sourceTypeLabel(sourceType?: string): string | undefined {
  if (!sourceType) return undefined;
  // `manual` is not a source, it is the absence of one, and "How it arrived"
  // says it in the row below. Printing both put "Entered by hand" twice in one
  // grid.
  if (sourceType === 'manual') return undefined;
  return sourceType.replace(/[-_]/g, ' ');
}

/**
 * Which read-only note a record that cannot be edited here should carry.
 *
 * "Synced from a connected source — edit it there" was said of every such
 * record, including ones that arrived in an imported package and were never
 * near a portal. The advice is only true of a sync.
 */
export function readOnlyReason(
  entryMethod?: RecordProvenance['entryMethod'],
): string {
  switch (entryMethod) {
    case 'file-import':
    case 'manual-entry':
      return 'Imported from a file — Mere keeps it as it arrived';
    case 'device-import':
      return 'Imported from a device — Mere keeps it as it arrived';
    default:
      return 'Synced from a connected source — edit it there';
  }
}
