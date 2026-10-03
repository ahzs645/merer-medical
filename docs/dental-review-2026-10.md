# Dental review — what the workspace tells you about your teeth

> **Status:** fourteen of the fifteen findings are fixed, and §14 is
> documented rather than built — see "What shipped" at the foot. The findings
> are kept as written. Part 1 (§1–§10) is the screens; Part 2 (§11–§15) is how
> dental data gets in. Ordered by how much a wrong answer would mislead the
> person reading it, not by how hard it is to fix.

Companion to the six interface-review passes. Those walked every surface and
asked whether it was drawn right, true, usable over time, reachable, and what
the device adds. Dental came up in them only in passing (the tab strip, the
tap-target sizes, the "What to do next" list). This pass opens only Dental and
asks one question of each of its six sub-pages:

> **If I had never seen a dental chart, would this page tell me the truth about
> my mouth — and what I should do next?**

**Setup:** clean production build at `684e82e`, served locally, driven through
`/demo/records/dental/*` with the bundled dental demo (23 records). Desktop is
1440 × 900; phone is 393 × 852 with touch. Every finding below was reproduced in
the browser or by running the code's own regular expressions, not by reading
alone, unless it says "by inspection".

---

## What came back clean

| Probe                                                  | Result                                    |
| ------------------------------------------------------ | ----------------------------------------- |
| Horizontal overflow, 6 sub-pages × 2 widths            | **0**                                     |
| Console errors                                         | **0**                                     |
| three.js loaded only on Chart and Imaging              | yes — the pass-3 split holds              |
| Tab strip reachable at every width                     | yes, with the phone's short labels        |
| Tooth grid on phone                                    | 38 × 38 px — above the 24 px WCAG minimum |
| Grid ↔ records: tap a tooth, see that tooth's records | works                                     |
| Empty workspace ("No dental records yet…")             | honest, per pass 4                        |
| Ortho records (aligner 8/24, phase, next visit)        | the richest panel in the workspace        |

The structure is sound. Six sub-pages — Overview, Chart, Treatment, Hygiene,
Imaging, Records — is the right split for a patient, and the data model
(`types.ts`, the Open Dental mapping doc) is far ahead of what the screens yet
show. Almost everything below is about the **inference layer** between the
records and the screen, and about the chart.

---

## 1. The two tooth charts disagree about where the lower teeth are

The Chart tab draws an anatomical odontogram (react-odontogram, `layout="square"`)
beside a numbered grid. Measured left-to-right on screen:

