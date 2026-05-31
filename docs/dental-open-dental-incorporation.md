# Dental Open Dental Incorporation

This note documents how Open Dental-style concepts are incorporated into Mere without copying the Open Dental database or turning Mere into a chairside practice-management system.

## Storage Direction

Mere keeps patient portal imports in FHIR-shaped `ClinicalDocument` rows, but Open Dental demo/practice-management data has a separate local model. This prevents Open Dental billing, scheduling, and tooth-chart data from being forced into generic FHIR documents just to keep provenance.

The Open Dental-facing tables are:

- `clinical_demo_sources`: one row for the Open Dental demo dataset or future imported demo snapshots.
- `source_code_systems`: records which code bases are present, such as CDT, ICD-9, ICD-10, CPT, HCPCS, SNOMED, LOINC, CVX, RxNorm, UCUM, and Open Dental procedure/definition codes.
- `dental_terminology_sets`: reusable dental terminology/code datasets, such as the Open Dental Canadian procedure-code fixture.
- `dental_terminology_codes`: normalized dental code rows with display text, treatment area, category, radiology/hygiene/prosthesis flags, Canadian time units, default notes, and source provenance.
- `dental_provider_records`: source provider/practitioner directory rows referenced by procedures, perio, claims, recall, lab, and ortho data.
- `dental_patient_profiles`: Open Dental patient identity, contact, family-account, provider, and raw row data.
- `dental_tooth_charts`: tooth-chart state for a dental patient.
- `dental_procedure_records`: Open Dental procedure rows, linked to the dental patient and optionally to a tooth chart.
- `dental_insurance_records`: patient plan/subscriber/carrier summaries.
- `dental_claim_records`: claim lifecycle, claim lines, payments, writeoffs, ortho claim fields, and attachments/provenance.
- `dental_recall_records`: patient recall due dates, intervals, scheduled dates, statuses, and recall procedures.
- `dental_ortho_records`: orthodontic case, chart, hardware, and schedule summaries.
- `dental_tooth_condition_records`: baseline tooth conditions from `toothinitial`, including drawing/text annotations.
- `dental_perio_exams`: periodontal exams with six-point tooth measurements.
- `dental_treatment_plans`: proposed/accepted plans and planned procedure cost/insurance breakdowns.
- `dental_fee_schedules`: procedure-code fee schedules and effective fee entries.
- `dental_imaging_records`: dental metadata for images already stored as clinical documents/attachments.
- `dental_lab_cases`: lab case due/sent/received/checked workflow.
- `dental_form_records`: patient forms/sheets and extracted field values.

FHIR-shaped `ClinicalDocument` rows are still useful for portal-sourced dental records, imaging, PDFs, DICOM, and export interoperability. The Open Dental demo importer should write to the separate dental tables first and may additionally create `ClinicalDocument` projections where useful for timeline/search.

This keeps imports reversible and source-preserving:

- Original Open Dental rows can be preserved in each dental record's `raw` field.
- Table names and source ids can be preserved through `demoSourceId`, `sourcePatientId`, `sourceProcedureId`, `sourcePlanId`, and related fields.
- Dental fields are normalized for display, filtering, timeline grouping, tooth chart rendering, and future export.

## Folded Versus First-Class Storage

Some Open Dental concepts should become first-class dental records because they drive dental-specific views:

| Concept              | Open Dental tables                                          | Mere storage                     |
| -------------------- | ----------------------------------------------------------- | -------------------------------- |
| Patient profile      | `patient`, `patientnote`                                    | `dental_patient_profiles`        |
| Baseline tooth state | `toothinitial`                                              | `dental_tooth_condition_records` |
| Tooth chart snapshot | `toothinitial`, `procedurelog`, `proctp`                    | `dental_tooth_charts`            |
| Procedures           | `procedurelog`, `procedurecode`, `procnote`                 | `dental_procedure_records`       |
| Providers            | `provider`, `providerclinic`, `providerident`               | `dental_provider_records`        |
| Perio                | `perioexam`, `periomeasure`                                 | `dental_perio_exams`             |
| Treatment plans      | `treatplan`, `treatplanattach`, `proctp`                    | `dental_treatment_plans`         |
| Insurance            | `patplan`, `inssub`, `insplan`, `carrier`, `benefit`        | `dental_insurance_records`       |
| Claims               | `claim`, `claimproc`, `claimpayment`, `claimattach`         | `dental_claim_records`           |
| Recalls              | `recall`, `recalltype`, `recalltrigger`                     | `dental_recall_records`          |
| Orthodontics         | `orthocase`, `orthochart`, `orthohardware`, `orthoschedule` | `dental_ortho_records`           |
| Fee schedules        | `feesched`, `fee`, `procedurecode`                          | `dental_fee_schedules`           |
| Lab cases            | `labcase`, `laboratory`                                     | `dental_lab_cases`               |
| Forms/sheets         | `sheet`, `sheetfield`, `sheetdef`, `sheetfielddef`          | `dental_form_records`            |

Other concepts should fold into existing app sections and only add dental metadata:

