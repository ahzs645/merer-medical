import {
  referenceOverlayColors,
  referenceOverlayLabels,
  referenceOverlayModes,
} from '../enrichment/labEnrichment';
import { ReferenceOverlayMode } from '../enrichment/types';

export function LabReferenceStandardControl({
  selectedMode,
  setSelectedMode,
}: {
  selectedMode: ReferenceOverlayMode;
  setSelectedMode: (mode: ReferenceOverlayMode) => void;
}) {
  return (
    <section className="rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Reference standard
          </h2>
          <p className="mt-0.5 text-xs text-gray-600">
            Table ranges and high/low status update against the selected
            standard.
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="Reference standard"
          className="flex flex-wrap gap-2"
        >
          {referenceOverlayModes.map((mode) => {
            const selected = selectedMode === mode;

            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedMode(mode)}
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                  selected
                    ? 'border-primary-700 bg-primary-50 text-primary-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: referenceOverlayColors[mode] }}
                />
                {referenceOverlayLabels[mode]}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
