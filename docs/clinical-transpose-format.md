# The clinical transpose format

`records.json` is the intermediate between a clinical document and a Mere
`.emrpkg`. It exists so that the interpretive work — deciding that a line of
prose is a condition, or that `3/8/2026` means August — sits in a file a person
can read and correct, rather than inside a builder nobody reviews.

```
document  →  records.json  →  .emrpkg  →  the app
          ↑                ↑
      judgement       mechanical
```

Writing the JSON is the `transpose-clinical-document` skill's job.
`tools/transpose.mjs` checks and builds it.

## The CLI

```sh
node tools/transpose.mjs validate records.json
node tools/transpose.mjs build records.json --output out.emrpkg [flags]
node tools/transpose.mjs inspect out.emrpkg
node tools/transpose.mjs merge base.emrpkg other.emrpkg --output all.emrpkg
```

`build` passes unrecognised flags to the builder:

| Flag                          | Meaning                                                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `--assets-dir <dir>`          | Where source files named by `sourceImage` live. Found files are embedded in the package and linked to every record that cites them. |
| `--first-name`, `--last-name` | The imported user's name.                                                                                                           |
| `--profile-id <id>`           | Stable id for the profile. Reuse it to rebuild a package that replaces an earlier one.                                              |
| `--connection-name <name>`    | What the app shows as the record source.                                                                                            |
| `--app-version <label>`       | Written to the manifest; identifies which transpose produced the package.                                                           |

The validator is in `tools/lib/transpose-schema.mjs` and is the format's only
machine-readable definition.

## Top level

```jsonc
{
  "subject": { "dateOfBirth": "1956-01-01", "sex": "male" },
  "audit": {
    "sourceDocument": "Letter.pdf",
    "dateConvention": "DMY",
    "author": "Dr A. Clinician, GMC 1234567",
    "encounterDate": "2026-08-03",
    "interpretations": ["..."],
  },
  "labPanels": [],
  "vitals": [],
  "diagnosticReports": [],
  "pendingResults": [],
  "medicationPlans": [],
  "clinicalEncounters": [],
  "conditions": [],
  "procedures": [],
  "allergies": [],
  "familyHistory": [],
  "socialHistory": [],
}
```

`subject` is required. `audit` is not required but a package without it cannot
be checked back against its source; `audit.interpretations` is where every
judgement call is recorded in prose. Keys outside this list are ignored by the
builder — a key starting with `_` is treated as a note to the reader and passes
without comment — and `validate` warns about the rest.

`audit` also carries two fields the tooling acts on:

