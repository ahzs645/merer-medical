# Interface review, third pass — behaviour and code

A third walk over the app, at 393 px, 834 px and 1440 px. The first pass asked
whether each screen was *drawn* correctly. The second asked whether it *said*
something a person could read. This one asks what happens when you **use** it —
what the app does over time, across a sync, across a language, across a back
button — and what the code underneath commits you to.

## Why a third pass finds anything

The first two probes were both single-frame. They loaded a route, measured it,
and moved on. Every defect they could see was visible in a screenshot of one
page at one moment.

That leaves a whole class of behaviour unexamined, because it only exists
*between* two moments:

- what a list shows after records arrive underneath it
- where you land when you come back from a detail page
- whether the number on one screen agrees with the number on another
- what a string does when the interface language changes
- what it costs to open the app at all

This pass drove the built app through `/demo` and probed those. It also read the
code behind each finding, because most of them are one-line consequences of a
design choice made somewhere else.

**Setup:** production build (`nx build web`, clean), served locally, driven
through `/demo` with the real demo dataset (222 results, 16 immunisations, 13
conditions, 5 connected portals). 56 surface captures at two widths, plus
interaction probes at three. The `packages/immunization-forecast` submodule
fetches correctly now, so this is the first pass run against a **complete**
production build rather than a partial one. Baseline on that build: **577 tests
in 70 suites, all passing**; no console errors and no horizontal overflow at any
of the three widths.

---

## What has actually been fixed

Worth stating plainly, because most of the first pass's list is genuinely closed
and this review would misrepresent the app if it opened with the leftovers.

Verified fixed at all three widths:

| First-pass finding | State now |
| --- | --- |
| No `main` landmark / skip link (46 surfaces) | `TabWrapper` has both; skip link is the first tab stop |
| Labs table unreachable at 768–1248 px | No horizontal overflow at 834 px anywhere in the app |
| Toasts drawing over sheets and modals | Named z-scale (`popover` 30 / `toast` 50 / `dialog` 60) |
| Five date formats | One `dateFormatters` module, used across the app |
| "1 items" / "3 item(s)" | Correct plurals |
| Records' "Not counted" on five phone cards | Descriptive subtitles ("Blood work and panels") |
| No desktop sub-nav for Dental / Optometry | Visible tab strip on both, at every width |
| Trackers opening with a blank form | "Recent entries" now leads the page |
| Arabic offered with an unmirrored layout | **Layout mirrors correctly** — rail, nav, cards, tab bar (see §5) |

The dangling `·` separators, the machine text on Problems/Medications/Care plans,
and the AA contrast failures from the second pass are all still closed.

---

## 1. The lists don't know when their records change

**The single most consequential behaviour in the app**, because it undoes the
one thing a sync is for.

`useRecordList` — the shared loader behind Allergies, Referrals, Procedures,
Encounters, Goals and the rest — fetches once with `.exec()` and re-runs only
when a counter called `recordChangeTick` increments
(`shared/hooks/useRecordList.ts:127`). That counter has exactly two publishers:

```
$ grep -rn "notifyRecordsChanged" apps/web/src --include=*.tsx
features/manual-entry/hooks/useManualRecordForm.ts    # you typed a record
features/manual-entry/ManualRecordActions.tsx         # you deleted one
```

Portal sync does not publish it. `SyncJobProvider` writes hundreds of documents
to RxDB and tells nothing on screen. So a sync that finishes while you are
sitting on Medications leaves Medications exactly as it was.

The sharp edge is that **one component on that same screen does subscribe
properly**. `useRecordCounts` — the Records side-nav tallies — listens to
`db.clinical_documents.$` and debounces (`useRecordCounts.tsx:108`). After a
sync you get a nav reading **Medications 7** beside a list showing three, and no
way to tell which is lying. The count is right.

Nothing in the codebase is reactive except that tally and two preference
providers: three `.$.subscribe` calls in 631 files. RxDB's reactive queries —
the feature that makes an offline-first store worth its weight — are unused for
clinical data.

The `.emrpkg` import path papers over this with `window.location.reload()` after
1.5 s (`UserDataSettingsGroup.tsx:206`). There are **nine** such reloads in the
app. In demo mode a reload wipes the in-memory database, which the codebase
already knows — `recordChangeSignal.ts` was written specifically to avoid it —
so the workaround is one the app has already outgrown in one place and kept in
eight others.

**Fix:** publish the change signal from the sync and import paths (one line
each), or better, move `useRecordList` onto `db.clinical_documents.$` and delete
the tick and most of the reloads with it.

## 2. Three screens count your allergies differently, and the app knows

`useRecordCounts.tsx:73` carries this comment:

