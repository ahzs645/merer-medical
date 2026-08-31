---
name: transpose-clinical-document
description: Turn a clinical document — a consultant letter, discharge summary, screening report, lab slip, portal export — into a Mere `.emrpkg` the app can import. Use when someone supplies a medical document (PDF, scan, photo, HTML export) and wants its contents as records rather than as a file, or asks to "transpose", "import", "convert" or "build a package from" a report. Not for editing records already in the app.
---

# Transposing a clinical document

A document is prose and tables. The app stores rows. Transposing is the step
between: read the document, decide what each line _is_, and write it into
`records.json`. A separate builder turns that JSON into a `.emrpkg`.

The split is the point. Every judgement call — is this a condition or a passing
remark, is `3/8/2026` March or August — lands in a JSON file a person can read
and correct. None of it is buried in the builder.

## The loop

```sh
# 1. read the document (see "Getting text out" if it is a scan)
# 2. write records.json
node tools/transpose.mjs validate records.json     # until it passes
node tools/transpose.mjs build records.json \
  --output out.emrpkg --assets-dir ./source-files \
  --first-name First --last-name Last --profile-id stable-id
node tools/transpose.mjs inspect out.emrpkg        # check the shape
```

`validate` catches missing required fields, non-ISO dates, duplicate ids and
sections the builder does not read. Run it before every build: the builder is
deliberately forgiving, so a mistyped key silently costs you a whole record.

The format is specified in `docs/clinical-transpose-format.md` — section names,
every field, and which resource each becomes. Read it before writing JSON.

## Getting text out of the document

Many clinical PDFs are scans with no text layer. Check first:

```sh
node tools/transpose.mjs help   # (the CLI does not extract; use pdfjs directly)
```

If a text extraction comes back empty, the pages are images. Render them and
read them as images rather than guessing — `pdfjs-dist` with `@napi-rs/canvas`
works headlessly, and you must supply a `canvasFactory` because pdfjs looks for
the `canvas` package by name. Extracting the embedded JPEGs instead is a trap:
a page is often several images (logo, header, body), so you get fragments.

## Rules

**Copy, do not compute.** Every value, unit and reference range goes in exactly
as printed. `>256.0`, `<1`, `Not Seen`, `No significant growth.` are values —
keep the comparator, keep the words. Never convert units, never recalculate a
ratio, never derive a flag from a range yourself: if the source printed `(L)`,
record `flag: "low"` and `originalFlag: "L"`; if it printed nothing, set no flag.

**Do not invent.** No date the document does not state. No laterality the
document does not state. No condition from a passing mention. When the source
is silent, leave the field out — an absent field is information, a guessed one
is a fabrication that will outlive you in someone's medical record.

**Write down what you decided.** Anything a careful reader might have read
differently goes in `audit.interpretations` as a sentence: how you read an
ambiguous date format, why you split one table into several panels, which rows
you merged, which you dropped. This is what makes the package checkable against
its source.

**Preserve duplicates that differ.** A report that prints HCT twice with two
different numbers has two results; keep both and note it. A report that prints
ALBUMIN twice with the same number has one; keep one and note it.

**State adherence on medications.** Set `adherence` on every drug whose source
says whether it is being taken — `taking-as-directed`, `not-taking`,
`not-yet-started` or `stopped`. A list headed "Current Outpatient Medication"
states `taking-as-directed` for everything on it. Leave it out and the
Medications page files the drug under Needs review rather than Current, no
matter that its status is active.

**Name the source document.** Put `audit.sourceDocumentTitles` = `{ "Letter.pdf":
"…" }` in the file. Without it the DocumentReference is named after whichever
record cited the file first, so a letter ends up titled "Resting ECG
measurements source document".

**Keep ids short.** A record's id is `connectionId|userId|manual:<your id>`,
about 70 characters before yours. The store declares a 128-character maximum,
so keep source ids under ~50. `inspect` warns when you have gone over.

