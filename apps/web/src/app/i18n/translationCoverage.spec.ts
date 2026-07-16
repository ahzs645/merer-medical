import * as fs from 'fs';
import * as path from 'path';

import { arabicTranslations } from './translations';

/**
 * Regression guard for interface translation coverage.
 *
 * The app translates English strings to Arabic at runtime via a dictionary
 * lookup (see InterfaceLanguageProvider). Any t('...') string that is missing
 * from `arabicTranslations` silently stays English in Arabic mode, so this
 * spec scans the source tree for t() string-literal calls and fails when a
 * NEW untranslated string is introduced.
 *
 * Known gaps are tracked in `knownUntranslated.json` (a sorted JSON array).
 * The intent is for that list to only shrink over time:
 * - Adding a new t('...') string? Add an Arabic entry to
 *   `arabicTranslations` in translations.ts (preferred), or deliberately add
 *   the exact string to knownUntranslated.json.
 * - Translated a known-gap string? Remove it from knownUntranslated.json.
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

function loadBaseline(): string[] {
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as string[];
}

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
});