> Portals emit "no known allergy" / "not asked" as ordinary AllergyIntolerance
> resources. The Allergies page lists them apart from real allergens, so
> counting them here made the nav disagree with the page (**11 vs 6 in the demo
> set**).

The rule is right and the fix is real — in the nav. It was not applied to the
other two places that count the same records:

| Screen | Allergies | Source |
| --- | --: | --- |
| Records side nav, Allergies page, Wallet card | **6** | filters negations |
| Summary → "Allergies and conditions" | **11** (shown as 24 with conditions) | `SummaryTab.tsx:142`, raw `find()` |
| Export → chips | **11** | `RecordExportTab.tsx:114`, raw type filter |

So Summary announces **24 records** where the nav accounts for 19, and the
difference is five rows that say you *don't* have an allergy.

Documents disagree too — nav 14, Export 11 — in the other direction.

Export has a paragraph explaining reconciliation: *"Screens that show one slice
of your library report smaller figures."* That is a good instinct, but it is
written on the one page that can't be wrong by itself, and it does not describe
what is actually happening: Allergies is **larger** in Export, not smaller.

**Fix:** the negation filter belongs next to the query, not in one consumer.
`isAllergyNegation` already exists and is already shared — Summary and Export
should call it.

## 3. Results' four tiles don't add up, and one of them isn't a result

The Results page opens on **Total 222 · Labs 180 · Imaging & reports 31 ·
Needs attention 7**. 180 + 31 = 211. Eleven records are in the total and in
neither labelled bucket, because the buckets are two explicit filters over four
possible types (`ResultsTab.tsx:67–71`) and the remainder is never named.

You can see the remainder in the list: *"Aligner case start — trays 1 to 24"*,
typed `PROCEDURE`, and *"Optical lens and frame order"*, typed `Document`,
under a page that describes itself as "Labs, imaging, reports, and linked result
documents". A dental aligner fitting is not a result of anything.

The same record's detail pane then prints one sentence four times, under four
headings — **Impression**, **Narrative**, **Result note**, **Provider comments**
all read *"Issued trays 1-4 of 24. Attachments placed on upper 6, 7, 10, 11 and
lower 22, 27…"*. Four labels for one string is worse than one label, because it
implies four different clinicians wrote the same thing.

## 4. Drilling into a record loses your place in the list

Scroll Labs to 1200 px, open a result, press Back: you are at the top of Labs.
Measured at 393 px and 1440 px; the same on Medications and the Timeline.

The cause is structural rather than an oversight. The scrolling element is a
nested `div.h-full.overflow-y-auto` inside the page, not the window — so the
browser's own scroll restoration, which only ever restores window scroll, has
nothing to restore. And React Router's `ScrollRestoration` is not used anywhere
(`grep -rn "ScrollRestoration" apps/web/src` → nothing).

On a phone this is the difference between browsing a 50-row lab list and
browsing the first six rows of it fifty times.

**Fix:** one `useLayoutEffect` in `AppPage` keyed on `location.key`, saving and
restoring the scroller's `scrollTop` in a `Map` — the standard pattern for an
in-page scroll container.

## 5. Arabic mirrors; the composed strings don't translate

Pass 1 reported that selecting Arabic gave you an unmirrored LTR layout. That is
no longer true and deserves saying: `dir="rtl"` reaches `<html>`, the rail moves
to the right edge, the Records nav and its counts flip, the phone tab bar
reverses, headings and body copy render Arabic. It works.

Two things escape, and both escape for the same architectural reason — the app
translates by looking a **whole finished string** up in a dictionary, plus a
runtime DOM pass over text nodes:

**a. The timeline's search box stays English.** `SearchBar.tsx:85` builds three
placeholders as bare literals with no `t()` anywhere in the file:

```ts
return isVectorSearchEnabled
  ? '✨ Search your records with AI'
  : 'Search your medical records';
```

A `placeholder` is an attribute, not a text node, so the DOM pass can't see it;
and the coverage spec's two scanners both key off a `t(` call in the file, so
neither flags it. The Records hub's search *is* translated one screen away,
which is what makes it look like a bug rather than a gap.

**b. Timeline card titles stay English whenever a day has three or more kinds of
record.** `buildTimelineCardTitle` (`timelineCategories.ts:92`) assembles English
grammar from parts:

```ts
return `Your ${categories[0]}, ${categories[1]}, and ${categories.length - 2} more`;
```

On the Arabic phone timeline, the first card reads **إجراءاتك** and the second
reads **"Your Conditions, Procedures, and 3 more"** — because the one-category
case happens to produce a string that exists in the dictionary and the
three-category case produces one of a combinatorial set that never can. It is
not a missing entry; it is a shape the dictionary can't hold.