**Dates are `YYYY-MM-DD`, and you do not convert them by hand.** `03/08/2026` is
3 August in London and 8 March in Boston; both readings are valid dates, so a
mistake here is invisible from here on. Work out the convention from the
letterhead, declare it once in `audit.dateConvention` (`DMY`, `MDY`, `YMD`,
`ISO`), and run each date through the tool:

```sh
node tools/transpose.mjs date 03/08/2026 --region GB      # region GB → DMY
node tools/transpose.mjs date 03/08/2026 --convention DMY
```

It warns whenever the value would be a different real date under the other
convention. `--region` maps an ISO 3166 country code to the convention that
country's documents usually use, but it is a hint — a US health system's London
branch writes day-first. Confirm against the document: a day field above 12
settles it, and so does a sign-off date a day or two after the appointment.
`validate` catches the rest, warning on any date after `audit.transposedAt`,
because a day/month swap puts about half of all dates in the future.

## Where things go

| In the document                                                         | Section              |
| ----------------------------------------------------------------------- | -------------------- |
| Result tables, blood tests, urinalysis, ECG measurements                | `labPanels`          |
| Computed risk scores — QRISK3, QDiabetes, ASCVD, FRAX                   | `labPanels`          |
| BP, weight, height, BMI, temperature, SpO2, pulse, respiratory rate     | `vitals`             |
| Body composition — fat mass, visceral fat, muscle mass, vendor scores   | `vitals`             |
| Radiology, ultrasound, stress test, any narrative investigation report  | `diagnosticReports`  |
| Tests the document says are ordered but not yet resulted                | `pendingResults`     |
| Current medication list, prescriptions, supplements                     | `medicationPlans`    |
| The visit itself — findings, recommendations, follow-up, systems review | `clinicalEncounters` |
| Problem list, past medical history, diagnoses                           | `conditions`         |
| Past surgical history, operations                                       | `procedures`         |
| Stated allergies                                                        | `allergies`          |
| Family history table                                                    | `familyHistory`      |
| Alcohol, smoking, exercise, diet, occupation, sleep, living situation   | `socialHistory`      |

Group lab results into the panels the document itself names. If it prints one
flat table but its commentary talks about "the liver panel" and "the kidney
panel", grouping by those names is fair — say so in `audit.interpretations`.

## Things worth knowing before you write

**Record "no known allergies", do not drop it.** Set `negated: true` on an
`allergies` row (with `negationScope` if the source is specific — `drug`,
`food`, `latex`…). Asked-and-none is different from never-asked, and the app
already knows how to show it: filed under "Also recorded", badged "Not an
allergen", excluded from the allergen count and from the wallet card, still
linked to the source. Omit the row and the page reads as though the question was
never put.

**Record what is still outstanding.** "Stool FIT test is pending" is a
`pendingResults` row, not a sentence in an encounter note. Write no value — a
pending test has no result, and that is the point.

**A risk score with no number is still a result.** "QRISK3: not validated whilst
using a statin" goes in as the value, verbatim. Dropping it loses the fact that
the score was considered.

**"Date unknown."** A record with no date at all is stamped 1970-01-01 and opens
a phantom decade at the foot of the timeline. `procedures` handles this — it
falls back to `recordedDate` and leaves `performedDateTime` unset, which is the
honest encoding. Other sections do not, so give them a date.

**A report's section does not choose its page.** `diagnosticReports` makes a
DiagnosticReport; the Imaging page then decides for itself by looking for
imaging vocabulary, so an ECG lands on Results and correctly not on Imaging. If
a report really is a scan but reads too tersely for that test, set
`imaging: true`. (`imagingReports` still works as an alias for the section's old
name.)

## Before you hand it over

Load the package and look at it. `docs/clinical-transpose-format.md` has the
steps for importing into a local dev server. Check the pages your new records
should have populated — a section that builds fine can still land somewhere
nobody will find it. Then report what you transposed, what you left out, and
every interpretation you made.
