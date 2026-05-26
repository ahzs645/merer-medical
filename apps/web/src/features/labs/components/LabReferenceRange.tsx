import { ReferenceRangeDisplay } from '../../../shared/components/ReferenceRangeDisplay';
import { LabCitation } from '../enrichment/types';

export function LabReferenceRange({
  range,
  ageBand,
  citation,
  note,
  isMappedStandard,
}: {
  range?: string;
  ageBand?: string;
  citation?: LabCitation;
  note?: string;
  isMappedStandard?: boolean;
}) {
  if (!range && !ageBand && !note && isMappedStandard !== false) return null;

  return (
    <div className="grid gap-1 text-xs text-gray-600">
      <ReferenceRangeDisplay
        range={range ? `Range: ${range}` : undefined}
        ageBand={ageBand}
        citation={citation}
        ageBandClassName="text-[11px] leading-4"
      />
      {isMappedStandard === false ? (
        <div className="text-[11px] leading-4 text-amber-700">
          No mapped standard; using source range.
        </div>
      ) : null}
      {note ? (
        <div className="text-[11px] leading-4 text-gray-500">{note}</div>
      ) : null}
    </div>
  );
}
