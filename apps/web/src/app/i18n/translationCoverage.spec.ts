import * as fs from 'fs';
import * as path from 'path';

import { arabicTranslations } from './translations';

/**
 * Regression guard for interface translation coverage.
 *
 * The app translates English strings to Arabic at runtime via a dictionary
 * lookup (see InterfaceLanguageProvider). Any user-facing string missing from
 * `arabicTranslations` silently stays English in Arabic mode.
 *
 * Two scanners run here, because there are two ways a string reaches the UI:
 *
 * 1. `t('literal')` — matched directly out of the source.
 * 2. `t(someVariable)` — the argument is a label pulled from an object or a
 *    lookup table (imaging filter chips, record categories, tooth-status
 *    legends, command-palette entries, manual-entry templates...). The literal
 *    never appears next to a `t(`, so scanner 1 is blind to it. Scanner 2
 *    targets those: for every file that calls `t()` with a non-literal, it
 *    also checks the UI-label string literals declared in that file and in the
 *    modules it imports directly — which is where those label tables live.
 *
 * Both scanners share one escape hatch, `knownUntranslated.json` (a sorted
 * JSON array): a string listed there is allowed to render in English, either
 * because the gap is a deliberate deferral or because the string must stay
 * English (a brand, a product name, a code).
 *
 * The 39 entries there now are all of the second kind, and arrived together
 * when scanner 2 was widened to see label tables rendered without a `t()` call
 * anywhere in the rendering file. They are:
 *
 * - **Portal and vendor names** — MyChart, Cerner, Healow, OnPatient,
 *   Allscripts, Veterans Affairs. A person picks their portal by the name on
 *   the sign-in page.
 * - **Standards and their documentation** — HL7 Eyecare IG, DICOM, FHIR
 *   VisionPrescription, Eyefinity, Compulink. Proper nouns with no translation.
 * - **Lab analyte names** — Glucose, TSH, HDL cholesterol, Urine ACR. These
 *   name the same analytes as the lab rows beside them, and a record's own
 *   content stays in the language it was recorded in; translating the graph's
 *   unit picker but not the result under it is the disagreement, not the fix.
 *
 * The intent is for that list to only shrink:
 * - New user-facing string? Add an Arabic entry to `arabicTranslations` in
 *   translations.ts (preferred), or - only if it must stay English - add the
 *   exact string to knownUntranslated.json.
 * - Translated a listed string? Remove it from knownUntranslated.json.
 *
 * NOT covered: plain JSX text with no `t()` call anywhere in the file. The
 * runtime DOM pass translates it all the same, but there is no reliable way to
 * tell prose from markup by regex, so those gaps are found by rendering the
 * app in Arabic rather than by this spec.
 */

const SRC_ROOT = path.resolve(__dirname, '../..');
const BASELINE_PATH = path.join(__dirname, 'knownUntranslated.json');
const BASELINE_RELATIVE = 'apps/web/src/app/i18n/knownUntranslated.json';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const EXCLUDED_DIRECTORIES = new Set(['assets', 'test-utils', 'node_modules']);

function isSpecFile(fileName: string): boolean {
  return /\.spec\./.test(fileName);
}

function collectSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
        collectSourceFiles(path.join(dir, entry.name), files);
      }
      continue;
    }
    if (
      SOURCE_EXTENSIONS.has(path.extname(entry.name)) &&
      !isSpecFile(entry.name)
    ) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

