# Optometry and Ophthalmology References

This note captures implementation references and field modeling targets for an optometry/ophthalmology/optical workspace.

## Standards

- FHIR `VisionPrescription` is the dedicated resource for authorized glasses and contact lens prescriptions: https://fhir.hl7.org/fhir/visionprescription.html
- HL7 Eyecare IG includes eyecare-specific profiles and examples for visual acuity, IOP, OCT, visual field, diagnoses, procedures, and observations: https://build.fhir.org/ig/HL7/fhir-eyecare-ig/toc.html
- HL7 Eyecare IG source is public and useful for examples and terminology review: https://github.com/HL7/fhir-eyecare-ig
- DICOM ophthalmology SOP classes cover ophthalmic photography, OCT/OCT-A, visual field static perimetry, ophthalmic thickness maps, macular grid reports, corneal topography, axial measurements, and IOL calculations: https://www.dicomstandard.org/standards
- Ophthalmic Photography IOD reference: https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_a.41.html

## Vendor/Public Export References

- Eyefinity documents one-time EHI export data groups including Practice, Patient, Document Management, Lab, Prescription, Pretesting, Visit, Exam, Diagnosis, and Procedure: https://help.eyefinity.com/eehr/export/elements.htm
- Compulink publishes FHIR API documentation for optometry/ophthalmology systems: https://compulinkadvantage.com/fhirapidocumentation/
- OpenEyes is an open-source ophthalmology EPR and useful domain/workflow reference: https://github.com/AppertaFoundation/openeyes

## Modeling Direction

- Store final glasses/contact lens prescriptions as `VisionPrescription`.
- Store exam findings such as refraction, visual acuity, IOP, pachymetry, OCT metrics, visual field metrics, and topography as eye-specific `Observation` records.
- Store ocular diagnoses/history such as glaucoma, cataract, diabetic retinopathy, AMD, keratoconus, dry eye, amblyopia, and strabismus as `Condition`.
- Store completed eye-care procedures as `Procedure` and ordered/referral work as `ServiceRequest`.
- Store OCT, fundus, visual field, topography, biometry, and IOL reports as `DiagnosticReport`, with source DICOM metadata in `ImagingStudy` and original PDFs/images/device exports in `DocumentReference`.
- Store appointments/recall as `Appointment`, coverage as `Coverage`, claims/EOBs as `Claim`, `ClaimResponse`, or `ExplanationOfBenefit`, and intake/consent/questionnaires as `QuestionnaireResponse` or `DocumentReference`.
- Always preserve laterality explicitly: OD, OS, and OU. Do not rely on display text as the only source of eye side.
- Preserve source artifacts unchanged, including DICOM, PDF, JPEG/PNG/TIFF, CSV/XML, CDA, HL7 v2, EHI ZIP exports, and vendor-specific files.

## Field Types

- Sphere: decimal, diopters, OD/OS, `VisionPrescription` or refraction `Observation`.
- Cylinder: decimal, diopters, OD/OS, preserve plus/minus convention.
- Axis: integer, degrees, OD/OS, usually 1-180.
- Add: decimal, diopters, OD/OS, final Rx in `VisionPrescription`.
- Prism/base: string or structured components, OD/OS/OU, final Rx in `VisionPrescription`.
- PD: decimal, millimeters, monocular OD/OS or binocular OU.
- Visual acuity: string or structured value, OD/OS/OU, preserve chart/method and representation such as Snellen or logMAR.
- IOP: decimal, mmHg, OD/OS, preserve time and device/method such as Goldmann, iCare, or Tonopen.
- OCT RNFL/GCC/macula metrics: decimal, microns, OD/OS, store extracted values as `Observation` and source reports as `DiagnosticReport`/`DocumentReference`.
- Visual field indices: decimal/string, OD/OS, preserve MD, PSD, VFI, fixation losses, false positives/negatives, and test strategy.
- Keratometry/topography: decimal, diopters/mm/degrees, OD/OS, preserve device/protocol and maps as source files.

## First Product Pass

1. Eye prescription card for `VisionPrescription`.
2. Exam metrics table for VA, IOP, refraction, OCT, visual field, and topography Observations.
3. Eye imaging panel that links into the general Imaging workspace.
4. Ocular conditions/procedures/document timeline.
5. Forms/import target for PDFs, device exports, and EHI ZIPs.
