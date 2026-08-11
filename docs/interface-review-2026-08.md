# Interface review — mobile, tablet and desktop

A pass over every screen the app can render, at three widths, looking for what
holds up and what doesn't.

> **Status:** everything in "Suggested order" below has since been implemented —
> see the commit *"Fix what the interface review found"*. The findings are kept
> here as written, because the reasoning is what makes the fixes reviewable.
>
> One correction to the original text, folded into finding 1: the app's own nav
> rail was never the problem. `TabWrapper` already writes the rail after the
> content and puts it back on the left with `md:flex-row-reverse`, so tab order
> reached the page first. The list that genuinely preceded page content was the
> Records **side nav**, on the 33 routes that mount the Records shell — measured
> by tabbing the built app, not read off the CSS.

## How this was done

The production build was served locally and driven through the `/demo` route, so
every screen had realistic data in it (222 results, 16 immunisations, 3 plans,
two specialty workspaces, five connected portals).

- **46 routes** — every entry in `apps/web/src/Routes.ts` that renders a page,
  plus the 404 — captured at **393×852** (phone), **834×1112** (tablet) and
  **1440×900** (desktop): 138 page loads, 276 screenshots.
- **15 interaction states** captured separately: the More sheet, the command
  palette (empty and with a query), the notification panel, the collapsed rail,
  an expanded timeline card, lab / condition / document detail, the add-source
  modal, and several scrolled states.
- Each load was also probed in-page for overflow, tap-target size, clipped text,
  accessible names, unlabelled inputs, sub-12px type, heading structure and
  landmarks.

Nothing threw: **0 load failures and 0 console errors across all 138 loads**, and
no page overflows its viewport horizontally at any of the three widths. The
problems below are all design and structure, not breakage.

---

## Verdict at a glance

**Genuinely good, leave alone**

- **Add record** (`/records/new`) — grouped, every type described in a sentence,
  reflows 1 → 2 → 3 columns cleanly. The best-composed screen in the app.
- **Health maintenance** — status grouped by urgency, each item explains why it's
  recommended, and each has a direct "Log record" action.
- **Vitals** — value, unit, date, sparkline and a disclosure for history, in one
  compact card. This is the density every list page should aim at.
- **The phone's Records model** — hub of grouped cards, drill in, persistent
  "All records" back link. Correctly *not* the desktop's 25-item rail.
- **The More sheet** — 2-up grid, real labels, everything ≥44px, a grabber, a
  proper title.
- **404** — says what happened, reassures that records are untouched, offers two
  ways out.
- **Desktop Labs at ≥1248px** — the table with linked reports and per-row status
  is the right shape for that width.

**Works but is being undermined**

- The **desktop Labs table** is unusable between 768 and ~1248px (below).
- The **Records hub** is good on desktop and confusing on phone, because the two
  render the same state differently.
- **Visit prep** is well-built but overlaps two other tools.

**Doesn't hold up**

- Lab detail, document detail — stat-card walls where the actual content is.
- Trackers — opens with a blank form instead of your data.
- Providers & locations — permanently empty while provider names are everywhere.
- The global search — can't find a record.
- The tablet band (768–1024px) generally.

---

## Cross-cutting issues

These repeat across many surfaces, so they're worth more than any single-page fix.

### 1. No `<main>` landmark and no skip link — on all 46 surfaces

Verified on every capture: `document.querySelector('main')` is null everywhere,
and there is no skip-to-content link in the codebase.

Tabbing the built app shows what that costs. The app's own rail is fine — it is
written after the content and drawn on the left with `md:flex-row-reverse`, so
the first tab stop on the timeline is the timeline. But on the 33 routes that
mount the Records shell, the **side nav** is written first, so the first twenty
tab stops on Labs are Labs, Vitals, Imaging, All results, Problems… every time.
The timeline's "Jump To" rail does the same with one stop per date on record.
With no landmark and no skip link there is nothing to jump past them with.

