# Dental review — what the workspace tells you about your teeth

> **Status:** findings only; nothing here is fixed yet. Ordered by how much a
> wrong answer would mislead the person reading it, not by how hard it is to fix.

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
