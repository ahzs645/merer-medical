# Interface review, fifth pass — the surfaces the fourth never opened

> **Status:** all ten findings below are fixed — see "What shipped" at the foot
> of this document, and the commits following it. The findings are kept as
> written, because the reasoning is what makes the fixes reviewable. One
> "also noticed" item was withdrawn on inspection and is struck through.

Companion to [`interface-review-2026-09-pass-4.md`](./interface-review-2026-09-pass-4.md),
which asked whether what each screen says about you is true. This pass asks the
same question of the places that walk never reached:

- **detail pages**, which the fourth pass only ever addressed by URL and so
  never entered (`/records/labs/:key`, `/records/documents/detail/:id`);
- **the clinical timeline**, the second tab of the landing page;
- **modals and sheets** — the command palette, the add-record route;
- **Arabic**, at both widths;
- **320 px**, which is 1440 px at 400% zoom (WCAG 1.4.10 reflow);
- **print**, for the two pages with a Print button;
- **colour contrast, focus visibility and tap-target size**, measured rather
  than eyeballed.

**Setup:** clean production build at `6bac090`, served locally, driven through
`/demo` and through the real app with an empty database. 42 probes, 71 plates.

A rendered version of this review, with every surface at 393 px and 1440 px, is
published as an artifact: **What the Screens Claim**.

---

## What came back clean

Measured across 12 routes at two widths:

| Probe | Result |
| --- | --- |
| Text below AA contrast (every string against its computed background) | **0** |
| Focusable controls with no visible focus indicator | **0** |
| Surfaces overflowing sideways at 320 px | **1** (see §10) |
| Console errors | **0** |
| Heading-level skips | **0** — the pass-4 promotions hold |
| Arabic mirroring (root `dir`, rail, nav, cards, tab bar) | correct, no overflow |
| Command palette | opens on ⌘K, focuses its input, finds records, closes on Escape |
| Print (wallet card, visit prep) | navigation dropped, content printed |

---

## 1. Every navigation is silent, and drops focus

**All 46 routes.** Click a link in the rail and the route changes; after it,
`document.activeElement` is `<body>`. Nothing announces the new page, and the
next <kbd>Tab</kbd> starts again at "Skip to content", above the navigation the
reader just used.

The shell already has both halves and connects neither: `main` carries
`tabIndex={-1}` (the skip link targets it), and the only `aria-live` region in
`TabWrapper` belongs to the route-loading spinner.

**Fix:** one effect on `TabWrapper` keyed on `location.pathname` — move focus to
`main`, write the page title into a polite live region. Same shape as the scroll
restoration already hanging off that element, and it covers every route at once.

## 2. A result's detail page loses the name its list gave it

The Labs list attributes **LYMPHS** to **Ben Bora**. Open the row:

> Reported by **Unknown source**

The third pass spent itself on exactly this class — two screens deriving one
fact and disagreeing. `collectDirectory` already harvests performers, authors,
recorders, asserters and information sources; the detail pane reads a narrower
field than either the list or the directory.

**Fix:** one resolver, shared. "Source not recorded" only when it genuinely
returns nothing.

## 3. The wallet card truncates the dose it exists to carry

The card says *"Printing includes every entry, not only the ones shown here."*
Every entry, yes — but `condenseSig` (`WalletCardTab.tsx:324`) cuts every
instruction at 44 characters and appends an ellipsis, on screen and on paper.

| | |
| --- | --- |
| Printed card | `1 capsule 1 time each day in the morning. D…` |
| The record | `…in the morning. Do not crush or chew.` |

Paper has no hover. The half that survives is the routine one; the half that is
cut is the warning.

**Fix:** drop the clamp under `@media print`. If a screen limit is still wanted,
cut at a clause boundary rather than at character 43.

## 4. The lab chart's axes are raw arithmetic

Every other number in the app is rounded, formatted and given a unit.

- **Y axis, on a percentage:** `55.056 · 49.744 · 43.744 · 37.744 · 31.744` —
  the data's own extremes plus an even step, so no tick lands on a number a
  person would pick.
- **X axis:** `2012-04 · 2016-05 · 2017-07 · 2019-07 · 2023-01`, rotated 45°, in
  an app that spent a pass agreeing on "Apr 2012".
- **The clinical timeline's axis** has the same problem plus one more: its first
  tick reads `11`, a year clipped by the lane column.

**Fix:** round ticks from the domain, and `humanizeIsoDatesInText` (which exists
for exactly this and is applied to prose but not to charts) on the labels.

