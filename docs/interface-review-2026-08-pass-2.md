# Interface review, second pass

A second walk over all 46 surfaces, on the build the first pass fixed. It found
a different class of defect, because it asked different questions.

## Why a second pass found anything

The first audit's probe was geometric: does anything overflow, is this control
44 × 44, is text clipped without an ellipsis, does this button have an
accessible name, does this input have a label, is there a `main` landmark.
Every one of those has an answer in pixels and attributes — and every one can be
satisfied by a screen that is nonetheless showing you a database key.

It was the first pass's own verification sweep that turned one up: Care plans
rendering `abe3196c-2f56-43e1-9fb1-cd78b4c3f270` as a card heading, on a screen
the original review never opened. A UUID is valid text at a reasonable size, so
nothing in the geometric probe had a reason to look at it.

So this pass added a content probe and ran it on every surface at 393px and
1440px:

- identifier-shaped strings (UUIDs, opaque source ids)
- broken value formatting (`undefined`, `NaN`, `[object Object]`, `Invalid Date`)
- containers with a border or background and nothing in them
- a heading that repeats the row beneath it
- WCAG AA contrast, computed against each element's real composited background
- controls that remove their focus ring without replacing it
- floating controls sitting on top of other controls

and deliberately opened the ~17 surfaces the first review never reached.

## What it found

**Machine text reaching the reader — 8 instances, 3 screens.**

| Screen | On screen | Cause |
| --- | --- | --- |
| Problems, every card | `Provenance: ClearView Optometry · Manual · FHIR.R4 · Condition/demo-dry-eye`, and the full `https://fhir.epic.com/…` endpoint on Cerner records | `getProvenanceSummary` joined `data_record.format` and `metadata.id` into a patient-facing line |
| Medications | `Source: 0f38582a-1773-4e2b-80e3-90fda727cdbd - clinician` | `connection_record_id` ended the source-label fallback chain |
| Care plans, 7 of 8 | `abe3196c-2f56-43e1-9fb1-cd78b4c3f270` as the card heading | `resource.id` ended the title fallback chain |

Who a record came from and how it arrived are worth saying; the wire format and
the far-end resource path are facts about an integration, and the app already
has a provenance panel for those.

**Contrast — 60+ strings below AA, now none, at both sizes.**

| Where | What | Was | Now |
| --- | --- | --- | --- |
| Tracker dates, immunisation schedules, disclaimers, Records hub blurbs | `text-gray-400` on white | 2.54 : 1 | 7.56 : 1 |
| Timeline category headings (×8) | `-600` hues on white | 3.19–4.10 : 1 | 4.7–6.6 : 1 |
| Same-day chip, privacy "Off" pill | `gray-500` on `gray-100` | 4.39 : 1 | 8.9 : 1 |
| "Import .emrpkg" | white on `green-600` | 3.30 : 1 | 5.14 : 1 |
| Document date · filename | `gray-500` on `gray-50` | 4.19 : 1 | 9.4 : 1 |

AA asks 4.5 : 1 for text at these sizes. The Records hub blurbs were added by
the *first* pass and inherited the failing class — a fix from one round caught
by the next.

**A dangling separator on four list pages.** Written as
`{item.source && <span>· {item.source}</span>}` per fact — the separator in
front of each rather than between them — so any row whose earlier facts were
absent opened on a bullet pointing at nothing: `· Smiles Family Dentistry`.
Visits, Allergies, Procedures and Referrals all did it; they share one
`FactList` now.

**Problems card density.** Onset and Resolved printed "Unknown" on nearly every
card, and the status appeared twice — a green badge beside the title and a grey
chip beneath it.

**Histories claimed a count it did not have.** The nav read "3 records" because
the category counted `familymemberhistory`, while the page opens with a 13-row
"Medical history" section. It is uncounted now, with a description, per the rule
the category config already states: set `resourceTypes` only where the tally
equals the rows the page lists.

## The two the sweep left open, since decided

Both were held back because they are choices rather than defects. Both are now
made.

### Three doors onto thirteen conditions

Problems and My conditions were two entries in the same nav group over one pile
of thirteen FHIR `Condition` records. Both headers said "13 conditions". Neither
name told you which one held what you were after, and "Add problem" and "Add
condition" opened the same form.

They are one category with two readings now:

| | Then | Now |
| --- | --- | --- |
| Nav | Problems (13) · My conditions (–) | Conditions (13) |
| Grouped by topic, with related meds/labs/plans | `/records/conditions` | `/records/conditions` |
| Every field of every diagnosis | `/records/problems` | `/records/conditions/details` |

Both pages wear the same title, icon and count, and a segmented switch in the
banner — By topic / Details — says which reading you are on. `/records/problems`
redirects, the way `/labs`, `/imaging`, `/dental` and four others already do;
"problems" is still a command-palette keyword, since it is the word most portals
print. The category's count is now a clean 1:1 with the rows either view lists,
which is the rule the category config already stated.

Histories is a genuinely different frame — the intake form: what you have had,
what was done, what runs in the family, how you live — so it keeps its four
sections. What it stopped doing is passing off the first two as its own. Medical
history and Surgical history are the same documents Conditions and Procedures
hold; each now shows the five most recent and ends in "8 more in Conditions".
Before, the medical section alone ran thirteen rows and filled a phone screen,
pushing family and social history — the two this page is the only home for — off
the bottom. All four now fit above the fold at every width.

Removing the duplicate also removed a duplicate inside each card: the date beside
the title was `onset || recorded`, and the grid underneath already printed
whichever of those the record had.

### The connection's name, where its key used to be

Medications said "Clinician" where it had printed a UUID. It says "Blessings
Clinic · Imported record" now.

The normaliser is a pure FHIR-to-domain transform with no database, so a
`MedicationStatement` naming no `informationSource`, `recorder`, `requester` or
`performer` had no way to fill the label — while the connection the record
arrived on knew the name all along, and `connectionId` was already being carried
through for exactly this. So the lookup happens at the view boundary, where the
connections are, instead of threading a fetch down into the transform: one more
parallel query in `useMedicationsData`, and a `withConnectionNames` pass over the
timeline items before they become view items. Records that *do* name a
prescriber are untouched — "Physician O. Cardiology, MD · Clinician" still reads
as it did.

## Final state

Across 138 page loads at 393 / 834 / 1440:

- 0 load failures, 0 console errors, 0 horizontal overflow
- 0 of 46 surfaces without a `main` landmark (was 46)
- 0 unlabelled form controls (was 11)
- content probe clean at both sizes: no identifiers, no broken values, no empty
  boxes, no duplicate headings, no contrast failures, no missing focus styles
- 577 tests passing, lint at its pre-change baseline

Re-run after the two decisions above, on the surfaces they touched: geometry
probe clean at all three widths, content probe clean on all 46 surfaces at 393
and 1440.