// Matches single-argument t('...') / t("...") calls, including calls that
// prettier breaks across lines with a trailing comma:
//   t(
//     'Some long string',
//   )
// Template literals and multi-argument calls are intentionally not matched.
const T_CALL_PATTERN = /\bt\(\s*(['"])((?:\\.|(?!\1)[^\\\n])*)\1\s*,?\s*\)/g;

function unescapeLiteral(raw: string): string {
  return raw.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n');
}

/** Mirror of the normalization InterfaceLanguageProvider applies on lookup. */
function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function extractTranslatableStrings(): Map<string, string[]> {
  const stringsToFiles = new Map<string, string[]>();
  for (const file of collectSourceFiles(SRC_ROOT)) {
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes('t(')) {
      continue;
    }
    for (const match of source.matchAll(T_CALL_PATTERN)) {
      const literal = normalize(unescapeLiteral(match[2]));
      if (!literal) {
        continue;
      }
      const files = stringsToFiles.get(literal) ?? [];
      if (!files.includes(file)) {
        files.push(file);
      }
      stringsToFiles.set(literal, files);
    }
  }
  return stringsToFiles;
}

// Matches t() called with something that is not a string literal — an
// identifier, a member expression, or an index lookup. These are the call
// sites T_CALL_PATTERN cannot see through.
const DYNAMIC_T_CALL_PATTERN =
  /\bt\(\s*(?!['"`)])[A-Za-z_$][\w$.[\]'"?]*\s*(?:\?\?[^)]*)?\)/;

// Object properties that hold user-visible copy in this codebase's label
// tables. Deliberately narrow: `name`, `value` and friends are just as often
// identifiers, codes or clinical terms, and would flood the check with noise.
const UI_LABEL_PROPERTY_PATTERN =
  /\b(?:label|title|heading|description|shortLabel|subtitle|blurb)\s*:\s*(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;

/**
 * A component reading one of those properties off a table — `item.blurb`,
 * `category.label`. It is the other way a label table reaches the DOM, and the
 * one that let all eight Records-hub blurbs ship untranslated: `RecordsHub.tsx`
 * rendered `item.blurb` as plain JSX and called `t()` nowhere at all, so
 * neither scanner ever opened the file that declares them.
 */
const RENDERED_LABEL_ACCESS_PATTERN =
  /\b[A-Za-z_$][\w$]*\.(?:label|title|heading|description|shortLabel|subtitle|blurb)\b/;

const LOCAL_IMPORT_PATTERN = /from\s+'(\.[^']+)'/g;

/**
 * Files whose label tables reach the interface: every file that calls
 * `t(variable)` or renders a label property off an object, plus the local
 * modules each imports directly (label tables are routinely declared one file
 * over from the component that renders them).
 */
function collectDynamicLabelFiles(allFiles: string[]): Set<string> {
  const known = new Set(allFiles);
  const result = new Set<string>();

  for (const file of allFiles) {
    const source = fs.readFileSync(file, 'utf8');
    if (
      !DYNAMIC_T_CALL_PATTERN.test(source) &&
      !RENDERED_LABEL_ACCESS_PATTERN.test(source)
    ) {
      continue;
    }
    result.add(file);

    for (const match of source.matchAll(LOCAL_IMPORT_PATTERN)) {
      for (const suffix of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        const resolved = path.join(file, '..', `${match[1]}${suffix}`);
        if (known.has(resolved)) {
          result.add(resolved);
        }
      }
    }
  }

  return result;
}

function extractDynamicLabelStrings(): Map<string, string[]> {
  const stringsToFiles = new Map<string, string[]>();

  for (const file of collectDynamicLabelFiles(collectSourceFiles(SRC_ROOT))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(UI_LABEL_PROPERTY_PATTERN)) {
      const literal = normalize(unescapeLiteral(match[2]));
      // Needs at least two consecutive letters to be prose rather than a
      // code, a unit or a punctuation-only marker.
      if (!/[A-Za-z]{2}/.test(literal)) {
        continue;
      }
      const files = stringsToFiles.get(literal) ?? [];
      if (!files.includes(file)) {
        files.push(file);
      }
      stringsToFiles.set(literal, files);
    }
  }

  return stringsToFiles;
}

function loadBaseline(): string[] {
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as string[];
}

/** Placeholder tokens such as {count} that must survive translation. */
function placeholderTokens(text: string): string[] {
  return (text.match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g) ?? []).sort();
}

const ARABIC_SCRIPT = /[؀-ۿ]/;

/**
 * Dictionary values that are intentionally identical to their English key -
 * brand names that are written the same way in Arabic copy.
 */
const UNTRANSLATED_BY_DESIGN = new Set(['FreeStyle Libre']);

describe('interface translation coverage', () => {
  const stringsToFiles = extractTranslatableStrings();
  const dictionaryKeys = new Set(Object.keys(arabicTranslations));
  const baselineEntries = loadBaseline();
  const baseline = new Set(baselineEntries);

  it('finds t() string literals in the source tree (scanner sanity check)', () => {
    // If the scanner ever broke and found nothing, the other assertions
    // would silently pass; guard against that.
    expect(stringsToFiles.size).toBeGreaterThan(100);
    expect(stringsToFiles.has('Settings')).toBe(true);
  });

  it('has an Arabic translation (or a baseline entry) for every t() string', () => {
    const missing = [...stringsToFiles.keys()]
      .filter((text) => !dictionaryKeys.has(text) && !baseline.has(text))
      .sort();

    if (missing.length > 0) {
      const details = missing
        .map(
          (text) =>
            `  - '${text}'\n      used in: ${stringsToFiles
              .get(text)!
              .map((file) => path.relative(SRC_ROOT, file))
              .join(', ')}`,
        )
        .join('\n');
      throw new Error(
        `Found ${missing.length} t() string(s) with no Arabic translation:\n${details}\n\n` +
          'These strings will silently stay English in Arabic mode.\n' +
          'Fix: add an Arabic entry for the exact string to arabicTranslations in ' +
          'apps/web/src/app/i18n/translations.ts (preferred), or - only if the gap is ' +
          `deliberate - add the string to ${BASELINE_RELATIVE}.`,
      );
    }
  });

  it('keeps knownUntranslated.json free of strings that now have translations', () => {
    const nowTranslated = baselineEntries
      .filter((text) => dictionaryKeys.has(text))
      .sort();

    if (nowTranslated.length > 0) {
      throw new Error(
        'These knownUntranslated.json entries now have Arabic translations. ' +
          `Remove them from ${BASELINE_RELATIVE} to burn down the baseline:\n` +
          nowTranslated.map((text) => `  - '${text}'`).join('\n'),
      );
    }
  });

  it('warns about baseline entries that are no longer referenced by any t() call', () => {
    // Not a hard failure: strings routinely disappear or get reworded during
    // refactors (several tabs are being refactored concurrently), and failing
    // here would make unrelated changes brittle. Log so the baseline gets
    // pruned over time.
    const unreferenced = baselineEntries
      .filter((text) => !stringsToFiles.has(text) && !dictionaryKeys.has(text))
      .sort();
    if (unreferenced.length > 0) {
      console.warn(
        `${BASELINE_RELATIVE} contains ${unreferenced.length} entr(y/ies) no longer ` +
          'referenced by any t() call. Consider removing them:\n' +
          unreferenced.map((text) => `  - '${text}'`).join('\n'),
      );
    }
    expect(Array.isArray(unreferenced)).toBe(true);
  });

  it('keeps knownUntranslated.json sorted and free of duplicates', () => {
    const sortedUnique = [...new Set(baselineEntries)].sort();
    expect(baselineEntries).toEqual(sortedUnique);
  });

  describe('label tables reached through t(variable)', () => {
    const dynamicStringsToFiles = extractDynamicLabelStrings();

    it('finds label literals in files that call t() dynamically (scanner sanity check)', () => {
      // Same guard as above: an empty result would make the assertion below
      // pass for the wrong reason.
      expect(dynamicStringsToFiles.size).toBeGreaterThan(50);
      // Imaging filter chips are the canonical t(filter.label) call site.
      expect(dynamicStringsToFiles.has('Uncategorized')).toBe(true);
    });

    it('has an Arabic translation (or a baseline entry) for every dynamic label', () => {
      const missing = [...dynamicStringsToFiles.keys()]
        .filter((text) => !dictionaryKeys.has(text) && !baseline.has(text))
        .sort();

      if (missing.length > 0) {
        const details = missing
          .map(
            (text) =>
              `  - '${text}'\n      declared in: ${dynamicStringsToFiles
                .get(text)!
                .map((file) => path.relative(SRC_ROOT, file))
                .join(', ')}`,
          )
          .join('\n');
        throw new Error(
          `Found ${missing.length} label(s) with no Arabic translation in a file that ` +
            `renders labels through t(variable):\n${details}\n\n` +
            't() cannot be scanned for these, so they silently stay English in Arabic mode.\n' +
            'Fix: add an Arabic entry for the exact string to arabicTranslations in ' +
            'apps/web/src/app/i18n/translations.ts (preferred), or - if the string must ' +
            `stay English, e.g. a brand or product name - add it to ${BASELINE_RELATIVE}.`,
        );
      }
    });
  });

  describe('dictionary integrity', () => {
    it('preserves every {placeholder} token between the English key and the Arabic value', () => {
      const broken = Object.entries(arabicTranslations)
        .filter(([key, value]) => {
          const from = placeholderTokens(key);
          const to = placeholderTokens(value);
          return from.join('|') !== to.join('|');
        })
        .map(
          ([key, value]) =>
            `  - '${key}'\n      has ${JSON.stringify(placeholderTokens(key))} ` +
            `but '${value}' has ${JSON.stringify(placeholderTokens(value))}`,
        );

      if (broken.length > 0) {
        throw new Error(
          'These translations drop, add or rename a {placeholder} token, so the ' +
            'interpolated value would be lost at runtime:\n' +
            broken.join('\n'),
        );
      }
    });

    it('translates every entry into Arabic script', () => {
      const notTranslated = Object.entries(arabicTranslations)
        .filter(
          ([key, value]) =>
            !UNTRANSLATED_BY_DESIGN.has(key) && !ARABIC_SCRIPT.test(value),
        )
        .map(([key, value]) => `  - '${key}' -> '${value}'`);

      if (notTranslated.length > 0) {
        throw new Error(
          'These dictionary values contain no Arabic characters, so the entry is a ' +
            'placeholder rather than a translation. Translate them, or - if the string ' +
            'is a brand name that stays as-is - add the key to UNTRANSLATED_BY_DESIGN ' +
            `in this spec:\n${notTranslated.join('\n')}`,
        );
      }
    });
  });
});