## 5. The document detail contradicts itself, in machine words

One screen, two accounts of where the record came from:

> Synced from a connected source — edit it there

over a provenance grid reading `Source type: manual` · `Entry method:
manual-entry` · `Original format: FHIR.DSTU2` · `Content type: application/json`
· `Mapping: manual`.

Four of six fields are internal codes, and a reader who does parse them is told
the opposite of the banner above.

**Fix:** say where it came from once, in words; keep format and content type
behind a "technical details" disclosure.

## 6. The clinical timeline can't be read on a phone

Forty-nine laboratory lanes, labels truncated at about eleven characters:

```
BR- BILIRUB…  BR- CREATI…  BR- BLOOD …  BR- E-GFR, …  BR- ALBUMI…  BR- POTASS…
```

Two of those lanes are **BR- E-GFR** and **BR- E-GFR, AFRICAN AMERICAN** —
different tests, different reference intervals, one label. The lane area carries
no dates; the only time axis is the brush below a 49-lane scroll. At 1440 px the
labels still truncate, in a panel with whitespace to spare.

**Fix:** let the label column grow with the viewport and wrap to two lines; on a
phone put the lane name above its sparkline rather than beside it.

## 7. A citation popover overflows the phone it opens on

The reference-standard citation opens a ~260 px panel anchored to the right of
its trigger. At 393 px it covers the overlay controls beneath it and runs past
the viewport edge, clipping its own text mid-word — including the line naming
the source it exists to cite. The page does not scroll sideways, so there is no
way to see the rest.

**Fix:** flip and clamp to the viewport, or use the bottom sheet the app already
has for overflowing content on a phone.

## 8. Interface strings still fall out of Arabic

The mirroring is good; what escapes are strings the coverage spec cannot see —
plain JSX text in a file that never calls `t()`, and sentences composed at
runtime.

