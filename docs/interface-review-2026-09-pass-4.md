# Interface review, fourth pass — what the app claims

A fourth walk over the app, at 393 px, 834 px and 1440 px. The first pass asked
whether each screen was *drawn* correctly. The second asked whether it *said*
something a person could read. The third asked what happens when you **use** it
over time. This one asks a narrower question and asks it of every screen:

> **Is what this screen says about me true?**

Not "is it well laid out" or "does it say it in English" — is the sentence on
screen a fact about this person's records, and does the screen have the
evidence to make it.

**Setup:** clean production build (`nx build web`), served locally, driven
through `/demo` with the demo dataset (222 results, 16 immunisations, 13
conditions, 3 medications, 5 connected portals) and — separately, which is
where most of this pass's findings come from — through the **real app with an
empty database**, the state every new install starts in. 138 surface captures
across 46 routes at three widths, plus interaction probes: keyboard order,
accessible names against visible labels, heading outlines, form validation and
empty states.

**Baseline before:** 698 tests in 81 suites, all passing. `tsc` clean.

---

## What the earlier passes closed, and stayed closed

Worth stating first, because the static hygiene is now genuinely clean and this
review would misrepresent the app if it opened with a list that implied
otherwise. Across all 138 surfaces:

| Probe | Result |
| --- | --- |
| Horizontal overflow | **0** at every width |
| Controls with no accessible name | **0** |
| Inputs with no label | **0** (and none relying on a placeholder) |
| Duplicate `id`s | **0** |
| `aria-labelledby` / `describedby` / `controls` pointing at nothing | **0** |
| Console errors | **0** (three recharts layout warnings on first paint) |
| `main` landmark + skip link | present on every route, skip link first in tab order |
| Scroll restoration, URL-addressable filters | working, verified on Labs |

The list pages' keyboard order is sensible, forms validate and say what is
wrong (`Name * A name is required.`), and every route has exactly one `h1`.

Two things the probes did find are in §6 and §7 below; everything else in this
pass is about the *content* of a claim rather than its markup.

---

## 1. The Medications page cannot say what you are taking

The most consequential finding of the pass, because it is the question the page
exists to answer.

The demo's three medications are all `status: active`. The chip row reads:

> **All 3 · Current 0 · Planned 0 · Stopped 0 · Supplements 1 · Needs review 2**

**Current 0**, over a list of three active prescriptions, each card showing a
green **active** pill.

The cause is one line of ordering in `classifyGroup`
(`medicationViewModel.ts`): `needsReview` was a group in the same exclusive
ladder as the clinical ones, and it was tested *before* `status === 'active'`.
A medication reaches `needs-review` whenever `adherence` is `unknown`
(`getReconciliationState`), and adherence is only ever known from
`medication-adherence` — a Mere extension that Mere's own builder writes and no
portal does. So **every medication that arrives from a patient portal is
"needs review", and therefore not "Current"**, however active it is.

The same defect had already been found once, from the other end: the
transposition work in `fc4b2c1` taught the reader to consult the adherence
extension precisely because "a whole imported medication list landed there with
Current showing zero". That fixed the packages Mere builds. Everything synced
from a portal still lands in the same place.

Two smaller things on the same screen:

- **Each card printed `ADHERENCE — unknown`** in a four-column field grid: the
  absence of a finding, laid out as a finding, on every card. (The
  reconciliation badge already learned this rule — `unknown` renders nothing.)
- **The badge and the chip disagreed on one card.** The Vitamin D row carried a
  "needs review" badge while the "Needs review" chip counted it under
  Supplements, because the badge reads `reconciliationState` and the chip read
  the exclusive group. One screen contradicting itself about one record.

**Shipped.** `MedicationGroup` is the clinical reading only — current, planned,
stopped, supplements. Reconciliation became `needsReconciliationReview`, a
filter *across* the groups, so a drug can be Current and still want checking,
and the chip now agrees with the badge on the card. `matchesMedicationFilter`
is one rule shared by the chip counts and the list beneath them. Adherence of
`unknown` renders nothing. The demo now reads **All 3 · Current 2 · Supplements
1 · Needs review 3**.

