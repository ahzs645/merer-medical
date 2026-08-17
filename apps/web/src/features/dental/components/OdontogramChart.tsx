import {
  Odontogram,
  type ToothConditionGroup,
  type ToothDetail,
} from 'react-odontogram';
import 'react-odontogram/style.css';

/**
 * The anatomical tooth chart, alone in its own module so that
 * `react-odontogram` — and the WebGL renderer it pulls in with three.js — is
 * fetched only by the reader who opens the dental chart.
 *
 * It used to be a static import three levels inside the route tree, which put
 * three.js in the app's single entry chunk: every phone opening the timeline
 * downloaded and parsed a 3D renderer for one panel of one sub-page of one
 * specialty workspace. `ToothChartPanel` lazy-loads this file instead.
 *
 * Only the chart lives here. Everything around it — the dentition toggle, the
 * numbered grid, the per-tooth record list — is ordinary markup that should
 * still render while this is in flight.
 */
export interface OdontogramChartProps {
  teethConditions: ToothConditionGroup[];
  onSelectTooth: (universalNumber: string | null) => void;
  /** Localised labels, resolved by the caller, which holds the translator. */
  labels: { tooth: string };
}

export function OdontogramChart({
  teethConditions,
  onSelectTooth,
  labels,
}: OdontogramChartProps) {
  function handleChange(selected: ToothDetail[]) {
    const universal = selected[selected.length - 1]?.notations.universal;
    onSelectTooth(universal ? `${universal}` : null);
  }

  return (
    <Odontogram
      layout="square"
      notation="Universal"
      teethConditions={teethConditions}
      // The odontogram renders its legend only when labels are on.
      showLabels
      onChange={handleChange}
      tooltip={{
        content: (tooth) =>
          tooth ? (
            <div className="text-xs">
              <p className="font-semibold">
                {labels.tooth} {tooth.notations.universal}
              </p>
              <p>FDI {tooth.notations.fdi}</p>
              <p>{tooth.type}</p>
            </div>
          ) : null,
      }}
    />
  );
}

export default OdontogramChart;
