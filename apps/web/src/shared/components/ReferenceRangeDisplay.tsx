import { CitationTooltip, CitationTooltipSource } from './CitationTooltip';

export function ReferenceRangeDisplay({
  range,
  ageBand,
  citation,
  className = '',
  rangeClassName = '',
  ageBandClassName = '',
}: {
  range?: string;
  ageBand?: string;
  citation?: CitationTooltipSource;
  className?: string;
  rangeClassName?: string;
  ageBandClassName?: string;
}) {
  if (!range && !ageBand) return null;

  return (
    <div className={`grid gap-0.5 ${className}`}>
      {range ? (
        <span className={rangeClassName}>
          <CitationTooltip citation={citation}>{range}</CitationTooltip>
        </span>
      ) : null}
      {ageBand ? (
        <div className={`text-xs leading-5 text-gray-600 ${ageBandClassName}`}>
          Age band: {ageBand}
        </div>
      ) : null}
    </div>
  );
}