| Concept      | Primary Mere storage                                               | Dental link/metadata                                                                     |
| ------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Images       | `attachments` plus `ClinicalDocument`/`DocumentReference`          | `dental_imaging_records` stores tooth numbers, mount position, annotations, source ids   |
| Appointments | `ClinicalDocument`/`Appointment` or timeline projections           | source appointment ids on procedures, recalls, lab cases, and clinical-document metadata |
| PDFs/letters | `attachments` plus `ClinicalDocument`/`DocumentReference`          | `dental_form_records` or `dental_imaging_records` when they are dental-specific          |
| EOBs         | `attachments` plus `ClinicalDocument`/`ExplanationOfBenefit`       | linked from `dental_insurance_records` or claim projections                              |
| Labs         | Existing lab/observation model when clinical results are available | `dental_lab_cases` for dental-lab workflow, not blood/clinical lab values                |

## Open Dental Concept Mapping

| Open Dental area                                                                                 | Mere source record                                                                | Dental projection fields                                                                                                     |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `procedurelog`, `procedurecode`, `procnote`, `proctp`                                            | `Procedure` or `ServiceRequest`                                                   | `procedureCode`, `dentalStatus`, `treatmentStatus`, `toothNumber`, `dentalTeeth`, `dentalSurfaces`                           |
| `toothinitial`, `toothgrid*`, `chartview`                                                        | `Observation`, `Condition`, `Procedure`                                           | `numberingSystem`, `dentition`, `dentalArch`, `dentalQuadrant`, `dentalStatus`                                               |
| `perioexam`, `periomeasure`                                                                      | `Observation` or `DocumentReference`                                              | `perioPocketDepths`, `perioRecession`, `perioBleeding`, `perioPlaque`, `perioMobility`, `perioFurcation`, `perioSuppuration` |
| `orthocase`, `orthochart*`, `orthohardware*`, `orthorx`, `orthoschedule`                         | `CarePlan`, `ServiceRequest`, `Observation`, `DocumentReference`                  | `orthoPhase`, `orthoArch`, `orthoAppliance`, `orthoStatus`, `alignerCurrent`, `alignerTotal`, `molarClass`, `nextVisit`      |
| `document`, `imagedraw`, `imagingdevice`, `mount*`                                               | `DocumentReference`, `DiagnosticReport`, `ImagingStudy`, `Media`                  | `imagingMount`, `imagingModality`, `dicomStudyUid`, `dicomSeriesUid`, `acquisitionDate`                                      |
| `treatplan`, `treatplanattach`, `treatplanparam`                                                 | `ServiceRequest`, `CarePlan`, `DocumentReference`                                 | `treatmentStatus`, `treatmentPriority`, `estimatedCost`, `insuranceEstimate`, `patientPortion`, `signatureStatus`            |
| `recall`, `recalltype`, `recalltrigger`, appointments, operatories                               | `Appointment`, `Encounter`, `DocumentReference`                                   | `recallType`, `recallDueDate`, `dentalProvider`, `dentalLocation`                                                            |
| `claim*`, `claimproc`, `claimpayment`, `carrier`, `insplan`, `benefit`, `eobattach`, `etrans835` | `Coverage`, `Claim`, `ClaimResponse`, `ExplanationOfBenefit`, `DocumentReference` | `claimStatus`, `carrierName`, `planName`, `subscriberId`, `annualMaximum`, `deductible`, `patientPortion`, `eobAttachment`   |
| `hl7*`, `fhir*`, `ehrsummaryccd`, `snomed`, `loinc`, `cpt`, `ucum`, `CDT`                        | Native imported resources or source attachments                                   | Preserve coding, source identifiers, and original payloads                                                                   |

## Demo JSON Converter

The files in an Open Dental demo database directory are MySQL MyISAM files:

| File    | Purpose        |
| ------- | -------------- |
| `*.frm` | table schema   |
| `*.MYD` | table row data |
| `*.MYI` | table indexes  |

End users are not expected to import `.MYD` files directly. For development, use `tools/export-open-dental-demo-json.mjs` after the demo MyISAM tables have been loaded or exposed through a local MySQL/MariaDB server.

Example:

```bash
MYSQL_PWD='password' node tools/export-open-dental-demo-json.mjs \
  --database opendental_demo \
  --output data/open-dental-demo-json \
  --host 127.0.0.1 \
  --user root
```

To export only a few tables:

```bash
node tools/export-open-dental-demo-json.mjs \
  --database opendental_demo \
  --output data/open-dental-demo-json \
  --tables patient,patientnote,procedurelog,procedurecode,appointment
```

The output shape is:

```text
data/open-dental-demo-json/
  manifest.json
  schema/<table>.json
  tables/<table>.json
```

The JSON output is intended as a temporary developer fixture/input for a later importer that populates `clinical_demo_sources`, `source_code_systems`, `dental_patient_profiles`, `dental_tooth_charts`, `dental_procedure_records`, and `dental_insurance_records`.

## Canadian Dental Terminology