## 2. A brand-new user is told five vaccines are due

Open the app with an empty database — no records, no birth date, the sidebar
reading "Unknown User" — and go to Immunizations:

> **Booster and schedule recommendations**
> 5 items need attention based on the selected schedule.
>
> Td/Tdap booster · **Due now** — Shingles series · **Due now** *(Recommended:
> Adults 50+)* — HPV series · **Due now** — Seasonal flu · **Due now** —
> COVID-19 booster · **Due now**

Every card underneath states, correctly, *"No matching doses found in the
record."* The badge above it says **Due now** anyway, and the header counts all
five as needing attention. The forecast cannot tell "no dose on file" from "no
dose given" — they are the same input — so an empty record set marks the entire
routine schedule overdue. A user who is fully vaccinated but has not yet
connected a portal is told, on their first visit, that they are behind on five
vaccines. Two of the five are age-gated rules (Shingles 50+, HPV) being
recommended to somebody whose age the app does not know.

The forecast package makes that choice deliberately — *"When the age is unknown
we keep the rule (better to over-surface than to silently drop guidance)"* — and
that is defensible. The word doing the work is **silently**. The app can
over-surface out loud.

It already does, one screen away. **Health maintenance**, which answers the same
question from the same profile, withholds and says why:

> Add birth date and sex/gender in Settings to tailor age and sex-sensitive
> reminders. Items that need missing details are withheld.

Two screens, one job, opposite postures.

**Shipped.** The recommendations panel takes `hasRecords` and `hasBirthDate`.
With no immunisation records nothing is counted as needing attention, and each
rule is badged **No records yet** rather than Due now / Overdue, under a line
saying the list is the routine schedule for the country and not a finding about
you. With no birth date the panel says so and links to Settings, in the same
voice Health maintenance uses. Once a record exists, the forecast reads exactly
as before.

## 3. Two date formats, one of them ambiguous

The Summary page prints, within one screen:

| Card | Date shown |
| --- | --- |
| Trackers | `Jun 11, 2026` |
| Results | `Jan 1, 2023` |
| **Medications** | **`09/05/2023`** |
| **Conditions** | **`04/08/2026`** |
| **Allergies** | **`05/30/2019`** |

`04/08/2026` is 4 August to a British reader and 8 April to an American one.
Both are real dates, so a misreading is invisible from that point on — the same
hazard the transposition work wrote a whole `dateConvention` mechanism to
handle on the way *in*. The timeline lists that very record as **Apr 08**.

Pass 1 consolidated five date formats into one `dateFormatters` module with a
house date (`formatRecordDate` → "Apr 8, 2026"). Four Summary cards and the
timeline's related-labs row never moved onto it, and the shared-package panel
used the browser's `toLocaleDateString()` with no options, which is the same
numeric ambiguity by another route.

**Shipped.** All six now use `formatRecordDate`. No `MM/dd/yyyy` remains in the
app.

## 4. "final" on two hundred rows

The Results list badged **every** row. In the demo: `final` on **205** of them,
and a grey **No status** on the other **11** — the documents whose source never
set the field.

Neither says anything. A finished result is the normal case for a result, and a
status the source omitted is the absence of a finding rather than a finding of
its own — which is exactly the rule the medication reconciliation badge had
already been taught. The one thing on the row anybody scans for, **Attention**,
was competing with two hundred emerald pills saying "this result is a result".

**Shipped.** `notableResultStatus` badges only the statuses that change what you
would do — Preliminary, Awaiting result, Partial, Amended, Corrected, Cancelled,
Entered in error — plus Attention. Everything else gets no badge. The detail
pane's metadata grid still shows the status, in words: "Final", not `final`.

## 5. The audit log did not know about imports or syncs

The page promises:

> Imports, edits, exports, shares, AI access, and sync events will appear here
> as local audit entries.

