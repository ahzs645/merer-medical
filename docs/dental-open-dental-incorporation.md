# Dental Open Dental Incorporation

This note documents how Open Dental-style concepts are incorporated into Mere without copying the Open Dental database or turning Mere into a chairside practice-management system.

## Storage Direction

Mere continues to store source records as FHIR-shaped `ClinicalDocument` rows. Dental-specific structure is normalized as projection metadata in `metadata.manual_specialty_details` and read by the dental workspace.

This keeps imports reversible and source-preserving:

- Original FHIR, document, image, DICOM, CSV, PDF, or vendor export data remains in the source record or attachment.
- Dental fields are a normalized layer used for display, filtering, timeline grouping, and future export.
- Open Dental table names can be preserved as provenance through `sourceSystem`, `sourceTable`, `sourceId`, and `mappingConfidence`.

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
