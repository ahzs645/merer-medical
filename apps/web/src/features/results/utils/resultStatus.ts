/**
 * FHIR's `status` in the reader's words, and only where it changes what the
 * reader would do with the row.
 *
 * Every result carries a status, and for all but a handful it is `final` — so
 * the list drew two hundred emerald "final" pills, and a grey "No status" on
 * the forty documents whose source never set the field. Neither told anybody
 * anything: a finished result is the normal case, and the absence of a status
 * is the absence of a finding, not a finding of its own (the same rule the
 * medication reconciliation badge follows).
 *
 * What is left is the exceptions — a result that may still change, or one that
 * has changed since it was issued — alongside the abnormal flag, which is the
 * thing anybody actually scans this list for.
 */
const NOTABLE_STATUS_LABELS: Record<string, string> = {
  registered: 'Awaiting result',
  partial: 'Partial',
  preliminary: 'Preliminary',
  amended: 'Amended',
  corrected: 'Corrected',
  cancelled: 'Cancelled',
  'entered-in-error': 'Entered in error',
};

/** The label for a status worth a badge, or `undefined` for the quiet ones. */
export function notableResultStatus(status?: string): string | undefined {
  return NOTABLE_STATUS_LABELS[(status || '').trim().toLowerCase()];
}

/**
 * The same value written out for the detail pane's metadata grid, which is the
 * one place a record's own fields belong however unremarkable they are. Still
 * in words rather than in FHIR's: "Final", not `final`.
 */
export function resultStatusLabel(status?: string): string | undefined {
  const trimmed = (status || '').trim();
  if (!trimmed) return undefined;
  return (
    notableResultStatus(trimmed) ||
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1).replace(/-/g, ' ')
  );
}
