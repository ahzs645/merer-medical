import {
  referenceOverlayLabels,
  referenceOverlayModes,
} from '../enrichment/labEnrichment';
import { ReferenceOverlayMode } from '../enrichment/types';

/**
 * The reference standard picker, in the banner beside the search and filters.
 *
 * It rode along in the coverage card, so moving that card into a modal would
 * have taken it too — and it is the only thing on that card you act on. It
 * decides which population's ranges every result below is measured against, and
 * therefore which of them read as high or low and which lab tests the Attention
 * filter even keeps. A control that rewrites what you are reading cannot sit
 * behind a button labelled with counts; the banner already holds this page's
 * other two controls, so it joins them.
 *
 * White rather than the banner's translucent button skin: a native `<select>`
 * hands its option list to the browser, and Firefox paints those options with
 * the select's own background, so `bg-white/15` over a dark banner would give
 * white text on near-white. Solid white also matches the selected filter chip
 * directly below it.
 */
export function LabReferenceSelect({
  mode,
  setMode,
}: {
  mode: ReferenceOverlayMode;
  setMode: (mode: ReferenceOverlayMode) => void;
}) {
  return (
    <label className="inline-flex min-h-[44px] shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-100">
      Reference
      {/* h-11 is the 44px minimum touch target, and the ring/shadow are the
          banner search box's so the two controls read as one set. */}
      <select
        value={mode}
        onChange={(event) =>
          setMode(event.target.value as ReferenceOverlayMode)
        }
        className="h-11 rounded-md border-0 bg-white py-0 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
      >
        {referenceOverlayModes.map((referenceMode) => (
          <option key={referenceMode} value={referenceMode}>
            {referenceOverlayLabels[referenceMode]}
          </option>
        ))}
      </select>
    </label>
  );
}