`Release/Databases/canada` is useful as a separate terminology fixture. It has the same 422-table schema as `blank` and `demo`, but its main payload is Canadian procedure-code/default setup data rather than patient data.

The most important table is `procedurecode`, which should import into:

- `dental_terminology_sets`: one set for the Canadian Open Dental procedure-code fixture.
- `dental_terminology_codes`: one row per code.

Relevant `procedurecode` fields:

| Open Dental field    | Dental terminology field   |
| -------------------- | -------------------------- |
| `CodeNum`            | `sourceCodeId`             |
| `ProcCode`           | `code`                     |
| `Descript`           | `display`                  |
| `AbbrDesc`           | `abbreviatedDisplay`       |
| `ProcCat`            | `category`                 |
| `TreatArea`          | `treatmentArea`            |
| `ProcTime`           | `procedureTime`            |
| `DefaultNote`        | `defaultNote`              |
| `DefaultClaimNote`   | `defaultClaimNote`         |
| `DefaultTPNote`      | `defaultTreatmentPlanNote` |
| `LaymanTerm`         | `laymanTerm`               |
| `MedicalCode`        | `medicalCode`              |
| `DiagnosticCodes`    | `diagnosticCodes`          |
| `AlternateCode1`     | `alternateCode`            |
| `SubstitutionCode`   | `substitutionCode`         |
| `SubstOnlyIf`        | `substitutionRule`         |
| `NoBillIns`          | `flags.noBillInsurance`    |
| `IsProsth`           | `flags.prosthesis`         |
| `IsHygiene`          | `flags.hygiene`            |
| `IsTaxed`            | `flags.taxed`              |
| `IsCanadianLab`      | `flags.canadianLab`        |
| `PreExisting`        | `flags.preExisting`        |
| `IsMultiVisit`       | `flags.multiVisit`         |
| `IsRadiology`        | `flags.radiology`          |
| `AreaAlsoToothRange` | `flags.areaAlsoToothRange` |
| `BaseUnits`          | `units.baseUnits`          |
| `CanadaTimeUnits`    | `units.canadaTimeUnits`    |
| `PaintType`          | `visual.paintType`         |
| `GraphicColor`       | `visual.graphicColor`      |
| `PaintText`          | `visual.paintText`         |
| `ProvNumDefault`     | `providerIdDefault`        |
| `RevenueCodeDefault` | `revenueCodeDefault`       |

Related Canadian defaults can be referenced from the terminology set metadata or imported later as supporting fixtures:

- `definition`: categories, statuses, conditions, payment/adjustment labels.
- `procbutton` and `procbuttonitem`: common procedure-button groupings.
- `autocode*`: procedure selection/autocode rules.
- `covcat` / `covspan`: insurance coverage categories.
- `language` / `languageforeign`: localization labels.

This terminology is reusable. It should not be tied to a single patient or Open Dental demo source.

## Product Scope

The dental section should stay patient-facing:

1. Import and preserve dental files, images, DICOM folders, PDFs, CSVs, and vendor exports.
2. Normalize tooth/surface/perio/imaging/treatment/claim metadata for display.
3. Show odontogram timelines, perio trends, imaging mounts, treatment decisions, recall, claims, and ortho history.
4. Avoid recreating Open Dental billing, scheduling, clearinghouse, device control, or chairside charting workflows.

## Current Code Surface

- Dental type model: `apps/web/src/features/dental/types.ts`
- Dental record mapping: `apps/web/src/features/dental/utils/dentalRecords.ts`
- Dental projections: `apps/web/src/features/dental/utils/dentalClinicalModels.ts`
- Dental workspace UI: `apps/web/src/features/dental/DentalTab.tsx`

Future import work should write normalized metadata into the same projection fields rather than adding parallel one-off fields.

## Apexo-Inspired Dental UX Additions

The Apexo codebase is most useful as product/domain inspiration, not as architecture to port. Mere keeps its existing attachment, clinical document, local Dexie, and domain model surfaces, while adding fields that make the dental UI richer.

Added storage/model support:

- Odontogram: permanent and deciduous tooth reference data, FDI conversion, Palmer-style labels, tooth names, and a starter display vocabulary for tooth condition states.
- Tooth conditions: `sound`, `filled`, `compromised`, `endo`, `missing`, `rotated`, `displaced`, and `gum-recessed` are supported as display vocabulary for `DentalToothConditionRecord.conditionType`.
- Orthodontics: `DentalOrthoRecord` now supports case-sheet details such as lips, facial profile, oral hygiene, skeletal/molar/canine class, overjet/overbite, space analysis, cross/scissor bite teeth, problems, appliance plan, visits, photos, and next-visit notes.
- Imaging gallery: `DentalImagingRecord` now supports image role, gallery ordering, thumbnail/preview attachments, crop, rotate, and flip metadata. The binary assets still live in attachments/clinical documents.
- Labwork: `DentalLabCase` now supports case title/details, lab contact, involved teeth, sent/received flags and dates, price/lab fee, paid status, and operating providers.

These are additive fields. They do not require new Dexie tables because they extend existing object records and are not indexed yet.
