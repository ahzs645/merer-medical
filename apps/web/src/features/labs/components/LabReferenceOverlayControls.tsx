import { ReferenceRangeDisplay } from '../../../shared/components/ReferenceRangeDisplay';
import { ReferenceOverlayMode, LabReferenceOverlay } from '../enrichment/types';

const preferredOrder: ReferenceOverlayMode[] = [
  'canadian',
  'australian',
  'uk',
  'original',
];

export function LabReferenceOverlayControls({
  overlays,
  enabledModes,
  setEnabledModes,
}: {
  overlays: LabReferenceOverlay[];
  enabledModes: ReferenceOverlayMode[];
  setEnabledModes: (modes: ReferenceOverlayMode[]) => void;
}) {
  const orderedOverlays = [...overlays].sort(
    (a, b) => preferredOrder.indexOf(a.mode) - preferredOrder.indexOf(b.mode),
  );
  const availableModes = orderedOverlays.map((overlay) => overlay.mode);

  if (orderedOverlays.length === 0) return null;

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm font-semibold text-gray-900">
          Reference overlays
        </strong>
        <div className="flex flex-wrap gap-1.5">
          <OverlayButton
            label="All"
            onClick={() => setEnabledModes(availableModes)}
          />
          <OverlayButton
            label="Canadian"
            onClick={() =>
              setEnabledModes(
                availableModes.includes('canadian') ? ['canadian'] : [],
              )
            }
          />
          <OverlayButton label="None" onClick={() => setEnabledModes([])} />
        </div>
      </div>
      <div
        role="group"
        aria-label="Reference overlays"
        className="mt-2 flex flex-wrap gap-x-4 gap-y-2"
      >
        {orderedOverlays.map((overlay) => {
          const checked = enabledModes.includes(overlay.mode);

          return (
            <label
              key={overlay.mode}
              title={overlay.display}
              className="inline-flex cursor-pointer items-start gap-1.5 text-xs font-medium text-gray-700"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  setEnabledModes(
                    checked
                      ? enabledModes.filter((mode) => mode !== overlay.mode)
                      : [...enabledModes, overlay.mode],
                  )
                }
                className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-primary-700 focus:ring-primary-500"
              />
              <span
                aria-hidden="true"
                className="mt-1 h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: overlay.color }}
              />
              <span className="pt-px">{overlay.label}</span>
              <ReferenceRangeDisplay
                range={overlay.display}
                ageBand={overlay.ageBand}
                citation={overlay.citation}
                className="min-w-0"
                rangeClassName="text-gray-500"
                ageBandClassName="text-[11px] leading-4"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function OverlayButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
    >
      {label}
    </button>
  );
}
