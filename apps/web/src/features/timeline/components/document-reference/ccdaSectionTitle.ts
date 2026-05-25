/**
 * Turn a C-CDA section key (e.g. `HOSPITAL_COURSE_SECTION`) into a
 * human-readable title (e.g. `Hospital Course`). Used by the generic
 * catch-all renderer so every C-CDA 2.1 section can be displayed, not just
 * the ones with a hand-written card.
 */
export function formatCCDASectionTitle(key: string): string {
  const words = key
    .replace(/_DCM_\d+$/, '')
    .replace(/_\d+$/, '')
    .replace(/_SECTION$/, '')
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  return words.join(' ') || key;
}
