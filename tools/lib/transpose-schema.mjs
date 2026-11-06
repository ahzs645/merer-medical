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
import { DENTAL_KINDS, validateDentalRow } from './dental-transpose.mjs';

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
  'dentalRecords',
  'goals',
  'carePlans',
  'referrals',
  'careTeam',
  'devices',
  'immunizations',
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
    dates: ['onsetDate', 'recordedDate', 'abatementDate'],
    validate: validateConditionNotes,
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
  // Due dates are targets, so a future one is expected.
  goals: {
    required: ['id', 'description'],
    dates: ['startDate', 'dueDate'],
    futureDates: ['dueDate'],
    enums: {
      status: [
        'proposed',
        'planned',
        'active',
        'on-hold',
        'achieved',
        'cancelled',
        'completed',
      ],
    },
  },
  carePlans: {
    required: ['id', 'title', 'date'],
    dates: ['date'],
    enums: { status: ['draft', 'active', 'on-hold', 'completed', 'revoked'] },
  },
  referrals: {
    required: ['id', 'name', 'date'],
    dates: ['date'],
    enums: { status: ['open', 'active', 'done', 'completed', 'cancelled'] },
  },
  careTeam: {
    required: ['id', 'name'],
    dates: ['date'],
  },
  devices: {
    required: ['id', 'name'],
    dates: ['startDate'],
    enums: { status: ['active', 'inactive', 'entered-in-error', 'unknown'] },
  },
  immunizations: {
    required: ['id', 'vaccine', 'date'],
    dates: ['date'],
  },
  // Rules beyond these — teeth need a numberingSystem, status words per kind,
  // perio sites in mm — are in dental-transpose.mjs.
  dentalRecords: {
    required: ['id', 'kind', 'name'],
    dates: ['date', 'recallDueDate'],
    // A recall is due in the future by definition; it is not a swapped date.
    futureDates: ['recallDueDate'],
    enums: {
      kind: DENTAL_KINDS,
      numberingSystem: ['fdi', 'universal'],
    },
    validate: validateDentalRow,
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
    // A records file that combines several documents declares a convention
    // per source file instead: a Mayo letter writes 10/20/2026, a Kyiv lab
    // 20.01.2026, and one value for both would be wrong for one of them.
    const bySource = records.audit.dateConventionBySource;
    if (bySource !== undefined) {
      if (
        !bySource ||
        typeof bySource !== 'object' ||
        Array.isArray(bySource)
      ) {
        errors.push(
          'audit.dateConventionBySource: expected an object of { "file name": "DMY" | "MDY" | "YMD" | "ISO" }',
        );
      } else {
        for (const [file, value] of Object.entries(bySource)) {
          if (!CONVENTIONS.includes(value)) {
            errors.push(
              `audit.dateConventionBySource[${JSON.stringify(file)}]: expected one of ${CONVENTIONS.join(', ')}, got ${JSON.stringify(value)}`,
            );
          }
        }
      }
    }
    if (convention === undefined && bySource !== undefined) {
      // Declared per source; nothing more to say.
    } else if (convention === undefined) {
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
      if (rules.validate) errors.push(...rules.validate(row, at));

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
              // Scoped to the parent, not the section: the builder derives a
              // child's record id from `${parent.id}-${child.id}`, so `bp`
              // under January and `bp` under February are different records.
              // Checking them globally rejected the commonest shape there is —
              // the same measurement repeated over time, which is the whole
              // point of a history.
              `${section}.${rules.children.key}:${row.id}`,
              horizon,
              futureDates,
            );
          });
        }
      }
    });
  }

  warnings.push(...checkConditionLinks(records));

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
    } else if (
      horizon &&
      `${value}` > horizon &&
      !(rules.futureDates || []).includes(field)
    ) {
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

/**
 * A condition's `notes` are one entry per source statement. Each needs text,
 * and a date that is a date — they are what the condition page orders by.
 */
function validateConditionNotes(row, at) {
  const errors = [];
  if (row.notes === undefined) return errors;
  if (!Array.isArray(row.notes)) return [`${at}.notes: expected an array`];
  row.notes.forEach((note, index) => {
    if (!note || typeof note !== 'object' || !`${note.text ?? ''}`.trim()) {
      errors.push(`${at}.notes[${index}].text: required`);
    } else if (note.date !== undefined && !ISO_DATE.test(`${note.date}`)) {
      errors.push(
        `${at}.notes[${index}].date: expected YYYY-MM-DD, got ${JSON.stringify(note.date)}`,
      );
    }
  });
  return errors;
}

/**
 * `reasonConditions` / `addressesConditions` name a condition by id, name or
 * alias. One that names nothing in this file still builds — as a display-only
 * reference matched by name — but it is usually a typo, so say so.
 */
function checkConditionLinks(records) {
  const known = new Set();
  const key = (v) =>
    `${v}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  for (const c of records.conditions || []) {
    [c.id, c.name, ...(c.aliases || [])]
      .filter(Boolean)
      .forEach((v) => known.add(key(v)));
  }
  const warnings = [];
  const check = (list, at) => {
    if (list === undefined) return;
    if (!Array.isArray(list)) {
      warnings.push(`${at}: expected an array of condition ids or names`);
      return;
    }
    list
      .filter((name) => !known.has(key(name)))
      .forEach((name) =>
        warnings.push(
          `${at}: "${name}" is not a condition in this file — it will link by name only`,
        ),
      );
  };
  (records.medicationPlans || []).forEach((group, g) =>
    (group.items || []).forEach((item, i) =>
      check(
        item.reasonConditions,
        `medicationPlans[${g}].items[${i}].reasonConditions`,
      ),
    ),
  );
  (records.procedures || []).forEach((row, i) =>
    check(row.reasonConditions, `procedures[${i}].reasonConditions`),
  );
  for (const section of ['goals', 'carePlans', 'referrals']) {
    (records[section] || []).forEach((row, i) =>
      check(row.addressesConditions, `${section}[${i}].addressesConditions`),
    );
  }
  return warnings;
}
