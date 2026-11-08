import {
  referenceOverlayLabels,
  referenceOverlayModes,
} from '../enrichment/labEnrichment';
import { ReferenceOverlayMode } from '../enrichment/types';

/** The selected range source can be changed in Lab options. */
export function LabReferenceSelect({
  mode,
  setMode,
}: {
  mode: ReferenceOverlayMode;
  setMode: (mode: ReferenceOverlayMode) => void;
}) {
  return (
    <label className="flex min-h-9 flex-wrap items-center gap-2 text-sm font-semibold text-gray-700">
      Reference
      {/* h-10 keeps a 40px touch target, and the ring/shadow are the
          banner search box's so the two controls read as one set. */}
      <select
        value={mode}
        onChange={(event) =>
          setMode(event.target.value as ReferenceOverlayMode)
        }
        className="h-10 min-w-0 max-w-full rounded-md border-0 bg-white py-0 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
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
