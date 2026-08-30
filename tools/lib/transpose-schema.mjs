/**
 * The shape of a transposed clinical document.
 *
 * A `records.json` file is what sits between a source document (a PDF letter, a
 * portal export, a photographed lab slip) and a `.emrpkg`. Transposing is the
 * step that turns prose and tables into rows; building is the mechanical step
 * that turns rows into FHIR-shaped clinical documents. They are separate so the
 * judgement calls all live in one reviewable JSON file rather than inside the
 * builder.
 *
 * This module is the format's only definition. It is data, not prose, so the
 * CLI can check a file against it and hand back errors an author — human or
 * model — can act on without reading the builder.
 */

import { CONVENTIONS } from './source-dates.mjs';

/** Sections the builder reads. Anything else in the file is ignored. */
export const SECTIONS = [
  'labPanels',
  'vitals',
  'diagnosticReports',
  'imagingReports',
  'pendingResults',
  'medicationPlans',
  'clinicalEncounters',
  'conditions',
  'procedures',
  'allergies',
  'familyHistory',
  'socialHistory',
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Every rule is `{ path, check, message }`. `path` is only used to build the
 * error location, so a rule can be read on its own.
 */
const SECTION_RULES = {
  labPanels: {
    required: ['id', 'title', 'collectedAt'],
    dates: ['collectedAt'],
    children: {
      key: 'results',
      required: ['id', 'name'],
      atLeastOneOf: ['value', 'note'],
      dates: [],
    },
  },
  vitals: {
    required: ['id', 'recordedAt'],
    dates: ['recordedAt'],
    children: {
      key: 'measurements',
      required: ['id', 'name'],
      atLeastOneOf: ['value', 'components', 'note'],
      dates: ['recordedAt'],
    },
  },
  diagnosticReports: {
    required: ['id', 'title', 'studyDate'],
    dates: ['studyDate'],
  },
  // The original name for the same section. Still built, still checked.
  imagingReports: {
    required: ['id', 'title', 'studyDate'],
    dates: ['studyDate'],
  },
  medicationPlans: {
    required: ['id'],
    dates: ['encounterDate'],
    children: {
      key: 'items',
      required: ['id', 'medication'],
      dates: ['assignedDate'],
      enums: {
        adherence: [
          'taking-as-directed',
          'not-taking',
          'not-yet-started',
          'stopped',
        ],
      },
    },
  },
  clinicalEncounters: {
    required: ['id', 'title', 'encounterDate'],
    dates: ['encounterDate'],
  },
  conditions: {
    required: ['id', 'name'],
    dates: ['onsetDate', 'recordedDate'],
  },
  pendingResults: {
    required: ['id', 'name'],
    dates: ['orderedDate'],
  },
  procedures: {
    required: ['id', 'name'],
    dates: ['performedDate', 'recordedDate'],
  },
  allergies: {
    required: ['id', 'substance'],
    dates: ['recordedDate'],
    enums: {
      negationScope: [
        'general',
        'drug',
        'food',
        'environmental',
        'latex',
        'not-asked',
        'unknown',
      ],
    },
  },
  familyHistory: {
    required: ['id', 'relationship'],
    dates: ['recordedDate'],
  },
  socialHistory: {
    required: ['id', 'topic'],
    dates: ['recordedDate'],
  },
};

/**
 * Check a parsed records object.
 *
 * Returns `{ errors, warnings, counts }`. Errors mean the builder would produce
 * something wrong or would throw; warnings mean the package will build but a
 * reader will find it thinner than the source document was.
 */
export function validateRecords(records) {
  const errors = [];
  const warnings = [];
  const counts = {};

  if (!records || typeof records !== 'object' || Array.isArray(records)) {
    return { errors: ['root: expected a JSON object'], warnings, counts };
  }

  if (!records.subject || typeof records.subject !== 'object') {
    errors.push('subject: required — at minimum `{ "sex": "..." }`');
  } else {
    if (
      records.subject.dateOfBirth &&
      !ISO_DATE.test(records.subject.dateOfBirth)
    ) {
      errors.push(
        `subject.dateOfBirth: expected YYYY-MM-DD, got ${JSON.stringify(records.subject.dateOfBirth)}`,
      );
    }
  }

  if (!records.audit || typeof records.audit !== 'object') {
    warnings.push(
      'audit: missing — a transposed package with no provenance cannot be checked back against its source',
    );
  } else {
    if (!records.audit.sourceDocument) {
      warnings.push(
        'audit.sourceDocument: missing — name the file this came from',
      );
    }
    const convention = records.audit.dateConvention;
    if (convention === undefined) {
      warnings.push(
        'audit.dateConvention: missing — say how the source writes dates (DMY, MDY, YMD or ISO). Without it nobody can tell whether 03/08/2026 was read as 3 August or 8 March.',
      );
    } else if (!CONVENTIONS.includes(convention)) {
      errors.push(
        `audit.dateConvention: expected one of ${CONVENTIONS.join(', ')}, got ${JSON.stringify(convention)}`,
      );
    }
  }

  const seenIds = new Set();
  const futureDates = [];
  let total = 0;

  /**
   * A date past the day the transpose happened is the loudest symptom of a
   * day/month swap, because half of all swapped dates land in the future and a
   * clinical document almost never reports one.
   */
  const horizon =
    records.audit && ISO_DATE.test(`${records.audit.transposedAt ?? ''}`)
      ? records.audit.transposedAt
      : new Date().toISOString().slice(0, 10);

  for (const section of SECTIONS) {
    const rows = records[section];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) {
      errors.push(`${section}: expected an array`);
      continue;
    }
    counts[section] = rows.length;
    const rules = SECTION_RULES[section];

    rows.forEach((row, index) => {
      const at = `${section}[${index}]`;
      total += 1;
      checkRow(row, rules, at, errors, seenIds, section, horizon, futureDates);

      if (rules.children) {
        const kids = row[rules.children.key];
        if (kids === undefined) {
          warnings.push(`${at}.${rules.children.key}: no entries`);
        } else if (!Array.isArray(kids)) {
          errors.push(`${at}.${rules.children.key}: expected an array`);
        } else {
          kids.forEach((kid, kidIndex) => {
            checkRow(
              kid,
              rules.children,
              `${at}.${rules.children.key}[${kidIndex}]`,
              errors,
              seenIds,
              `${section}.${rules.children.key}`,
              horizon,
              futureDates,
            );
          });
        }
      }
    });
  }

  // JSON has no comment syntax, so an underscore prefix is the convention for
  // notes-to-the-reader inside a records file. They are not sections and are
  // not mistakes, so they do not earn a warning.
  const unknown = Object.keys(records).filter(
    (key) =>
      !SECTIONS.includes(key) &&
      key !== 'subject' &&
      key !== 'audit' &&
      !key.startsWith('_'),
  );
  for (const key of unknown) {
    warnings.push(
      `${key}: not a section the builder reads — its contents will not reach the package`,
    );
  }

  if (futureDates.length) {
    warnings.push(
      `${futureDates.length} date(s) fall after ${horizon}: ${futureDates.slice(0, 5).join(', ')}${futureDates.length > 5 ? ', …' : ''}. Check audit.dateConvention — a day/month swap puts about half of all dates in the future.`,
    );
  }

  if (total === 0) {
    errors.push(
      'no records found — every section was empty or absent, so the package would contain nothing',
    );
  }

  return { errors, warnings, counts };
}

