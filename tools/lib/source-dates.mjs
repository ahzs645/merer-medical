/**
 * Reading a date off a clinical document.
 *
 * `03/08/2026` is 3 August in London and 8 March in Boston, and nothing in the
 * string says which. Getting it wrong moves a result five months and nobody
 * downstream can tell, because the wrong answer is still a valid date. So the
 * convention is not guessed per-date: it is declared once for the document, in
 * `audit.dateConvention`, and every date is resolved through it.
 *
 * The declaration is the transposer's job because only the transposer can see
 * the letterhead. This module is what turns that declaration into ISO dates and
 * what says, loudly, when a date cannot be trusted.
 */

/** Day-first is the world default; month-first is essentially the US and a few dependencies. */
const MONTH_FIRST_REGIONS = new Set([
  'US',
  'AS', // American Samoa
  'FM', // Micronesia
  'GU', // Guam
  'MH', // Marshall Islands
  'MP', // Northern Mariana Islands
  'PH', // Philippines
  'PW', // Palau
  'UM',
  'VI',
]);

const YEAR_FIRST_REGIONS = new Set(['CN', 'JP', 'KR', 'TW', 'HU', 'LT', 'MN']);

export const CONVENTIONS = ['DMY', 'MDY', 'YMD', 'ISO'];

/**
 * The convention a document from this country most likely uses.
 *
 * A hint, not an answer — a US-headquartered hospital's London branch writes
 * day-first, and an international clinic may write ISO throughout. Confirm
 * against the document (a day field above 12, a zero-padded pair, a sign-off
 * date a day or two after the appointment) before trusting it.
 */
export function conventionForRegion(region) {
  const code = `${region || ''}`.trim().toUpperCase();
  if (!code) return undefined;
  if (MONTH_FIRST_REGIONS.has(code)) return 'MDY';
  if (YEAR_FIRST_REGIONS.has(code)) return 'YMD';
  return 'DMY';
}

const NUMERIC = /^(\d{1,4})[/.\-](\d{1,2})[/.\-](\d{1,4})$/;
const ISO_LIKE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_NAMES = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/**
 * Resolve one date string to ISO under a stated convention.
 *
 * Returns `{ iso, ambiguous, note }` or `{ error }`. `ambiguous` is true when
 * the string would resolve to a *different real date* under another convention
 * — that is, when both the first and second field are 12 or below. Those are
 * the ones worth a second look; `25/12/2026` is unambiguous whatever you
 * declare, because no month is 25.
 */
export function resolveSourceDate(raw, convention = 'ISO') {
  const value = `${raw ?? ''}`.trim();
  if (!value) return { error: 'empty date' };

  if (!CONVENTIONS.includes(convention)) {
    return {
      error: `unknown convention "${convention}" (use ${CONVENTIONS.join(', ')})`,
    };
  }

  const iso = ISO_LIKE.exec(value);
  if (iso) {
    return check(Number(iso[1]), Number(iso[2]), Number(iso[3]), false);
  }

  const named = parseNamedMonth(value);
  if (named) return check(named.year, named.month, named.day, false);

  const numeric = NUMERIC.exec(value);
  if (!numeric) return { error: `cannot read "${value}" as a date` };

  const [, a, b, c] = numeric.map(Number);
  let day;
  let month;
  let year;

  if (
    convention === 'YMD' ||
    (convention === 'ISO' && `${numeric[1]}`.length === 4)
  ) {
    [year, month, day] = [a, b, c];
  } else if (convention === 'MDY') {
    [month, day, year] = [a, b, c];
  } else {
    // DMY, and ISO given a non-ISO string — day-first is the safer default,
    // but the caller is told the convention was not really declared.
    [day, month, year] = [a, b, c];
  }

  year = expandYear(year);
  // Both fields 12 or under: the other convention yields a different real date.
  const ambiguous = a <= 12 && b <= 12 && a !== b;
  const result = check(year, month, day, ambiguous);
  if (result.error) return result;

  if (convention === 'ISO' && `${numeric[1]}`.length !== 4) {
    result.note = `"${value}" is not ISO; it was read day-first. Declare audit.dateConvention explicitly.`;
  } else if (ambiguous) {
    // Compute the counterpart inline rather than recursing: the flipped read of
    // an ambiguous date is itself ambiguous, so a recursive call never bottoms
    // out.
    const other = convention === 'MDY' ? 'DMY' : 'MDY';
    const flipped = check(year, day, month, false);
    result.note = flipped.error
      ? `ambiguous under ${other}, which would give an impossible date`
      : `ambiguous: ${convention} gives ${result.iso}, ${other} would give ${flipped.iso}`;
  }
  return result;
}

function parseNamedMonth(value) {
  const match =
    /^(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{2,4})$/.exec(value) ||
    /^([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{2,4})$/.exec(value);
  if (!match) return undefined;

  const dayFirst = /^\d/.test(match[1]);
  const monthWord = (dayFirst ? match[2] : match[1]).slice(0, 3).toLowerCase();
  const month = MONTH_NAMES[monthWord];
  if (!month) return undefined;

  return {
    day: Number(dayFirst ? match[1] : match[2]),
    month,
    year: expandYear(Number(match[3])),
  };
}

/** Two-digit years in a clinical record are recent, not Edwardian. */
function expandYear(year) {
  if (year >= 100) return year;
  return year <= 69 ? 2000 + year : 1900 + year;
}

function check(year, month, day, ambiguous) {
  if (!(month >= 1 && month <= 12))
    return { error: `month ${month} out of range` };
  if (!(day >= 1 && day <= 31)) return { error: `day ${day} out of range` };

  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCDate() !== day) {
    return { error: `${iso} is not a real date` };
  }
  return { iso, ambiguous };
}
