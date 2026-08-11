import { type ReactNode } from 'react';

/**
 * The small grey line under a record's title: reaction, status, source, whoever
 * asked for it — separated by "·", and only where there is something on both
 * sides of the mark.
 *
 * Four list pages had written this as `{item.source && <span>· {item.source}</span>}`
 * per fact, which puts the separator in front of each one rather than between
 * them. Whenever the earlier facts were absent — a visit with no class, an
 * allergy with no reaction — the row opened on a dangling bullet:
 * "· Smiles Family Dentistry".
 *
 * `leading` is for a row that really does start with something else, such as a
 * status pill, and wants the first fact marked off from it.
 */
export function FactList({
  facts,
  className = '',
  leading = false,
}: {
  /** Rendered in order; empty, null and undefined entries are dropped. */
  facts: Array<ReactNode | string | undefined | null | false>;
  className?: string;
  /** Put a separator before the first fact too (it follows a badge). */
  leading?: boolean;
}) {
  const present = facts.filter(
    (fact) =>
      fact !== null && fact !== undefined && fact !== false && fact !== '',
  );
  if (present.length === 0) return null;

  return (
    <>
      {present.map((fact, index) => (
        <span key={index} className={className}>
          {index > 0 || leading ? '· ' : ''}
          {fact}
        </span>
      ))}
    </>
  );
}