function checkRow(
  row,
  rules,
  at,
  errors,
  seenIds,
  idScope,
  horizon,
  futureDates,
) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    errors.push(`${at}: expected an object`);
    return;
  }

  for (const field of rules.required || []) {
    const value = row[field];
    if (value === undefined || value === null || `${value}`.trim() === '') {
      errors.push(`${at}.${field}: required`);
    }
  }

  if (rules.atLeastOneOf) {
    const present = rules.atLeastOneOf.some(
      (field) =>
        row[field] !== undefined && row[field] !== null && row[field] !== '',
    );
    if (!present) {
      errors.push(
        `${at}: needs one of ${rules.atLeastOneOf.join(', ')} — a record with no value and no note carries nothing`,
      );
    }
  }

  for (const field of rules.dates || []) {
    const value = row[field];
    if (value === undefined || value === null) continue;
    if (!ISO_DATE.test(`${value}`)) {
      errors.push(
        `${at}.${field}: expected YYYY-MM-DD, got ${JSON.stringify(value)}`,
      );
    } else if (horizon && `${value}` > horizon) {
      futureDates.push(`${at}.${field} = ${value}`);
    }
  }

  for (const [field, allowed] of Object.entries(rules.enums || {})) {
    const value = row[field];
    if (value !== undefined && !allowed.includes(value)) {
      errors.push(
        `${at}.${field}: expected one of ${allowed.join(', ')}, got ${JSON.stringify(value)}`,
      );
    }
  }

  if (row.id !== undefined) {
    const key = `${idScope}:${row.id}`;
    if (seenIds.has(key)) {
      errors.push(
        `${at}.id: duplicate "${row.id}" — ids are what the package's record ids are derived from, so a repeat silently overwrites`,
      );
    }
    seenIds.add(key);
  }
}