- **All eight Records-hub blurbs** ("Blood work and panels", "Measurements over
  time", "People and places"…) plus the tooltip explaining why a category has no
  count. `RecordsHub.tsx` imports no translator, so neither scanner in
  `translationCoverage.spec.ts` looks at it.
- **Two of the four Results tiles**: "Total results" and "Needs attention" are
  translated; "Labs" and "Reports, imaging and other" are not, so the row renders
  half in each language.
- **Settings**: the "Privacy and security" heading, and the two composed lines
  ("0 cached lookups; 0 stale.", "You have used 10.78 MB out of 985.52 MB…").

**Fix:** dictionary entries for the blurbs and tile labels; format strings for
the composed lines; and extend the coverage spec's second scanner to label
tables imported by a file that renders them, whether or not that file calls
`t()` — which is what would have caught all eight blurbs.

## 9. The 44 px rule the app set itself is applied unevenly

`min-h-[44px]` appears throughout this codebase, usually with a comment
explaining that a thumb needs it. **86 controls on six phone surfaces** sit
below it:

| Surface | Under 44 px | Smallest |
| --- | --: | --- |
| Immunizations | 19 | "Dismiss options" ⋯ menu, **24 × 24** (×3) |
| Sharing | 39 | every field and button, **38** tall |
| Settings | 14 | "Turn off proxy", 112 × 34 |
| Sources | 8 | file buttons, 327 × 38 |
| Summary | 5 | card controls, **32 × 32** |
| Timeline | 1 | 40 × 40 |

None fails WCAG 2.5.8, which asks for 24 × 24 — the ⋯ menus land exactly on the
line. They fail the app's own standard, beside controls that meet it, and the ⋯
menu is what dismisses a vaccine recommendation.

**Fix:** the `min-h-[44px] min-w-[44px]` the profile-delete button already uses,
on the ⋯ menus and the dose chips first.

## 10. Visit prep's toolbar is the one row that won't reflow

At 320 px — 1440 px at 400% zoom — every surface fits except the Markdown / HTML
/ Print row, which measures 334 px in a 320 px viewport.

**Fix:** let it wrap. It is a `shrink-0` flex row; removing that is the change.

---

## Also noticed, not written up

- ~~The wallet card's conditions print in no order.~~ **Withdrawn on
  inspection:** `conditionRank` sorts them into three bands — critical
  diagnoses, everything else, then screening scores and dental findings — which
  is why Asthma leads and "Bad breath" and "Occlusal caries on tooth 30" sink to
  the end. Within the middle band the order is whatever the records arrived in.
  The one thing that reads oddly is that "TB (pulmonary tuberculosis)" is in
  that middle band: `CRITICAL_CONDITION` names sepsis, hepatitis and HIV but not
  tuberculosis. That is a judgement about a clinical triage list, so it is
  recorded here rather than changed.
- The **add-record route is not a sheet** when reached from a list page's banner
  action, though pass 1 made it one from the Records hub. Same destination, two
  presentations.
- **Recharts warns** `width(-1) and height(-1)` three times on the growth-charts
  first paint. The chart renders; the warning is console noise in production.

## Suggested order

1. Focus and announce on route change (§1). One effect, 46 routes.
2. The wallet card's print clamp (§3) — smallest fix here, largest consequence.
3. One source resolver for the lab detail (§2).
4. Chart axes: round ticks, house dates (§4).
5. The eight blurbs and two tile labels, plus the scanner change that would have
   caught them (§8).
6. 44 px on the ⋯ menus and dose chips (§9); the Visit prep row (§10).
7. Then the two that want a design decision: the phone clinical timeline (§6)
   and the document provenance block (§5).

---

## What shipped

Verified against a clean production build driven through `/demo` and through the
real app with an empty database, at 393 px and 1440 px.

| # | Was | Is |
| --- | --- | --- |
| 1 | `activeElement` = `<body>`, nothing announced | `useRouteAnnouncement`: focus moves to `main`, a polite live region names the page ("Records"). Skips the first paint; keyed on `pathname` so typing in a search box cannot steal focus |
| 2 | "Reported by Unknown source" | "Ben Bora, Christy Chin, MD" — `getLabGroupInsight` falls back to the linked report's performer, which is what the Labs table shows |
| 3 | Printed card ended "…in the morning. D…" | Screen keeps the wallet-sized summary; print carries the whole instruction, "Do not crush or chew" included |
| 4 | Y ticks `31.744 · 37.744 · 43.744`, X `2012-04` | `getChartScale` puts every tick on a round number and hands recharts the ticks; both charts label the axis "Apr 2012" |
| 5 | "Synced from a connected source" over `Entry method: manual-entry` | `buildRecordProvenance` reads the record's own `source_type`, so entry method and source type stop disagreeing; the panel says "How it arrived: Entered by hand" and folds format and content type into "Technical details"; a record that arrived in a package no longer claims a portal |
| 6 | `BR- E-GFR, …` and `BR- E-GFR` at every width | Lane names wrap to three lines, the column grows with the viewport (132 px on a phone, up to 240), and the first axis tick reads `2011` rather than `11` |
| 7 | Citation popover clipped past the right edge at 393 px | A sheet above the tab bar on a phone, the anchored popover from `sm` up. Measured: 8 → 385 px in a 393 px viewport |
| 8 | Eight blurbs, two tiles and three composed lines in English | Dictionary entries and format strings; scanner 2 now also reads label tables rendered off an object by a file that never calls `t()` — which flagged 66 more strings, 27 translated and 39 baselined as brands, standards and analyte names |
| 9 | 20 controls under 44 px on Immunizations | 0. The ⋯ menus and dose chips are 44 px |
| 10 | Visit prep's toolbar 334 px in a 320 px viewport | Wraps. `shrink-0` on the action row was pinning it to max-content, so its own `flex-wrap` never applied |

**Baseline:** 740 tests in 88 suites, all passing (was 723 in 85). `tsc` clean,
`eslint` clean. New specs cover the route announcement, the lab source fallback,
the chart scale and the provenance labels.

### What the fixing turned up

**The two "manual"s.** The document detail's contradiction was not two
components disagreeing — it was one function disagreeing with itself.
`buildRecordProvenance` consulted `metadata.source_type` for `sourceType` and
not for `entryMethod`, so a package record came back `sourceType: manual` and
`entryMethod: portal-sync` from a single call. The panel printed both, and the
read-only note built on the second told the reader to go and edit a portal that
had never held the record.

**Widening the scanner is not free.** Teaching scanner 2 to read label tables
rendered without a `t()` call flagged 66 strings — a third of them genuine
interface copy that had been quietly English since it was written, the rest
vendor names, standards and lab analytes. `knownUntranslated.json` went from
`[]` to 39 entries, and the spec's docblock now says what each class is and why
it stays English, so the list can be argued with rather than just carried.

**Two tap-target fixes were layout fixes.** Growing the ⋯ menu to 44 px pushed
the status pill off the immunisation card's top row until it was given negative
margins; the chip row needed `items-center` rather than `items-baseline` once
the chips were taller than their text.