The app is otherwise careful here (one `h1` per surface, `sr-only` text behind
the dash-shaped counts, `aria-label`s on the icon buttons, no images missing
`alt`), which makes this the odd gap out.

**Fix:** a `main` landmark and a skip link in `TabWrapper`; write the Records
side nav after the content and put it back with `lg:flex-row-reverse`, the trick
the shell already plays; make the timeline's date rail a named `nav` so it can
be skipped by landmark too.

### 2. The tablet band gets desktop layouts in a phone-width column

The rail switches on at `md` (768px) and takes 256px. The content layouts that
replace the phone ones, however, assume desktop widths. At 834px the content
column is 578px — narrower than most phones in landscape — and the following
break there:

- **Labs.** The table is wrapped in `min-w-[62rem]` (992px). In a 578px column it
  is cut off: the probe measured content extending to 1272px against an 834px
  viewport, and the screenshot shows `Jan 1, 20⋮` sliced mid-string with the
  **Linked report** and **Status** columns entirely out of reach. Anything from
  768px up to ~1248px is affected — that's every tablet and a large laptop
  window.
- **Dental and Optometry tab strips** overflow at tablet as well as phone
  (measured out to 1134px at an 834px viewport).
- The **timeline year strip** overflows to 1165px.

The strips are meant to scroll, so they degrade acceptably. The table does not —
it's the one place where data is genuinely unreachable.

**Fix:** either hold the phone's card layout until `lg`, or drop `min-w-[62rem]`
and let the table collapse columns.

### 3. Sub-44px controls, including on touch devices

102 distinct control sizes came back under 44×44. Desktop-only ones matter less;
these do not:

| Control | Size | Where |
| --- | --- | --- |
| Rail header buttons (Sharing / Search / Collapse) | 40×40 | desktop **and tablet**, 45 routes |
| Dentition segmented control | 24px tall | Dental chart, phone |
| Tooth grid buttons | 38×38 phone, 27×34 tablet | Dental chart |
| Records side-nav rows | 36px (32px for specialty children) | desktop, 32 routes |
| Timeline "Jump to" dates | ~30×28 | desktop |
| "Dismiss options" menus | 24×24 | Summary |
| Sparkline / unpin buttons | 32×32 | Labs |
| Text inputs across Sharing, Trackers, Export, Care plans | 38px tall | all widths |
| Checkboxes | 16×16 | all widths |

Worth noting: `TabWrapper.tsx` already carries the comment *"this app's own audit
counts a 38px Save button as a defect"* — and 38px is the height of nearly every
input in the app.

### 4. Five date formats

| Format | Where |
| --- | --- |
| `Apr 8, 2026` | most lists — the house style |
| `2025-10-22` | Immunizations recommendation text, Dental chart cards |
| `8/11/2026, 4:12:58 PM` | Visit prep "Generated:" |
| `08/11/2026, 04:13 PM` | Trackers datetime input |
| `mm/dd/yyyy` | native date inputs (Sharing, Care plans, Trackers) |

Immunizations manages two of them in one card, saying the same thing twice:
*"Next due Oct 2025"* directly above *"Estimated next dose date is 2025-10-22."*

### 5. Two search boxes, and the global one can't find a record

The rail's magnifying glass and the phone's More → Search both open the command
palette. Typing `blood` into it returns **Labs** and **Trackers** — page names.
It searches destinations only. Meanwhile the Timeline's own field, styled almost
identically, is labelled "Search your medical records" and does search records.

The one reachable from anywhere is the one that can't find anything you own.

### 6. Rows that navigate aren't links

Lab rows are `<div role="button" tabIndex={0} onClick={…navigate()}>`
(`LabsTable.tsx:140`, `:284`) with **more buttons nested inside them** (the
sparkline and pin controls). Consequences: no `href`, so no open-in-new-tab, no
copy-link, no status-bar preview; assistive tech announces "button" for
something that navigates; and nested interactive controls inside a `role="button"`
is an invalid, ambiguous structure for keyboard users.

