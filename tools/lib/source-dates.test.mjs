/**
 * Run with: node --test tools/lib/source-dates.test.mjs
 *
 * `tools/` has no Nx jest project, so these use the Node test runner directly
 * rather than adding a build target for one file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conventionForRegion, resolveSourceDate } from './source-dates.mjs';

test('resolves an ambiguous date under the stated convention', () => {
  assert.equal(resolveSourceDate('03/08/2026', 'DMY').iso, '2026-08-03');
  assert.equal(resolveSourceDate('03/08/2026', 'MDY').iso, '2026-03-08');
});

test('flags an ambiguous date and names the other reading', () => {
  const result = resolveSourceDate('03/08/2026', 'DMY');
  assert.equal(result.ambiguous, true);
  assert.match(result.note, /MDY would give 2026-03-08/);
});

test('does not flag a date only one convention can explain', () => {
  const result = resolveSourceDate('25/12/2026', 'DMY');
  assert.equal(result.ambiguous, false);
  assert.equal(result.note, undefined);
});

test('says so when the flipped reading is not a real date', () => {
  // 13/08 flipped is month 13 — caught before it becomes a date.
  assert.equal(resolveSourceDate('13/08/2026', 'DMY').ambiguous, false);
});

test('expands two-digit years into the recent past', () => {
  assert.equal(resolveSourceDate('03/08/26', 'DMY').iso, '2026-08-03');
  assert.equal(resolveSourceDate('03/08/86', 'DMY').iso, '1986-08-03');
});

test('reads named months in either order', () => {
  assert.equal(resolveSourceDate('4 August 2026', 'DMY').iso, '2026-08-04');
  assert.equal(resolveSourceDate('Aug 4, 2026', 'MDY').iso, '2026-08-04');
});

test('passes ISO through untouched', () => {
  const result = resolveSourceDate('2026-08-03', 'ISO');
  assert.equal(result.iso, '2026-08-03');
  assert.equal(result.note, undefined);
});

test('warns when ISO was declared but the value is not ISO', () => {
  const result = resolveSourceDate('03/08/2026', 'ISO');
  assert.equal(result.iso, '2026-08-03');
  assert.match(result.note, /not ISO/);
});

test('rejects impossible dates rather than rolling them over', () => {
  assert.match(resolveSourceDate('31/02/2026', 'DMY').error, /not a real date/);
  assert.match(resolveSourceDate('03/13/2026', 'DMY').error, /month 13/);
});

test('rejects unreadable input', () => {
  assert.ok(resolveSourceDate('', 'DMY').error);
  assert.ok(resolveSourceDate('last Tuesday', 'DMY').error);
  assert.match(
    resolveSourceDate('03/08/2026', 'nonsense').error,
    /unknown convention/,
  );
});

test('maps regions to the convention their documents use', () => {
  assert.equal(conventionForRegion('GB'), 'DMY');
  assert.equal(conventionForRegion('us'), 'MDY');
  assert.equal(conventionForRegion('AE'), 'DMY');
  assert.equal(conventionForRegion('JP'), 'YMD');
  assert.equal(conventionForRegion(''), undefined);
});