`appendAuditLog` had exactly three callers: the manual-entry form, Sharing, and
Visit prep. **Nothing wrote an import. Nothing wrote a sync.** The Export page —
the one door that hands over the entire record set — wrote nothing either. Of
the seven actions the type declares, three had no writer at all.

So a sync that pulled in hundreds of records, or an `.emrpkg` import that
replaced the whole database, left a page headed "Audit log" reading **"No audit
events yet"**. That is worse than having no page: a reader with a reason to
check would conclude nothing had happened.

**Shipped.** `recordAuditEvent` — best-effort, resolves the selected profile at
write time, never fails the thing it describes — and calls from the three
missing places:

- **inside `importEmrpkgToRxDb`**, not at the six screens that call it, so a new
  import door cannot be silent by omission. Logged after the restore, since a
  replacing import clears `workflow_records` along with everything else.
- **inside `handleJSONDataImport`**, the other import path — a legacy JSON
  backup, and the demo's own seed.
- **on sync completion**, with how many sources succeeded and how many failed.
- **on both Export downloads.**

The entries also read as English now: the card printed `record.export ·
local-user`, the record's internal name for the event. It says "Records
exported · On this device".

## 6. The rail button says Alerts and announces itself as Notifications

On all 138 surfaces, one control's accessible name did not contain its visible
label: the bell in the navigation rail is labelled **Alerts** and carries
`aria-label="Notifications"`. A screen reader announces a name its user cannot
see; "click Alerts" matches nothing in voice control. WCAG 2.5.3, Label in
Name.

**Shipped.** The button is named for what it says. The panel keeps its own
title.

## 7. Record cards are `h3` directly under the page `h1`

Eight routes skip a heading level, identically at all three widths: Allergies,
Conditions, Encounters, Goals, Procedures, Referrals and Vitals put the record
card's title in an `<h3>` with no `<h2>` between it and the banner, and Sources
puts its import cards in an `<h4>` under an `<h2>`. Navigating those pages by
heading — which is how a screen-reader user skims a fifty-row list — jumps 1 → 3
and lands on nothing in between.

**Shipped.** The seven card titles are `<h2>`; the Sources action cards are
`<h3>` under their section.

## 8. The add-record form named an internal database

Under **Link original document**, every user met a disabled file picker and:

> File linking is available when the local Dexie database is enabled.

"Dexie" is a JavaScript IndexedDB wrapper. The storage backend it names defaults
to `rxdb` and can only be changed by writing a `localStorage` key, so this was
on screen for **every** reader of the form, describing a switch they cannot
reach, in the name of a library they have no reason to know.

**Shipped.** The block renders only where attachments work. A control nobody can
use, explained in terms nobody can act on, is worse than no control.

## 9. Smaller claims that were not quite true

- **Dental, with no dental records:** *"What to do next — Nothing open. Every
  dental record here is complete."* "Nothing open" is a finding about a set of
  records; with no records there is no set. It now says no dental records exist
  yet. *(Shipped.)*
- **Optometry, with no records:** seven tiles reading 0. Dental's zero tiles
  were removed in pass 3 for the same reason — a count of nothing is not a fact
  about your eyes — and Optometry kept its. *(Shipped: empty categories drop
  out, and the panel disappears when they all do.)*
- **Export's chip said `Results · 233`** where the Results page's own headline
  says **222**, because the chip counts vitals and other observations and the
  page does not. A paragraph below explained it; a chip carrying a page's name
  and a different number is read long before a paragraph is. The printed
  summary in the same screen already called that bucket "Results & vitals". So
  does the chip now. *(Shipped.)*
- **Immunizations printed the next dose date twice** — a "Next due" field
  reading `Oct 2025` with *"Estimated next dose date is Oct 22, 2025."* directly
  underneath. Where a due date exists that sentence is the forecast's entire
  reason, so it was always the same fact in two formats. The field carries the
  exact day now and the sentence is dropped when it only restates it; reasons
  that say something else ("No matching doses found in the record.") still
  print. Flagged in pass 1, survived three passes. *(Shipped.)*