**Fix:** a format string with placeholders — `t('Your {a}, {b}, and {n} more')`
with the categories translated separately — which the coverage spec already
supports and tests (`preserves every {placeholder} token`). Same for the three
placeholders.

Also still open from pass 1, and confirmed by count: **361 physical direction
utilities** (`ml-`, `pr-`, `left-`, `text-left`) against **26** logical ones and
5 `rtl:` overrides. The mirroring works today because the big containers were
converted; the long tail is one `ml-2` away from breaking in a way nobody will
notice in English.

## 6. Delete means three different things

| Where | What happens |
| --- | --- |
| Trackers entry | one tap, gone. No confirm, no undo — verified: 8 entries → 7 |
| Timeline comment | one tap, gone. No confirm, no undo |
| A manual record | `window.confirm('Delete this manual record?')` |
| Remove password / decrypt | a proper in-app modal explaining the consequence |

The native `window.confirm` is the odd one out visually — an OS dialog in an app
that has a designed modal for exactly this — and the two with no confirmation at
all are the two whose buttons sit inside a scrolling list, under a thumb.

Trackers' Delete is also the only red text on the card, at the same size as the
category pill beside it, with the entry's note directly beneath — three targets
in a 44 px band.

**Fix:** the destructive-confirm modal already exists in Privacy and Security.
Undo-on-toast would be better than a confirm for both list cases — the
notification layer is already there and already `aria-live`.

## 7. Dental's "What to do next" is a checklist that can never be finished

The panel reads **7 open issues to follow up**, then lists four lines:

> Review active findings and conditions
> Confirm planned treatment status
> Track periodontal measurements and maintenance
> Link imaging to tooth-specific records

Neither number nor list is what it looks like. `buildWorkflowContext`
(`dentalClinicalModels.ts:239`) pushes each line if a category is *non-empty*:

```ts
if (perioRecordCount > 0) nextActions.push('Track periodontal measurements and maintenance');
```

So the list is a description of which record types you have, phrased as
imperatives. Nothing can be completed, nothing can be dismissed, none of the
lines is a link, and the count (records of active kinds) is unrelated to the
four rows beneath it — a reader will naturally take the four as the seven.

Above it sit **eight stat tiles**, one of which reads **Procedures 0**.

This is the pattern pass 1 named on lab and document detail — numbers standing
in for content — surviving on the specialty overview, which is the screen where
it costs most, because a specialty overview is supposed to answer "what needs
doing".

## 8. Three doors that download your records

Still open from pass 1, and now measurable:

| Page | Card | Options | Output |
| --- | --- | --- | --- |
| Sharing | "Download your records" | full record / visit-specific, provenance, attachments, audit trail, password | package |
| Visit prep | "Visit record package" | attachments, audit trail, password | `.emrpkg` |
| Export | "Download your complete record" | — | Health summary HTML / FHIR Bundle JSON |

Sharing's *"Visit-specific package"* is the thing Visit prep exists to build.
Both offer the same three checkboxes. Export uses "complete record" for what
Sharing calls "full record". Nothing on any of the three pages mentions the
other two.

Sharing also still leads with the download card under a page titled "Sharing and
emergency access", pushing the emergency profile and caregivers — the things the
title promises — below the fold at 1440 px.

## 9. Providers & locations is still an empty room

Unchanged since pass 1, and now the only surface in the app that is empty while
its data is visible everywhere else. "No providers recorded yet", "No locations
recorded yet", a search box over nothing, no add action, no explanation.

Meanwhile the demo's own records name **Ben Bora** on every lab row, **Smiles
Family Dentistry** on the timeline, **ClearView Optometry** on the optometry
records, and **Oak Valley Community Hospital** in the documents. The nav gives
the category a permanent "–".

The records analysis in `docs-analysis-records.md` says the builder now
materialises real `Location` and `Practitioner` resources; this page reads
neither. Either it should read them, or it should read the provenance the other
screens already render, or it should go.

## 10. Smaller things, at both widths

- **The Immunizations card still says the same thing twice.** A "Next due
  **Oct 2025**" field box, and directly beneath it *"Estimated next dose date is
  Oct 22, 2025."* Pass 1 flagged the pair; the date format was fixed and the
  duplication kept.
- **Two language controls on Settings.** "Display language: English (English)"
  under a clear description, and a second **English** button in the Profile card
  beside "Canada" with no label of its own. Both read "English"; only one
  changes the interface.
- **The phone's add button is still a bare `+`.** On Records, Trackers, Dental
  and Immunizations the banner action is an unlabelled `+` at 393 px while
  desktop says "Add dental record" / "Add lab result". The label is the part
  that tells you what it adds.
- **The audit log is empty right after an import.** The page promises "Imports,
  edits, exports, shares, AI access, and sync events", and the demo boot is an
  import. Meanwhile Sharing and Visit prep both offer "Include audit trail" in
  the package.
