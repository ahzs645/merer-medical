import { ReferenceRangeDisplay } from '../../../shared/components/ReferenceRangeDisplay';
import { LabCitation } from '../enrichment/types';

export function LabReferenceRange({
  range,
  sourceRange,
  label = 'Reference standard',
  ageBand,
  citation,
  note,
  isMappedStandard,
}: {
  range?: string;
  sourceRange?: string;
  label?: string;
  ageBand?: string;
  citation?: LabCitation;
  note?: string;
  isMappedStandard?: boolean;
}) {
  if (
    !range &&
    !sourceRange &&
    !ageBand &&
    !note &&
    isMappedStandard !== false
  ) {
    return null;
  }

  return (
    <div className="grid gap-1 text-xs text-gray-600">
      <ReferenceRangeDisplay
        range={range ? `${label}: ${range}` : undefined}
        ageBand={ageBand}
        citation={citation}
        ageBandClassName="text-[11px] leading-4"
      />
      {sourceRange && sourceRange !== range ? (
        <ReferenceRangeDisplay
          range={`Source range: ${sourceRange}`}
          rangeClassName="text-[11px] leading-4 text-gray-500"
        />
      ) : null}
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
