/**
 * The lines of a clinical note that are meant for a reader.
 *
 * One FHIR note often holds several statements joined by newlines — the
 * transposing builder writes provider, source and reference provenance as a
 * single blob — and CSS collapses those newlines, so a note arrived as one
 * run-on line: "Provider: Cleveland Clinic London Source: Letter_EA.pdf Source
 * document: manual:source-document-…".
 *
 * The `Source document:` line goes no further than here. It is an internal
 * pointer, already carried in `metadata.source_document_id` where the View
 * source button reads it from, and printing a record id at a patient is
 * machine text on a medical record.
 */
export function splitClinicalNote(text?: string): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^source document:/i.test(line));
}

/**
 * The provider a note names, for records whose `performer` field is empty.
 *
 * Packages built before the transposing builder set `performer` carry the
 * provider only as a `Provider:` line inside the note — the fact is in the
 * record, in the wrong place. Reading it back is recovery, not invention:
 * nothing is displayed that the record did not already say.
 *
 * Pair it with `withoutProviderLine` wherever the value is shown in a field
 * of its own, so the record does not state the same thing twice.
 */
export function providerFromNotes(notes: string[]): string | undefined {
  for (const note of notes) {
    const match = /^provider:\s*(.+)$/i.exec(note);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return undefined;
}

/** The same notes with that line taken out. */
export function withoutProviderLine(notes: string[]): string[] {
  return notes.filter((note) => !/^provider:\s*.+$/i.test(note));
}