- **Labs still opens pre-filtered to Attention.** "5 of 50 lab tests listed" is
  an honest line, but the first impression of a records app is five rows.
- **Wallet card ordering.** It says "The most urgent entries are listed first"
  and lists Asthma, Cough (unspecified), Fear of open places, Right upper lobe
  pneumonia, Zika virus disease. "Cough, unspecified" on an emergency card is
  noise, and the order isn't urgency.
- **The desktop timeline still spends a third column on dates** — 256 px rail +
  ~85 px "Jump To" + content.

---

## The codebase

Reviewed alongside, because most of the above is a code shape rather than a
design mistake.

**What's genuinely good.** The shared record infrastructure is the strongest
thing here: `useRecordList` + `RecordListPage` + `RecordPageHeader` give twenty
list pages one loading/empty/error contract and one header skeleton, and the
comments explain *why* each slot exists rather than what the code does. The
i18n set-up is better than it looks — a runtime DOM pass, a dictionary, and a
`translationCoverage.spec.ts` with two scanners and an escape-hatch baseline
currently at `[]`, i.e. zero known gaps. `FactList`, `isAllergyNegation`,
`dateFormatters` and the named z-scale are all real consolidations from the
earlier passes, each with the defect it fixed written down next to it. Modals go
through one HeadlessUI `Dialog`, so focus trapping and Escape are handled in one
place, and only the toast layer is hand-rolled (correctly, with `aria-live`).

**The bundle is one chunk.** `React.lazy` appears **zero** times. The build emits
two JS files; the entry is **4.8 MB raw / 1.3 MB gzipped**, and everything is in
it — the C-CDA parser, `recharts`, `rxdb`, `fhirpath`, and **three.js**
(`WebGLRenderer` is in the chunk, pulled in by `react-odontogram` for the 3D
tooth chart). A phone opening the timeline downloads and parses the WebGL
renderer for a chart on one sub-page of one specialty workspace. Route-level
`lazy()` on the 46 routes, and a dynamic import for the odontogram, is the
highest-value change available in this repo and needs no design decisions.

**231 console statements ship to production**, 74 of them `console.log`. Two are
per-render: `UserPreferencesProvider.tsx:97` dumps the user's preferences object
on every change, and `DocumentReferenceCard.tsx:29` logs on every render of a
card with matched chunks. In an app whose pitch is "self-hosted, privacy-focused"
— and which bundles `console-feed`, an in-app console viewer — record content
reaching the console is worth a deliberate decision rather than a leftover.

**Type discipline is loose in the FHIR layer**: 305 `: any` / `as any`. That is
defensible where it is (untyped external FHIR payloads) but it is concentrated
in exactly the code that decides what a record *means*, which is where a wrong
shape becomes a wrong number on screen — §2 and §3 are both that.

**Tests are real but thin at the top**: 70 spec files against 631 sources, and
they cluster on parsers and hooks. Every finding in this review sits above that
line — cross-screen agreement, restoration, translation of composed strings —
and none of them could have been caught by the existing suites. A single spec
asserting "every screen that counts allergies gets the same number" would have
caught §2 the day it was introduced.

**Two housekeeping notes.** `package.json` requires `node >=25.3.0` while the
container runs 22.22.2 — the build works, so the floor is probably wrong.
`@nrwl/webpack@19.8.9` drags in a second, legacy `nx` under `@nrwl/tao`, whose
postinstall crashes with a bus error; `npm ci --ignore-scripts` is the
workaround, and dropping that dependency would remove the need for it.

---

## Suggested order

**Do first — small, and each closes a whole class**

1. Publish the record-change signal from sync and import (§1). One line each.
   Then delete the reloads it was hiding.
2. Move the allergy-negation filter next to the query so Summary and Export
   agree with the nav (§2).
3. Name the Results remainder, or drop procedures and documents from the page
   (§3); print the report narrative once (§3).
4. `t()` the three search placeholders and turn the timeline card title into a
   format string (§5).
5. Route-level `React.lazy` and a dynamic import for the odontogram (codebase).

**Then — structural**

6. Scroll restoration in `AppPage`, keyed on `location.key` (§4).
7. One destructive-action treatment; undo-on-toast for the two list deletes (§6).
8. Replace Dental's "What to do next" with something completable, or remove it
   and let the tiles speak (§7).
9. Decide what Providers & locations is (§9), and whether three download doors
   should be one (§8).

**Worth a conversation**

10. Make `useRecordList` reactive on `clinical_documents.$` and retire the tick.
11. Finish the logical-property conversion before the next RTL regression.
12. Strip production `console.*`, or route it through a debug flag.
