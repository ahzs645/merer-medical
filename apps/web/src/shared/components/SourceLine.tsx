import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';

/**
 * Where a record came from, as its own quiet line under the card's facts.
 *
 * The source used to ride along in the "·" fact row. A merged package names
 * itself something like "Consolidated medical record (Mayo 2026, Johns Hopkins
 * 2024, Kyiv 2026, STMC 2025-26, LibreView)", so on a phone that one fact
 * wrapped to three lines on every card, often starting with a stranded "·",
 * and pushed the reaction or provider out of view. One line, cut with an
 * ellipsis, labelled so it reads as provenance rather than as part of the
 * record; the full name is kept for hover and screen readers.
 */
export function SourceLine({
  source,
  className = '',
}: {
  source?: string | null;
  className?: string;
}) {
  const { t } = useInterfaceLanguage();
  if (!source) return null;
  return (
    <p
      className={`mt-1 truncate text-xs text-gray-500 ${className}`}
      title={source}
    >
      {t('From')} {source}
    </p>
  );
}