### 7. Placeholder-only labels

Trackers (**Symptom name**, **Value**, **Unit**, **Optional note**), Care plans
(**"What do you need to do?"**, plus a bare date input), Visit prep's notes
field, and the Timeline search all rely on placeholder text as the only label —
it disappears the moment you type. Two date/datetime inputs have no accessible
name at all.

### 8. Toasts render above modals and sheets

The notification layer is `z-50` (`NotificationProvider.tsx:85`); the mobile More
sheet is `z-40` (`TabWrapper.tsx`). Any toast that arrives — a sync completing,
an import finishing — lands on top of the open sheet and covers its buttons.
Observed directly: the demo's welcome toast obscuring three of the sheet's own
entries.

### 9. Title Case vs sentence case, on the same screen

Page banners say **Growth Charts**, **Wallet Card**, **Health Maintenance**,
**Imaging & Scans**, **My Conditions**; the navigation, hubs and tool switcher
that sit *directly above them* say growth charts, wallet card, health
maintenance. The Utilities pages show both names simultaneously. The rest of the
app is sentence case ("What to do next", "Booster and schedule recommendations"),
so the banners are the outlier.

Separately, some pages and their nav entries are named different things, not just
cased differently: the nav says **Vitals**, the page says **Vital signs**; the
nav says **Providers**, the page says **Providers & locations**.

### 10. Pluralisation

"**1 items**" on Documents group headers; "**3 item(s)** need attention" on
Immunizations — against correct "1 record" / "3 records" elsewhere.

### 11. Arabic is offered; the layout doesn't mirror

`translations.ts` declares Arabic with `dir: 'rtl'`. The codebase has **370**
physical-direction utilities (`ml-`, `pr-`, `left-`, `text-left`…) against **26**
logical ones (`ms-`, `pe-`, `start-`…) and **3** `rtl:` overrides. Selecting
Arabic translates the strings into an unmirrored LTR layout.

### 12. All-caps grey micro-type does three different jobs

Section headings (`RESULTS`, `HEALTH PROFILE`), stat-card labels (`TOTAL
RESULTS`, `NEEDS ATTENTION`) and field labels (`MEMBER ID`, `RELATIONSHIP`,
`PERIOD`) share one treatment, so nothing in the type system distinguishes "this
is a group of things" from "this is one field of one record".

---

## Navigation and information architecture

**Records counts are rendered two ways, and the phone gets the worse one.** The
desktop rail shows an en dash with `sr-only` "not counted", plus a footnote under
the overview explaining that combined views aren't tallied. The phone's hub cards
say "**Not counted**" in plain text on five of them — Labs, Vitals, Imaging, All
results, My conditions — with no footnote anywhere, because the explanation lives
inside a `hidden lg:grid` block. On a phone, the five most-used categories look
broken. Either use the dash on both, or replace the count with a descriptive
subtitle ("Blood work and panels").

**Desktop has no in-page sub-navigation for the specialty workspaces.** The
Dental and Optometry tab strips are `lg:hidden` (`DentalLayout.tsx:50`,
`OptometryLayout.tsx:34`), so above 1024px the five sub-pages exist only as
indented children in the records side nav — which at 1440×900 puts them *below
the fold of a separately scrolling column*. Opening Dental on a desktop shows a
half-empty page and no visible route to Chart, Treatment, Hygiene, Imaging or
Records. This is the one place where the desktop experience is materially worse
than the phone's.

**Three tools overlap on downloading your records.** Export, Sharing → "Download
your records", and Visit prep → "Visit record package" all produce a package,
and Sharing and Visit prep even share the same checkbox set (attachments / audit
trail / password-protect). Visit prep alone offers Markdown, HTML, Print/PDF,
`.emrpkg`, packet preview and file preview — six actions whose differences aren't
explained anywhere.

