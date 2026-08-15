/**
 * A `documentreference_attachment` row is usually the file hanging off a
 * DocumentReference that is already counted as a document — but a file the
 * reader uploaded here has no DocumentReference wrapper, and the Documents page
 * lists it as a document in its own right.
 *
 * Screens disagreed because neither half of that sentence was shared. The
 * Records nav counted `documentreference` plus *every* attachment (inflating by
 * each wrapped one), while Export counted no attachment at all (dropping every
 * manual upload) — 14 against 11 over the same library.
 *
 * Callers pass the DocumentReference resources they already have in hand; the
 * ids that come back are the attachments those wrap, so anything else is
 * standalone.
 */
export function referencedAttachmentIds(
  documentReferenceResources: unknown[],
): Set<string> {
  const referenced = new Set<string>();
  for (const resource of documentReferenceResources) {
    const url = (
      resource as { content?: { attachment?: { url?: string } }[] } | undefined
    )?.content?.[0]?.attachment?.url;
    if (url) referenced.add(url);
  }
  return referenced;
}