- **`/assistant` redirected silently to Settings** when the assistant is off,
  dropping anyone with a bookmark onto an unrelated page with no explanation —
  the exact shape `NotFoundPage` was written to replace. It now says the
  assistant is switched off, and where the switch is. *(Shipped.)*
- **Two typos in shipped copy:** "a seperate proxy service" (Settings, and its
  Arabic dictionary key) and "enable persistant storage" (a toast).
  *(Shipped.)*
- **Sharing led with the download card** under a page titled "Sharing and
  emergency access", so at 1440 px the page opened on neither the emergency
  profile nor the caregivers — both sat below the fold behind a package builder
  that Export and Visit prep also offer. The two sections the title promises
  lead now; the download card and the share grants it produces follow. Pass 3
  §8. *(Shipped.)*
- **Summary's "For you" tiles composed "3 records" in English** and passed the
  finished string to `t()` — one of an unbounded set of sentences a dictionary
  cannot hold, so all three tiles stayed English in Arabic. The same shape pass
  3 fixed for timeline card titles. They fill a `{count}` format string now.
  *(Shipped.)*

---

## Still open

Deliberately not fixed in this pass. Each is a judgement call rather than a
defect with an obvious answer.

**The Records hub says two different kinds of thing.** Within one grid: "Labs —
Blood work and panels" beside "Conditions — 13 records"; "Providers — People and
places" beside "Documents — 11 records". The blurb is a real improvement on
pass 1's "Not counted", but a reader still cannot tell whether a card without a
number is empty. In the desktop side nav the same eight categories render a
literal "–". Every one of those pages now has a headline count of its own
(Labs 50, All results 222, Providers 5, Dental "22 dental records"), so the
numbers exist — but they are *derived* counts, and computing them a second time
in `useRecordCounts` is precisely how two screens come to disagree, which is the
defect pass 3 §2 spent its effort on. Worth doing only by sharing each page's
own derivation, not by re-implementing it.

**Wallet card and Visit prep still build packages from an empty library.** Both
render a printable artefact with no records in it. (The Export page's buttons
disable at zero, which is the right treatment.)

**Every list row costs three tab stops** — expand, title link, panel link — so
crossing a 50-row lab list takes 150, with no way past. The skip link reaches
`main`, not the far side of the list.

**231 `console.*` statements** remain in source; production strips `log`,
`debug` and `info`, so this is about the source rather than the bundle.

---

## What shipped, in one table

| # | Finding | Change |
| --- | --- | --- |
| 1 | Current 0 over three active drugs | Reconciliation is a filter, not a clinical group; `matchesMedicationFilter` shared by chips and list; `unknown` adherence renders nothing |
| 2 | Five vaccines "Due now" on an empty install | Panel gated on `hasRecords` / `hasBirthDate`, with the sentences Health maintenance already uses |
| 3 | `04/08/2026` beside `Jun 11, 2026` | Six components moved onto `formatRecordDate` |
| 4 | "final" on 205 rows, "No status" on 11 | `notableResultStatus`: a badge only where it changes what you would do |
| 5 | Audit log missing imports, syncs, exports | `recordAuditEvent`, called inside the import service, on sync completion, and on both Export downloads; actions rendered in English |
| 6 | "Alerts" announced as "Notifications" | Accessible name matches the visible label |
| 7 | `h1` → `h3` on eight routes | Card titles promoted; Sources cards demoted to `h3` |
| 8 | "the local Dexie database" in the add form | Block renders only where attachments work |
| 9 | Nine smaller claims (see above) | All shipped |

**Baseline after:** 723 tests in 85 suites, all passing (was 698 in 81). `tsc`
clean, `eslint` clean, no console errors on any surface. New specs cover the
medication grouping rule and its shared filter, the immunisation gating and the
duplicated due date, the result-status badge, and the audit helper — including
that a failed audit write cannot take down the import it was describing.