**Sharing leads with something that isn't sharing.** The page is titled "Sharing
and emergency access"; its first and largest card is "Download your records". The
sentence that actually sets expectations — *"The share grants below are your own
notes. They give nobody access on their own"* — is 12px grey fine print.

**Sharing is top-level on desktop and buried on phone.** It has its own icon
button at the top of the rail, but on a phone it's only reachable through More →
Utilities → Sharing.

**Two "Add record" buttons on one desktop screen.** The rail's and the Records
banner's, both visible simultaneously. Per-page the label varies — "Add record",
"Add goal", "Add dental record", "Add lab result" — which is good; the phone
loses it entirely and shows a bare **+**, so on Goals the only add affordance
gives no clue what it adds.

**Providers & locations is empty and offers no way out.** It shows "No providers
recorded yet" and "No locations recorded yet" while provider and facility names
(Ben Bora, Smiles Family Dentistry, ClearView Optometry, Oak Valley Community
Hospital) appear on records throughout the app. There's a search box for nothing,
no add action, and no explanation of how anything would get there.

**The desktop timeline spends a third navigation column on individual dates.**
After the 256px rail comes an 80px "Jump To" column listing every single record
date at ~28px a row. Collapsing the rail doesn't help — the reclaimed space goes
to the date list, not the records.

---

## Density and layout

**Fixed chrome above the scroll region, measured on a 393×852 phone:**

| Page | Chrome | Usable |
| --- | --- | --- |
| Labs | 309px + 66px tab bar | **477px (56%)** |
| Medications | 245px | 541px (63%) |
| Insurance / Documents | 193px | 593px (70%) |
| Timeline / Conditions | ~180px | ~605px (71%) |
| Records hub | 136px | 650px (76%) |
| Trackers | 125px | 661px (78%) |
| Summary | 64px | **722px (85%)** |

Labs is the extreme: banner, reference-standard selector, two unlabelled icon
buttons, a search field and three filter chips consume 44% of the screen before
the first result. It also opens pre-filtered to "Attention (5)" and announces
"5 of 50 lab tests listed" — a first impression of *"I only have five labs."*
Summary shows what the budget can be.

**Boxes inside boxes inside boxes.** Immunizations: page → "Booster and schedule
recommendations" card → per-vaccine card → per-field boxes. Trackers: page →
Totals card → per-type boxes. Dental chart: card → chart panel → tooth grid.
Three levels of border on a phone.

**Stat-card walls where content should be.** Lab detail (phone) stacks Latest
result / Flagged results / Comments / Reported by as four full-width cards
before the graph — roughly 900px of scroll to say "36%, one flagged, no
comments, unknown source". "Reported by" renders as a bold **0** with "Unknown
source" beneath it, and "Comments" as a bold **0** — numbers standing in for
words. Document detail is worse: a consent PDF gets four cards reading
**0 Linked records**, **0 Measurements**, **0 Abnormal**, **0 Panels** —
lab vocabulary applied to a form — followed by a visibly **empty bordered box**
that renders with no content in it.

**Repeated titles.** Lab detail shows "LYMPHS" in the banner and again as the
first card's heading, with "No flag" in both. The Results page prints each
record's title in its date-group header and again in the single row beneath it.
The 404 says "Page not found" in the banner and "There is nothing at this
address" in the card.

**Insurance stacks label over value**, so four fields fill ~460px per card and
three plans take ~2000px of scrolling to show twelve short values.

**Medications puts two cards ahead of your medications**: an allergies banner
(useful, but 300px tall) and a supplements card that exists to report that no
supplement facts were provided.

**Trackers opens with an empty entry form.** Your logged entries and totals are
below it. A page for reviewing what you've tracked leads with a blank form.

**Sources gives every connection a full-width row containing one "Sync" link** —
five near-empty bars on a 1440px screen.