| Field                  | Effect                                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dateConvention`       | `DMY`, `MDY`, `YMD` or `ISO`. Declares how the _source_ writes dates. `validate` warns when it is absent.                                                      |
| `sourceDocumentTitles` | `{ "Letter.pdf": "…" }`. Names the DocumentReference for a file. Without it the title is whichever record cited the file first — an accident of section order. |

## Dates

All dates in `records.json` are `YYYY-MM-DD`. Getting there from the source is
the part that goes wrong: `03/08/2026` is 3 August in London and 8 March in
Boston, and both readings are valid dates, so nothing downstream can catch the
mistake.

Declare the convention once in `audit.dateConvention`, then convert through the
tool rather than in your head:

```sh
node tools/transpose.mjs date 03/08/2026 --convention DMY   # 2026-08-03
node tools/transpose.mjs date 03/08/2026 --region GB        # region GB → DMY
```

Both forms warn when the value reads as a different real date under the other
convention. `--region` takes an ISO 3166 country code and maps it to the
convention documents from there usually use — day-first nearly everywhere,
month-first in the US and a handful of its dependencies, year-first in CN, JP,
KR, TW, HU, LT and MN. It is a hint, not an answer: a US health system's London
branch writes day-first. Confirm against the document — a day field above 12
settles it, and so does a sign-off date a day or two after the appointment.

`validate` also warns when a date lands after `audit.transposedAt`, because a
day/month swap puts about half of all dates in the future and a clinical
document almost never reports one.

A record with no date at all is stamped `1970-01-01`, which opens a phantom
decade at the foot of the timeline, so supply one.

## Sections

Required fields are **bold**. Every section also takes `sourceImage` (the file
name this came from, matched against `--assets-dir`), `provider`, `note` and
`audit`.

### `labPanels` → `Observation` per result, plus a `List` per panel

**`id`**, **`title`**, **`collectedAt`**, `results[]`.

Each result: **`id`**, **`name`**, and one of `value` / `note`. Plus `unit`,
`flag` (`low` | `high` | `abnormal`), `originalFlag` (as printed: `L`, `H`),
`originalReferenceRange` (as printed), `referenceNote`, `shortName`, `note`.

Values are strings, copied exactly — `">256.0"`, `"<1"`, `"Negative"`,
`"Not Seen"` are all valid. The builder parses comparators and ranges itself;
do not pre-digest them.

Known lab names get a LOINC code automatically (`LAB_LOINC` in the builder).
Unmatched names still import, flagged `manual_uncoded`.

**Computed risk scores go here too** — QRISK3, QDiabetes, ASCVD, FRAX — as a
panel of their own. They are measurements with a value and a date, and a panel
puts them on Results where they can be found. A score the document declines to
calculate is still a result worth keeping: record the reason verbatim as the
value ("Not validated whilst using a statin") rather than dropping the row.

### `vitals` → `Observation` with the `vital-signs` category

**`id`**, **`recordedAt`**, `measurements[]`.

Each measurement: **`id`**, **`name`**, and one of `value` / `components` /
`note`. Plus `unit`, `position`, `method`, `bodySite`, `flag`, `note`.

`name` is matched against `VITAL_LOINC`: blood pressure, systolic/diastolic
blood pressure, heart rate, pulse, respiratory rate, body temperature,
temperature, oxygen saturation, spo2, body weight, weight, body height, height,
body mass index, bmi, body fat percentage, body fat mass, skeletal muscle mass,
visceral fat, waist circumference.

Body composition belongs here rather than in a section of its own. A value may
be qualitative — a letter that says fat mass is "Normal" and muscle mass is
"Just under normal range" is reporting a measurement it chose not to print, and
`"value": "Normal"` records that faithfully. A vendor summary score with no LOINC
(a "TRU score") still imports; it is flagged `manual_uncoded`.

Blood pressure is one reading with two numbers, so it uses `components` and
carries no top-level value:

```jsonc
{
  "id": "bp",
  "name": "Blood pressure",
  "position": "Sitting",
  "components": [
    { "name": "Systolic blood pressure", "value": "127", "unit": "mmHg" },
    { "name": "Diastolic blood pressure", "value": "66", "unit": "mmHg" },
  ],
}
```

### `diagnosticReports` → `DiagnosticReport`, plus an `Observation` per finding

**`id`**, **`title`**, **`studyDate`**. Plus `findings`, `imaging`, `note`.

Any narrative investigation report: radiology, but equally a stress test or a
resting ECG interpretation.

The section used to be called `imagingReports`, which read as a promise about
where the record would appear. It never was one. The **Imaging** page decides
for itself, by testing the record's text for imaging vocabulary — so an ECG
report goes to **Results** and correctly stays off Imaging. `imagingReports`
still works as an alias so existing records files keep building.

Set `imaging: true` when a report really is a scan but its wording is too terse
for that test — it writes `manual_subtype: "imaging"`, which the Imaging page
reads before it reads any text.

### `pendingResults` → `Observation` with status `registered`

**`id`**, **`name`**. Plus `orderedDate`, `provider`, `expected`, `purpose`,
`category`, `note`.

Tests the document says were ordered but had no result yet — "Stool FIT test is
**pending**". These belong in the record: an unreturned bowel-cancer screen is
the kind of thing a patient should be able to find, and burying it in encounter
prose means nobody will.

The observation carries **no value**, deliberately: a pending test has no result
and inventing one would be worse than the gap. FHIR's `registered` is the status
for ordered-not-resulted, and the Results page already reads it — such a record
shows there labelled _preliminary_. (That label conflates "ordered, nothing
back" with "an early result exists", which are different things; the record is
right, the wording is the app's to sharpen.)

### `medicationPlans` → `MedicationStatement` per item, plus a `List`

**`id`**, `encounterDate`, `items[]`. Each item: **`id`**, **`medication`**,
plus `dose`, `route`, `frequency`, `status`, `assignedDate`, `note`.

`status` maps: `stopped`/`not-taking` → stopped, `historical` → completed,
`assigned`/`planned` → intended, anything else → active.

**Set `adherence` on every medication whose source says whether it is being
taken** — one of `taking-as-directed`, `not-taking`, `not-yet-started`,
`stopped`. A list headed "Current Outpatient Medication" states
`taking-as-directed` for everything on it.

It matters more than it looks. The Medications page buckets on reconciliation
state before status, so an unstated adherence normalizes to `unknown` →
`needs-review` and the drug never reaches **Current** however `active` it is.
Without an explicit value the builder falls back to sniffing the item's prose
for words like "current", so two drugs off the same table can disagree because
one note happened to mention something else.

### `clinicalEncounters` → `Encounter`

**`id`**, **`title`**, **`encounterDate`**, plus `sections[]` of
`{ title, items[] }`.

This is where a letter's prose belongs: recommendations, examination findings,
systems review, follow-up advice. One section per document heading, one item per
statement.

### `conditions` → `Condition`

**`id`**, **`name`**, plus `clinicalStatus` (default `active`),
`verificationStatus` (default `confirmed`), `category`, `onsetDate`,
`recordedDate`, `code`, `note`.

Use `verificationStatus: "provisional"` for anything the document raises without
putting on the problem list.

### `procedures` → `Procedure`

**`id`**, **`name`**, plus `status` (default `completed`), `category`,
`performedDate`, `recordedDate`, `bodySite`, `laterality`, `outcome`,
`datePrecision`, `note`.

Surgical histories usually give no date. Set `recordedDate` to when it was
written down and leave `performedDate` out: the record files under the
documenting date while `performedDateTime` stays unset, which is what actually
says the date is unknown. Never infer laterality from elsewhere in the document.

### `allergies` → `AllergyIntolerance`

**`id`**, **`substance`**, plus `status`, `criticality`, `recordedDate`,
`reaction` (string, or `{ manifestation, severity }`), `code`, `note`.

**To record "no known allergies", set `negated: true`.** Optionally add
`negationScope` — `general` (the default), `drug`, `food`, `environmental`,
`latex`, `not-asked` or `unknown`.

```jsonc
{
  "id": "nka",
  "substance": "No Known Allergies",
  "negated": true,
  "recordedDate": "2026-08-03",
  "sourceImage": "Letter.pdf",
}
```

This is a real clinical statement — asked-and-none is not the same as
never-asked — and it must not read as an allergen. The negated row is coded with
the matching SNOMED concept (716186003 and friends) on both `code` and
`substance`, which is what the app's negation test looks for. The Allergies page
then files it under **Also recorded** with a "Not an allergen" badge, keeps the
allergen count at zero, and leaves it off the emergency wallet card — while
still linking it back to the source document.

Without `negated`, a substance of "No Known Allergies" is matched by a text
fallback and mostly behaves; coding it is what makes it reliable.

### `familyHistory` → `FamilyMemberHistory`

**`id`**, **`relationship`**, plus `conditions[]` (or `condition`), `title`,
`recordedDate`, `note`.

### `socialHistory` → `Observation` with the `social-history` category

**`id`**, **`topic`**, plus `value`, `recordedDate`, `code`, `note`.

One row per topic: alcohol, smoking, exercise, diet, occupation, sleep, living
situation, and so on.

## Source documents and attachments

Any section can carry `sourceImage`. The first record to name a given file
creates a `DocumentReference` for it; with `--assets-dir` pointing at the real
file, the bytes are embedded as a `documentreference_attachment` and every
record citing that name links back to it. This is what drives the app's
Documents page and the "View source" control on each record.

The `DocumentReference` is titled after the _first_ record that referenced the
file, which is an accident of section order — a letter whose labs are processed
first is filed as "Resting ECG measurements source document". Name it explicitly
instead:

```jsonc
"audit": {
  "sourceDocumentTitles": {
    "Letter.pdf": "Cleveland Clinic London — Advanced Health Screening letter"
  }
}
```

The Documents page groups by that title, so a well-named letter files under
"Letters and referrals" rather than "Reports and visit records".

## Combining packages

Each build derives its user id from the profile it was given, so a second
document about the same person arrives as a stranger — and importing the two
packages one after another does not help, because the importer replaces the
receiving collections and the second erases the first.

```sh
node tools/transpose.mjs merge records.emrpkg letter.emrpkg \\
  --output combined.emrpkg --user-from 2
```

One user survives; every record from the others is re-pointed onto it and
re-keyed, since the primary key is built from connection, user and resource id.
**Connections are all kept**, so each record still names the document it came
from and the Sources page lists them separately. `--user-from <n>` picks whose
name, date of birth and profile survive (default 1, the base) — worth setting
when the newer document carries the better name.

Records that appear in both packages are kept once. The merged manifest carries
a `mergedFrom` array naming each input, its app version and its record count.

Merging reconciles identity, not clinical content: if one source says "No Known
Allergies" and another records an allergen, you get both, and the disagreement
is yours to resolve. That is deliberate — a package should not quietly drop one
clinician's assertion because another disagrees.

## Checking the result in the app

```sh
npx nx serve web              # http://localhost:4200
```

Then Sources → Import records → "Choose .emrpkg file". Importing **replaces**
the receiving collections, so use a throwaway browser profile. Check the pages
your records should have reached — Labs, Vitals, Procedures, Conditions,
Medications, Documents, Timeline — because a package that builds cleanly can
still put records somewhere nobody looks.