| Row   | Odontogram (FDI)                      | Grid (Universal / FDI)                    |
| ----- | ------------------------------------- | ----------------------------------------- |
| Upper | 18 17 … 11 · 21 … **26** 27 28        | 1/18 … 14/**26** … 16/28 ✓ same           |
| Lower | 38 37 **36** … 31 · 41 … **46** 47 48 | 32/48 31/47 **30/46** … 19/**36** … 17/38 |

The upper rows agree. **The lower rows are mirror images of each other.** On
the odontogram, the red tooth third from the left is FDI 36 (Universal 19, the
patient's _lower left_ first molar). On the grid directly beside it, the red
tooth third from the left is Universal 30 (the _lower right_ first molar).
Tap "the red one at the left" on each and you get two different teeth.

The grid is the one that's right. Clinical charts are drawn as if facing the
patient: upper 18→28, lower 48→38, so 16 sits above 46. The odontogram puts 36
under 16 — the opposite side of the mouth.

Also on this panel:

- **Selection doesn't sync.** Tapping 30 on the grid leaves the odontogram
  unselected; tapping a tooth on the odontogram selects it there and on the
  grid, but the library is multi-select (`singleSelect` is never passed), so
  earlier picks stay highlighted on the drawing after the grid has moved on.
- **The odontogram ignores the Dentition toggle.** Deciduous and Mixed change
  the grid; the drawing stays 32 permanent teeth.
- **The odontogram announces FDI.** Its `role="option"` teeth are labelled
  "Tooth 36" (FDI) for a screen reader on a page whose every visible number is
  Universal.
- **On a phone its teeth are 14 × 17 px** — below WCAG 2.5.8's 24 px — and the
  legend only lists the one colour in use ("Needs Attention", in the library's
  Title Case, not the app's).
- **Mixed dentition doesn't line up.** The baby teeth (A–J) wrap onto a second
  row starting under tooth 1, so A (upper right _second_ primary molar) sits
  under the permanent _third_ molar. They belong under 3–14.
- **At phone width each arch breaks into two rows of eight**, so the patient's
  upper left (9–16) is drawn _below_ the upper right. It stops reading as a mouth.

**Fix:** pick one chart. The numbered grid is accessible, correct, and already
does everything the drawing does except look like teeth. Either drop the
odontogram, or draw our own SVG arch from `orderArchForDisplay` (which is right
and has a spec) and retire the dependency. If the drawing stays: pass
`singleSelect`, re-key it on the selected tooth so it follows the grid, and
file the mirrored lower arch upstream. On phones, keep the grid at 16 columns
in landscape or scroll it horizontally, rather than wrapping an arch.

## 2. Tooth numbers written in FDI land on the wrong tooth

Tooth numbers are pulled out of free text with
`TOOTH_MARKER_PATTERN` (`dentalRecords.ts:150`). It has no word boundary after
the number, and it only knows Universal 1–32. Running the pattern itself:

| Text in the record         | Read as tooth | Should be                          |
| -------------------------- | ------------- | ---------------------------------- |
| "Occlusal caries tooth 36" | **3**         | FDI 36 → Universal 19 (lower left) |
| "Extraction of tooth 48"   | **4**         | FDI 48 → Universal 32              |
| "Crown tooth 46"           | **4**         | FDI 46 → Universal 30              |
| "Root canal tooth 11"      | **11**        | FDI 11 → Universal 8 (ambiguous)   |
| "Tooth 2.6 composite"      | **2**         | FDI 26 → Universal 14              |
| "Invoice #2024-118"        | **20**        | not a tooth                        |

Canada, the UK, Europe and Australia number teeth in FDI. The demo's insurers
(Pacific Blue, a "Canadian Dental Terminology" fixture) suggest the app's own
users are among them. A Canadian dental letter that says "caries on 36" puts a
red tooth on the wrong side of the wrong arch, and nothing on screen says the
number was guessed.

The manual-entry form has the same gap from the other side: a free-text
"Tooth" box (placeholder "e.g. 14") with no numbering-system choice, so a
Canadian entering "26" from their dentist's note gets Universal 26, a lower
incisor, not the upper-left molar they meant. `numberingSystem` already exists
on `DentalRecordDetails`; nothing sets it.

**Fix:**

1. A **tooth-numbering preference** (Universal / FDI), defaulted from the
   interface locale's region, used for display everywhere and as the default
   reading of unlabelled numbers.
2. End the pattern with `\b` (and reject `#` followed by 4+ digits), and when a
   number is 33–48 or 51–85 read it as FDI regardless.
3. Prefer structured data: FHIR `bodySite` codings for teeth before free text.
4. In the form, a **tap-a-tooth picker** (the grid, reused) instead of a text box,
   storing `numberingSystem` with the record.

## 3. Old problems never go away — a filled cavity stays red forever

A tooth's colour is decided by `getActionLevel` (`dentalClinicalModels.ts`):
if _any_ record on the tooth is a condition, finding, perio or referral, the
tooth is **"Needs attention"** — regardless of date, of FHIR status, or of a
later completed procedure. Concretely, in the demo:

- **Tooth 14** is red. Its records: periodontal pocketing (Feb 12), crown
  preparation **completed** Jan 20, and the treatment-plan summary. The Tooth
  timeline labels the completed crown prep **ACTIVE**, because the badge shows
  the tooth's level, not the record's.
- A caries finding in 2023 followed by a filling in 2023 would keep that tooth
  red indefinitely. There is no path from "Needs attention" to "Treatment done".
- `Condition.clinicalStatus` (`resolved`, `inactive`) and `Procedure.status`
  (`not-done`, `entered-in-error`) are never read; the demo's own records
  carry them.

**Fix:** decide per tooth from the **latest** event, not the worst one. A
finding is resolved when FHIR says so, or when a completed procedure on the same
tooth post-dates it. Show each timeline row's own status, not the tooth's.

## 4. "What to do next" lists X-rays and a document as open problems

The Overview's list ("9 records still open") contains, in order:

| Row                                | Shown as                    | Actually                            |
| ---------------------------------- | --------------------------- | ----------------------------------- |
| Orthodontic treatment plan         | Planned treatment           | ✓ — though its status is "Accepted" |
| Endodontic referral tooth 30       | Referral                    | ✓                                   |
| Dental treatment plan summary      | **Periodontal measurement** | a PDF plan summary                  |
| Dental CBCT mandible/maxilla       | **Active finding**          | an imaging study                    |
| Panoramic dental radiograph report | **Active finding**          | an imaging report                   |

Kind is inferred by keyword in a fixed order (`inferDentalKind`): ortho terms,
then surgery, then perio — so any record that mentions "bleeding", "plaque" or
"pocket" is a perio measurement, and every `observation` / `diagnosticreport`
that matches nothing else becomes an "Active finding". The same inference makes
"Crown preparation tooth 14" — a _completed_ procedure whose note says "final
crown delivery planned" — a **PROPOSED** treatment plan, because the note
contains "planned". "Bleeding improved compared with prior visit" is counted as
a perio **risk signal**.

The rows also link by kind, not to the record: tapping "Dental CBCT" opens the
Chart tab, where the CBCT does not appear (it has no tooth number).

**Fix:** let the resource type and FHIR status decide first; use keywords only
to sub-classify within a type. Imaging resources (`imagingstudy`,
`diagnosticreport` with an imaging category, `media`) never become findings.
"Planned" should match `ServiceRequest`/`CarePlan` with an open status, not a
substring. Each row should open the record itself (the app already has
`/records/documents/detail/:id`).

## 5. The one date a patient wants isn't on the page

Ask anyone what they want from their dental record and the first answer is
**"when is my next cleaning?"** The data to answer it is in the demo: the last
cleaning was **14 Aug 2025**, with "Six-month recall recommended". As of today
(3 Oct 2026) the next cleaning is **about eight months overdue**.

Hygiene → "Recall and scheduling" shows three past visits, each reading
**NO DUE DATE**, each subtitled "Recall record". The Overview doesn't mention
recall at all.

**Fix:** compute it. Last cleaning + recall interval (from the record's
`recallDueDate`, else its parsed "N-month recall", else 6 months) → "Next
cleaning due Feb 2026 · **overdue**". Put it at the top of Overview, next to
"Last X-rays" and "Last exam". This is the single highest-value line the
workspace could add.

## 6. Medical insurance is listed as dental claims

Records & claims → "Claims and EOBs" lists three items: NorthBridge **Dental**
Benefits, Pacific Blue Health — **Extended Health**, and Coastal Mutual —
**Previous Medical Plan** (cancelled). `isDentalClaimDocument` accepts _every_
Coverage / Claim / EOB resource by type. These are coverage records, not
claims, and two aren't dental.

None of the questions a patient has about dental insurance are answered:
how much of this year's maximum is left, what the next treatment will cost
out of pocket, whether the plan resets in January or on a policy anniversary.

**Fix:** only coverages whose type/class/payor is dental (or that are linked from
a dental record). Rename the panel to what it holds ("Dental coverage"), and
when the fields exist, show **annual maximum used / remaining** and the
**patient portion** of the open treatment plan. In Canada, the Canadian Dental
Care Plan (CDCP) is a coverage type worth recognising by name.

## 7. The 3-D scan preview shows teeth that aren't yours

Imaging → "Detected dental scan sources" finds two real STL files
(`upper-arch-demo.stl`, `lower-arch-demo.stl`) and, above them, renders a
generic arch labelled "Demo geometry", with an explanation that "patient scan
rendering is not implemented". On a medical record, a picture of _some_ teeth
next to _your_ scan file is the wrong default; most people won't read the
caption.

three.js is already in the bundle for this panel; `STLLoader` and `PLYLoader`
ship with it. Loading the attachment's bytes and rendering them is a small
change. Until then, show the file list and no picture.

The other Imaging panels:

- **"Imaging mounts"** shows one card, "Ungrouped dental imaging · 2 items" — it
  only exists for records with mount metadata, which none of the demo has.
  Hide it when every image is ungrouped.
- **"Dental imaging"** lists the orthodontic _consent form_ and the treatment
  plan _PDF_ as images, with "documentreference" and "application/pdf" as their
  descriptions. None of the cards open anything.
- The sibling **CBCTer** repo is a local-first CBCT viewer with tooth
  segmentation. A "View in CBCT viewer" hand-off for a CBCT study is the
  natural next step for the "Dental CBCT mandible/maxilla" record.

## 8. Records you can't open, labelled in machine words

- **Records & claims** is headed **"Dental records projection"** — a word from
  the data model.
- Each card's type badge prints `record.kind` raw: **TREATMENTPLAN**, **NOTE**,
  **FINDING**, **PERIO**. "Dental treatment plan summary — PERIO."
- "**No tooth number detected**" appears on 9 of 12 cards. It is the parser
  talking. Most of these records are about the whole mouth; say nothing.
- **"Showing 12 of 18 records"**, with no way to see the other six.
- Nothing is a link. Records can't be opened from Dental except via the edit
  buttons on manually-entered ones. The tooth panel's "Records for tooth 30"
  list isn't linked either.

## 9. Two panels on the Chart tab say the same thing, in a third vocabulary

Under the chart, **"Tooth-by-tooth status"** (one card per tooth) and **"Tooth
timeline"** (one card per record per tooth) repeat each other; the timeline
lists the treatment-plan summary three times, once per tooth it names. Neither
is a timeline of the mouth: completed work is excluded from it by design
(`buildToothTimeline` takes only active and planned records).

The same four states are named three ways on one page:

| Chart legend      | Status / timeline badge | Colour in status panel       |
| ----------------- | ----------------------- | ---------------------------- |
| Needs attention   | ACTIVE                  | red                          |
| Treatment planned | PLANNED                 | amber                        |
| Treatment done    | COMPLETE                | green                        |
| Record on file    | WATCH                   | **grey** (blue on the chart) |

The status panel also shows only the first 12 teeth **in tooth-number order**,
not urgency order, with no "more"; and its heading is the one string on the
page not wrapped in `t()`, so Arabic readers see English.

**Fix:** one panel: the selected tooth's full history (all records, dated,
each with its own status), defaulting to "teeth that need attention" when
nothing is selected. Use the legend's words everywhere.

## 10. Perio is a count of records, not a picture of your gums

Hygiene → "Perio overview" is three big numbers (Perio records 2, Affected teeth
3, Maintenance 2), three keyword chips (`bleeding`, `pocket`, `probing`,
lower-case), and the title of the latest "perio record" — which is the
treatment-plan PDF. On a phone the three numbers stack, one per row, and fill
the screen.

The data model already has `perioPocketDepths`, `perioBleeding`, etc. A patient
needs: deepest pockets and where, how many sites bleed, and whether that is
better or worse than last time — in words ("Most pockets are healthy (1–3 mm);
two sites on tooth 14 are 5 mm").

---

---

## What the research says

What the field does and what patients ask for, with the parts that change the
fixes above. Sources inline; secondary sources are marked.

**Numbering.** FDI (ISO 3950) is the default everywhere except the US; Palmer
survives in the UK. Canada is FDI: CDAnet/ITRANS claims reject a tooth that is
not an "International Tooth … Designation"
([CDA error codes](http://cda-adc.ca/get/ErrorCodes-ICD-ICA-CCDWS-CDAnet.pdf),
[Open Dental Canada](https://opendental.blog/canada-open-dental/)).
react-odontogram already takes `notation="FDI" | "Universal" | "Palmer"` and
returns all three on select, so the preference in §2 is cheap. Patients rarely
know _any_ system — always print the name too: "16 · upper right first molar".

**Orientation and colour.** Charts are drawn as the dentist sees the patient:
upper 18→28, lower 48→38, with "Right/Left" meaning the patient's
([eCampusOntario charting](https://ecampusontario.pressbooks.pub/dentalwellness2/chapter/week-4-dental-charting/)).
This confirms the grid and not the drawing in §1, and suggests labelling the
sides. Charting software uses red for planned/needed and blue for
completed/existing ([Dentrix Ascend](https://blog.dentrixascend.com/2019/10/16/configuring-charting-symbols/);
Open Dental makes it configurable). Mere's red/amber/green/blue is close; the
"done" colour is the one that departs from convention. Never colour alone —
pair each state with an icon.

**What patients want from the record.** The Overjet patient survey (2025):
63% are "confused and uncertain" about cost, only 33% fully understand their
benefits, 88% would more readily accept treatment with the exact cost and
insurer approval up front, only 55% fully understand their diagnosis
([Overjet](https://www.overjet.com/blog/the-overjet-patient-survey-what-do-we-really-think-about-the-dentist-)).
CareQuest: two in three adults want dental records in a portal, four in five
want them shared with their medical providers
([CareQuest](https://carequest.org/patient-portals-patient-perspectives-and-opportunities-for-practices/)).
Open Dental's patient portal shows appointments, saved treatment plans with
remaining individual/family benefits, statements and images
([Open Dental](https://www.opendental.com/manual/portalpatientsees.html)).
So the Overview's top three lines should be: **next cleaning due**,
**open treatment with patient cost**, **benefits left this year** (§5, §6) —
and every finding should have a plain-language sentence.

**Perio.** Six sites per tooth; 1–3 mm healthy, 4 mm borderline, 5 mm+ means
attachment loss; bleeding with shallow pockets suggests gingivitis
([Dimensions of Dental Hygiene](https://dimensionsofdentalhygiene.com/article/periodontal-charting/)).
The 2017 AAP/EFP classification gives a stage (I–IV, severity) and grade (A–C,
pace) that a dentist may already have written in the record
([AAP FAQ](https://www.perio.org/wp-content/uploads/2019/08/2017-World-Workshop-on-Disease-Classification-FAQs.pdf)).
Florida Probe's patient charts show each site against the last exam with an
arrow ([Florida Probe](https://floridaprobe.com/goprobe01.htm)), and a UK
quality-improvement project found every perio patient preferred a visual
explanation ([PMC7424517](https://pmc.ncbi.nlm.nih.gov/articles/PMC7424517/)).
For §10: a worst-site badge per tooth (green ≤3, amber 4, red ≥5), a bleeding
dot, a trend arrow, and the stage/grade in words.

**Recall.** NICE CG19 sets adult recall by risk at 3–24 months, agreed with the
patient — 6 months is a habit, not a rule
([NICE](https://www.nice.org.uk/guidance/cg19/chapter/Recommendations)). Open
Dental computes due = last completed + interval, and keeps a separate
"scheduled" date ([Open Dental](https://www.opendental.com/manual/recall.html)).
For §5: store the interval, and say **scheduled** rather than **overdue** when a
future appointment exists.

**FHIR.** Teeth go in `bodySite`: `http://terminology.hl7.org/CodeSystem/ex-tooth`
(FDI 11–48 — an _example_ code system with no primary teeth) or SNOMED CT body
structures; surfaces in `FDI-surface`
([HL7](https://terminology.hl7.org/1.0.0/CodeSystem-ex-tooth.html)). Open
Dental's FHIR API does the same
([spec](https://www.opendental.com/resources/OpenDentalFHIR19-4Spec.pdf)). The
HL7 Dental Data Exchange IG (US realm, 2.0 ballot 2025) profiles dental
condition, finding, referral and consult note — no perio chart or odontogram
([IG](https://build.fhir.org/ig/HL7/dental-data-exchange/)). This backs §2's
"structured before free text" and §3's "status from `clinicalStatus` /
`Procedure.status`". Procedure codes: CDT in the US, CDA's USC&LS in Canada —
licensed, so Mere can display codes it receives but shouldn't ship the list.

**Canadian Dental Care Plan.** From 2026–27 CDCP has no age limit and covers
residents without private dental insurance under $90k adjusted family income,
with a 0 / 40 / 60% co-pay by income band; providers may balance-bill, and the
co-pay is set at date of service
([Health Canada](https://www.canada.ca/en/health-canada/news/2025/03/canadian-dental-care-plan-expands-to-include-millions-of-new-eligible-canadians.html),
[RCDSO](https://www.rcdso.org/en-ca/cdcp); the bands are from secondary
sources). For §6: model CDCP as a payer with a co-pay tier, preauthorization
status and a possible balance-billed amount.

**Scans and CBCT.** A full-arch STL is ~11 MB median; PLY is 38–62% smaller and
carries colour
([J. Dent. 2025](https://www.sciencedirect.com/science/article/pii/S0300571225006980)).
three.js `STLLoader`/`PLYLoader`, parsing in a worker, is enough for §7. For
CBCT, Cornerstone3D (MIT) is the engine under OHIF; DenCT is a dental
React + Cornerstone3D viewer worth reading
([Cornerstone3D](https://github.com/cornerstonejs/cornerstone3D),
[DenCT](https://github.com/ZoliQua/Dental-CBCT-Viewer)) — compare against
CBCTer before choosing.

**Accessibility.** The CARE dental plugin's odontogram is one tab stop with
arrow keys between teeth, up/down across the arch, and names like "Upper right
first molar, 16, Caries" ([CARE](https://github.com/ohcnetwork/care_dental_fe)).
react-odontogram documents no keyboard support. WCAG 2.5.8 needs 24 px targets;
Apple asks 44 pt, Material 48 dp. On a phone, a whole-mouth drawing can't meet
either — tap an arch or quadrant to zoom, or lead with the grid (§1).

## Also noticed, not written up

- **Header:** "22 dental records · 8 dental images or scans" — the 8 includes the
  consent form and the plan PDF. The side nav shows Dental as "–" (not counted).
- **Header pluralisation** is done by string-replacing an Arabic phrase
  (`DentalHeader.tsx:26`) — the i18n layer should own plurals.
- **Panel subtitles describe themselves to a developer:** "Universal numbering
  with FDI labels, ready for surface-level findings", "Patient-facing history
  of…", "Tooth-level status derived from…", "The dental workspace will pull from
  imaging records tagged by oral/dental terms."
- **Empty ortho/surgery panels** draw 8 and 6 grey tiles ("diagnosis",
  "aligner", "extraction"…) that look like buttons and do nothing.
- **Surfaces leak across teeth.** One record naming teeth 14, 19, 30 and surface
  O gives each of the three teeth surface O.
- **"Treatment plan" priority** is "HIGH" if any of `bleeding`, `pain`,
  `urgent`… appears, including "no pain".
- **`DENTAL_TERMS` includes "implant" and "crown"** (by inspection), so a
  "pacemaker implant" note would be pulled into Dental. No false positive in the
  demo data.
- **The dentition toggle** buttons are 24 px tall — at the WCAG minimum, below
  the app's own 44 px rule.

## What this pass could not test

- Real portal dental data (Epic/Cerner rarely send dental; the likely real
  sources are PDFs, Open Dental exports, and manual entry).
- Real STL/PLY rendering, since it is not implemented.
- A real phone; touch was emulated.

## Suggested order

1. **§2 + §1** — tooth numbers right, one chart, FDI preference (default from
   region), tooth names beside numbers. These are the correctness problems on
   the tab named for the chart.
2. **§3 + §4** — status from the latest event and FHIR status; resource type
   before keywords. Unit-testable in `dentalClinicalModels.spec.ts`.
3. **§5** — next cleaning due, on Overview. Small, the highest value per line.
4. **§6** — dental-only coverage; benefits remaining when present.
5. **§8 + §9** — openable records, human labels, one tooth-history panel.
6. **§7 + §10** — real scan rendering; perio in plain language.

---

# Part 2 — How dental data gets in

Part 1 found a lot wrong in the screens' inference layer. Most of it starts
upstream: the screens guess because the inputs don't carry what they need to
know. This part follows each way a dental record can enter the app, and checks
what survives the trip.

**Setup:** same build. The Open Dental builder was run on a small fixture (2
patients, 3 procedures, 1 perio exam with 4 measure rows) written against Open
Dental's own schema documentation (v24.3). The manual form was driven in the
browser at both widths. A record was saved and followed to every page it
reached.

## The eight doors

| Door                                       | Where                                               | State                                                               |
| ------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------- |
| Bundled demo                               | `assets/demo/…dental-demo-connection.json`          | hand-written FHIR; the only source with complete data               |
| Manual entry (18 dental types)             | `features/manual-entry`                             | works; free-text fields only (§12)                                  |
| Open Dental → `.emrpkg`                    | `tools/build-opendental-emrpkg.mjs`                 | CLI; reads `.schema` + `.tsv`; status and perio mapping wrong (§11) |
| Open Dental MySQL → JSON                   | `tools/export-open-dental-demo-json.mjs`            | writes JSON for "a later importer" that doesn't exist               |
| 15 `dental_*` tables                       | `packages/local-dexie/src/db.ts`                    | schema, types and commands, but the app never reads them (§14)      |
| Document → `.emrpkg` (transpose skill)     | `.claude/skills/transpose-…`, `tools/transpose.mjs` | no dental section, so a dental letter has nowhere to go (§13)       |
| Patient-portal FHIR sync (Epic, Cerner, …) | `services/fhir/*`                                   | dental only by keyword; coded teeth ignored (§13)                   |
| Image / scan upload                        | "Dental image / scan" in the form                   | one file, stored inline as base64 (§15)                             |

Two importers aimed at the same source, with different input formats (TSV vs a
live MySQL), and a third storage model that neither feeds. Pick one route.

## 11. The Open Dental importer marks planned work as done

Running `build-opendental-emrpkg.mjs` on the fixture:

| Open Dental `ProcStatus` | Imported as                                  | Should be                                                 |
| ------------------------ | -------------------------------------------- | --------------------------------------------------------- |
| 1 — Treatment plan       | **completed** Procedure, subtype `procedure` | `ServiceRequest`/Procedure `preparation`, `treatmentPlan` |
| 6 — Deleted              | **completed** Procedure                      | skipped                                                   |
| 7 — Condition            | **completed** Procedure named "Caries"       | `Condition`, active                                       |
| 8 — TP inactive          | **completed** Procedure                      | skipped, or an inactive plan                              |

The cause is one string comparison: `procedureStatus()` returns
`'treatment-planned'`, and both the subtype and the FHIR status test for
`status === 'planned'`, which nothing returns. Status 7 and 8 aren't in the
lookup table (schema: "7- Condition. 8- Treatment Plan inactive"). So **every
proposed treatment shows as completed work**, and the Treatment plan panel is
always empty for an Open Dental import. A deleted procedure, which the practice
removed, also comes back as done, and so does an existing cavity (a condition).

**Perio is worse.** Open Dental stores one row per _measurement type_ per tooth
(`PerioSequenceType`: Mobility 0, Furcation 1, GingMargin 2, MGJ 3, Probing 4,
SkipTooth 5, BleedSupPlaqCalc 6, CAL 7). The builder:

- puts **every** row into `perioPocketDepths`, so "pocket depths" for tooth 3
  read `MB:3/B:2/DB:5…; MB:1/B:0/DB:5…; MB:102/B:101/DB:100…`. The second set is
  bleeding flags; the third is gingival margin, where 102 means −2 mm;
- shows bleeding as a raw flag sum (5 = bleeding + plaque) laid out as if it
  were millimetres;
- reads mobility from sequence type **8**, which doesn't exist, so mobility is
  never imported;
- files the exam as subtype `finding`. The app therefore never treats it as
  perio: it's absent from the Perio overview, it turns every probed tooth (all
  28–32) red as an "Active finding", and it adds an item to "What to do next".

Also in the builder:

- **It imports the whole practice.** There's no `--patient` filter. Every row in
  `patient` becomes a user in the package, and the first is selected. Run
  against a real practice export it would put hundreds of other people's
  records into one person's health record. For a personal record that's a
  privacy failure, not a feature.
- **Each recall becomes a cleaning visit.** It's subtype `cleaning`, dated by
  its _due_ date, so Cleaning history lists future visits that haven't
  happened.
- **Appointments are emitted as `appointment` resources,** which Dental doesn't
  query (`DENTAL_RESOURCE_TYPES`). The one source that knows your next
  appointment is the one the screen never reads.
- **The treatment-plan header doesn't connect to its line items.**
  `treatplanattach` and `proctp` aren't read, so a plan has no procedures and
  no total.
- **Supernumerary teeth (51–82)** are written as Universal. The app's
  `normalizeTooth` then reads 51 as FDI 51, which is primary tooth A.
- **Undated rows get the import time** (`toIso(date) || nowIso`): a fabricated
  date.

**Fix:** map all eight statuses; skip 6 and 8; emit 7 as a Condition. Group
perio measures by `SequenceType` into separate fields: probing in mm, recession
decoded from the 100+ form, bleeding/suppuration/plaque/calculus as booleans
per site, mobility from sequence 0. Give the exam subtype `perio`. Require
`--patient <PatNum>`. Emit recalls as a CarePlan with `period.end` = due date,
not as a cleaning. Add `appointment` to the dental query. Attach plan line
items. Leave undated rows undated. All of this is unit-testable with the
fixture used here, so add it to `tools/fixtures`.

## 12. The form asks for free text where the screens need a fact

The "Add dental record" form shows the same 14 fields for all 18 record types.
A cleaning asks for tooth, tooth range, quadrant, arch, dentition, severity
and surfaces. All of them are free-text boxes:

- **Tooth** says "e.g. 14" and has no numbering choice. Saved in the browser:
  tooth **"26"** (a Canadian writing the upper-left first molar) was charted as
  **#26 / FDI 42**, a lower-right incisor, and painted red.
- **Status** is free text ("Planned, active, complete"). Saved as **"resolved"**,
  the tooth still showed **ACTIVE**, because the screens never read it as a
  status (§3), and the FHIR resource is written with a fixed status
  (`'final'`, or `'active'` for care plans) whatever was typed.
- **No recall due date.** "Recall or follow-up" is prose ("e.g. 6-month
  cleaning recall"). The field the Recall panel reads, `recallDueDate`, can't be
  set from the form, so a manually entered cleaning can never say when the next
  one is due (§5).
- **No perio type.** Of the 18 types none is a perio exam. Pocket depths have
  no field, so manual perio can only arrive as a keyword the classifier happens
  to catch.
- **"Tooth finding" is stored as a vital-sign Observation.** On the Timeline it
  appears under **"Your Labs"** with a "Labs" chip.
- On a phone the form is 23 fields deep before "Save".

**Fix:** fields per type. A cleaning needs date, provider, "next due"; a
finding needs tooth, surface and status. Use a **tooth picker** (the Part 1
grid, in the user's notation) rather than three text boxes. Make status a fixed
choice that writes the matching FHIR status. Add a **Perio exam** type with a
compact 6-site entry, or at least "deepest pocket" and "bleeding sites". Store
`numberingSystem` with every record. Give dental findings their own category so
the Timeline stops calling them labs.

## 13. Coded teeth are thrown away; letters have nowhere to go

**From patient portals:** the FHIR way to say which tooth is `bodySite`, coded
with `ex-tooth` (FDI) or SNOMED CT (see the research). The app never reads a
coding. It runs the free-text pattern over the JSON instead, and on
`{"system":"…/ex-tooth","code":"36"}` and on SNOMED "Structure of mandibular
left first molar tooth" that pattern finds **nothing**. A portal that does
everything right gets no tooth on the chart.

**From documents:** most people's dental history is a PDF: a treatment
estimate, a referral letter, a perio chart printout, an insurer's EOB. The
transpose skill turns documents into packages, but its "Where things go" table
and `clinical-transpose-format.md` have no dental section. Nothing in it covers
a tooth, a surface or a numbering system, so a transposed dental letter becomes
generic procedures with teeth in prose. That is the exact input that trips
§2 and §4.

**Fix:** read `bodySite.coding` first (ex-tooth, SNOMED, FDI-surface), then
manual details, then free text. Add a `dental` section to the transpose format
(tooth with `numberingSystem`, surfaces, status, recall due, perio sites, plan
items with fee/insurance/patient share), and a dental row to the skill's table.
`tools/transpose.mjs validate` should reject a tooth number without a system.

## 14. Fifteen dental tables nobody reads

`packages/local-dexie` declares `dental_patient_profiles`, `dental_tooth_charts`,
`dental_perio_exams`, `dental_treatment_plans`, `dental_recall_records` and ten
more, with zod schemas in `@mere/domain` and commands in
`clinicalDemo.ts`. The web app reads only RxDB `clinical_documents`, and
`packages/README.md` says the packages "are not imported by apps/web".
`docs/dental-open-dental-incorporation.md` describes this storage as the plan
("the Open Dental demo importer should write to the separate dental tables
first"). Today the Open Dental builder writes `clinical_documents`, the doc
describes tables, and the screens read neither the tables nor the doc's
projection fields consistently.

That's not wrong as a scaffold, but it is a fork. The structured shape the
screens need (perio sites, recall due dates, plan line items) already exists
in `DentalPerioExam`, `DentalRecallRecord` and `DentalTreatmentPlan`, unused.

**Fix:** decide which is the source of truth for dental. Until the Dexie move
happens, write the structured fields into
`metadata.manual_specialty_details` using those same type names, so the move
later is a copy and not a re-mapping. Update the incorporation doc to say
which path is live.

## 15. Scans: one file, inline, and no CBCT

"Dental image / scan" takes one file of any type and stores it as base64 inside
the record's JSON. Consequences:

- A full-arch STL (≈11 MB median) becomes ≈15 MB of base64 in one IndexedDB
  document, and again in every `.emrpkg` export. The emrpkg code says the
  `attachments/` folder is "reserved for future extraction".
- Browsers often report `.stl` as `""` → `application/octet-stream`; detection
  survives only because the filename is also checked.
- A CBCT is a _folder_ of hundreds of DICOM slices. There's no way to add one,
  and the "Dental CBCT" demo record has no images behind it.

**Fix:** store binaries as attachments (the Dexie path already has a table),
accept multiple files and folders (`webkitdirectory`) for DICOM, and record
`model/stl` / `model/ply` explicitly. For CBCT, this is where CBCTer fits:
accept a DICOM folder, hand it to CBCTer's viewer, and keep its tooth
segmentation (labelled by tooth) as structured input to the chart.

## Input pipeline — suggested order

1. **§11 status mapping + `--patient` filter.** A two-line bug and a privacy
   guard, both with a fixture test.
2. **§13 read `bodySite` codings.** Small, and it makes correct sources work.
3. **§12 tooth picker + numbering + status choice + recall due date.** This
   removes most of what Part 1's classifier has to guess.
4. **§11 perio decoding** together with Part 1 §10 (perio in plain language).
5. **§13 transpose `dental` section.** Most real dental data is documents.
6. **§14/§15 storage decisions:** one dental source of truth; binary
   attachments; DICOM via CBCTer.

---

## What shipped

Nine commits on `claude/dental-review-desktop-mobile`, in the order the two
"suggested order" lists gave. 838 web unit tests and 28 `tools/` tests pass;
every change was also checked in a production build at 1440 px and 393 px.

| §   | Finding                                  | What changed                                                                                                                                                                                                                                   |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Two charts disagree                      | The odontogram drawing is gone (and `react-odontogram` with it). The grid is the chart: upper over lower, your right on the left and labelled, primary teeth under their successors, sideways scroll on a phone, 44 px targets, spoken labels. |
| 2   | FDI read as the wrong tooth              | Numbers can't run into another digit; 33–48/51–85 are FDI; a Universal/FDI switch on the chart (default FDI outside the US) drives display and the form; coded `bodySite` teeth win over prose.                                                |
| 3   | A filled cavity stays red                | Every record has its own status from FHIR or the stated status; a finding closes when resolved or when a completed procedure on the same tooth follows it.                                                                                     |
| 4   | X-rays and a PDF as open problems        | Resource type decides kind before keywords. Demo "What to do next": 9 rows → 5 real ones (the implant consult now counts as planned).                                                                                                          |
| 5   | No next-cleaning date                    | Overview leads with it: recall, else the last cleaning's stated interval, else six months; "overdue" only when nothing is booked. Demo: "Overdue — it was due Feb 14, 2026".                                                                   |
| 6   | Medical plans as dental claims           | A coverage, claim or EOB is dental only when something in it says so (type, class, payor, CDT codes, CDCP).                                                                                                                                    |
| 7   | Fake 3-D teeth                           | Stored STL/PLY files are drawn with three.js's own loaders and can be turned; files without bytes are listed as such. The empty "Ungrouped" mount card is hidden.                                                                              |
| 8   | Machine words, unopenable list           | Human headings and kind labels, dates on rows, "Show all N records". Records still don't open to a detail view — see below.                                                                                                                    |
| 9   | Two panels repeating the chart           | Replaced by one side panel: the tapped tooth's history, each record with its own standing; one vocabulary with marks as well as colours.                                                                                                       |
| 10  | Perio as counts                          | Reads probing depths and says what they mean (≤3 healthy, 4 borderline, ≥5 gum disease), with deepest pocket, sites 4 mm+, bleeding, and change since the last exam.                                                                           |
| 11  | Open Dental importer                     | All eight `ProcStat` values mapped (planned is planned; deleted and inactive skipped; conditions are Conditions); perio decoded per `PerioSequenceType`; recalls are due dates; plans carry line items; `--patient` required.                  |
| 12  | Form asks for free text                  | Fields per record kind, status as a fixed choice that sets the FHIR status, "Next cleaning due", numbering saved per record, tooth findings no longer vital signs or lab values.                                                               |
| 13  | Coded teeth ignored; no dental transpose | `bodySite` codings read first; a `dentalRecords` transpose section with required `numberingSystem`, FDI-coded output, an example and tests.                                                                                                    |
| 14  | Unread dental tables                     | Documented, not built: the incorporation doc now says which path is live and to use the tables' field names in the projection meanwhile.                                                                                                       |
| 15  | Scans inline, no CBCT                    | Partly: scans render from the bytes already stored. Binary attachments, multi-file/DICOM-folder upload and the CBCTer hand-off are not built.                                                                                                  |

Also fixed from "Also noticed": developer-voice subtitles, buttons-that-aren't
in the empty ortho and surgery panels, the untranslated "Tooth-by-tooth status"
(its panel is gone), keyword-driven "high priority", 24 px dentition buttons,
and "implant"/"crown" pulling medical records into Dental.

### Still open

- **Record detail.** Dental rows still don't open to a full record; the app's
  only detail route is for documents. A dental record view (or reuse of
  `/records/documents/detail/:id` for any clinical document) is its own change.
- **Timeline calls every Observation "Labs".** `timelineCategories.ts` labels by
  resource type, so a dental finding (now correctly an `exam` observation) is
  still grouped under Labs on the Timeline. That mapping is shared by every
  feature and wants its own pass.
- **§15 storage**: attachments out of the JSON, DICOM folders in, CBCTer for
  CBCT.
- **Header pluralisation** in `DentalHeader.tsx` still patches an Arabic phrase
  by string replacement.
- **Unlabelled free-text tooth numbers 11–32** from portals are still read as
  Universal unless the record or the reader's setting says FDI only for
  manual entries. Per-connection numbering (a Canadian portal is FDI) would
  close it.
