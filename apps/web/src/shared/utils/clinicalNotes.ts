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
