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

## Left open, deliberately

**Three pages show the same thirteen conditions.** Problems lists them, My
conditions groups them by topic, and Histories opens with them under "Medical
history" — which also repeats the twelve Procedures. Whether three doors onto
one set of records is the right information architecture is a decision, not a
defect.

**The connection's name, where its key used to be.** Medications now says
"Clinician" where it printed a UUID. It could say "Blessings Clinic": the source
object still carries `connectionId` and the connections collection has the name.
That needs a fetch threaded through the medication normaliser — worth doing on
purpose rather than inside a review sweep.

## Final state

Across 138 page loads at 393 / 834 / 1440:

- 0 load failures, 0 console errors, 0 horizontal overflow
- 0 of 46 surfaces without a `main` landmark (was 46)
- 0 unlabelled form controls (was 11)
- content probe clean at both sizes: no identifiers, no broken values, no empty
  boxes, no duplicate headings, no contrast failures, no missing focus styles
- 576 tests passing, lint at its pre-change baseline