**Desktop leaves large regions empty on sparse pages** (Dental overview, Goals,
Vitals, Directory, Audit log) — a narrow centred column with up to 500px of
navigation chrome beside it and most of the viewport unused.

**The two specialty workspaces don't match each other.** Dental: 3-column stat
grid + "What to do next". Optometry: 2-column stat grid + "Add an eye-care
record" with five buttons in two visual weights whose hierarchy isn't explained
(Glasses Rx and Contacts Rx solid; Eye exam, Surgery, Refraction outlined). Same
pattern, two executions.

**The dental chart shows two tooth charts at once** — an anatomical diagram and a
numbered grid, stacked, both representing the same dentition, with only the grid
interactive.

---

## Copy and semantics

- **"unknown" renders as a green badge** on the Results page — the same green as
  "final". Green for an unknown status reads as a pass.
- **"Overdue by 10m"** (Health maintenance) — months or minutes? The sibling
  entry says "2y 2m", so it's months, but "10m" alone is ambiguous.
- **"Not counted" / "Count unavailable" / "–"** are three renderings of one idea.
- **Underlined body text on Medications** — "by mouth 1 (one)" inside the DOSE
  line reads as a link.
- **The Medications search placeholder is clipped mid-word** on a phone:
  "Search medication, condition, source, status, or su⋮".
- **Timeline expanded cards show "12:00 AM"** as the time for labs that have only
  a date — midnight presented as a measurement time.
- **Timeline category headings are colour-coded** (Care Plans purple, Labs light
  blue, Procedures blue, Documents green) with no legend and no consistent
  meaning, and they look like links.
- **A floating scroll-to-top button overlaps the last timeline card** on a phone.
- **Add-source failure copy is developer-facing**: "This browser build is running
  without portal API configuration… portal OAuth needs PUBLIC_URL and server
  config." A self-hoster who missed an env var sees their configuration
  vocabulary in a patient-facing modal. (Reached here through the local static
  preview, but it's the real message for a misconfigured deployment.)
- **"Source type: manual"** — a lowercase value under Title Case labels on
  document detail.
- **Settings uses Title Case section headings** ("About Me", "Interface
  Language", "Privacy and Security") against the app's sentence case, and
  "Switch User" — a whole-profile change — is a plain text link in a card header.
- **The Alerts entry in the More sheet** is centred with its icon above its label
  while the other five entries are icon-left / label-right in the same grid.

---

## Suggested order

**First — cheap, and they land on every surface**

1. `<main>` + skip link in `TabWrapper` / `AppPage`.
2. One date formatter, used everywhere; drop the duplicate "next due" sentence on
   Immunizations.
3. Fix "1 items" and "3 item(s)".
4. Pick sentence case for banners and make them agree with the nav.
5. Raise the toast layer above `z-50`, or the sheet/modal layer above the toasts.
6. Real `<label>`s on the Trackers, Care plans and Visit prep inputs.

**Second — the structural ones**

7. Hold the phone's Labs card layout until `lg`, or drop `min-w-[62rem]`. This is
   the only place data is currently unreachable.
8. Give the desktop specialty workspaces a visible in-page sub-nav.
9. Make the command palette search records, or rename it so it doesn't promise to.
10. Make lab rows `<Link>`s and lift the nested buttons out of them.
11. Trim the Labs phone header, and reconsider opening pre-filtered to "Attention".

**Third — design decisions worth a conversation**

12. Collapse Export / Sharing's download card / Visit prep's package into one
    place, or state plainly how they differ.
13. Replace the stat-card walls on lab and document detail with the content the
    page exists for.
14. Decide what Providers & locations is for — populate it from record
    provenance, give it an add action, or remove it.
15. Give Records' uncounted categories a descriptive subtitle instead of
    "Not counted".
16. Put your tracked data above the entry form on Trackers.
17. Bring the two specialty workspaces onto one layout.
18. Either finish RTL (logical properties) or drop Arabic from the picker until
    it's ready.
