# Dental and Imaging References

This note captures the first implementation references for adding imaging and a dental-focused workspace.

## Standards

- HL7 FHIR US Dental Data Exchange STU 1 is the primary dental-specific FHIR reference for referral/consult exchange and profiles such as Dental Condition, Dental Finding, Dental ServiceRequest, and Dental Communication: https://hl7.org/fhir/us/dental-data-exchange/STU1/
- FHIR `DiagnosticReport` supports lab, pathology, imaging, and other diagnostic reports. R4 reports can reference key images through `media`, full DICOM studies through `imagingStudy`, and issued PDFs or other attachments through `presentedForm`: https://hl7.org/fhir/R4/diagnosticreport.html
- FHIR `ImagingStudy` represents DICOM studies and series. HL7 recommends `DocumentReference` for non-DICOM images, video, audio, or other document-like media: https://hl7.org/fhir/imagingstudy.html
- FHIR `DocumentReference` is suitable for image files, scanned records, PDFs, and references to externally stored documents: https://hl7.org/fhir/R4/documentreference.html
- Dental Data Exchange best practices point toward SNOMED CT, SNODENT translation where available, and CDT for planned dental procedures/referrals: https://build.fhir.org/ig/HL7/dental-data-exchange/best_practices.html
- ADA Proposed Standard 1114 is a dentistry-specific DICOM reference covering intraoral radiographs, panoramic radiographs, cephalometric images, CBCT, and visible-light 2D/3D imaging: https://www.ada.org/-/media/project/ada-organization/ada/ada-org/files/resources/practice/dental-standards/aip-review/proposed_1114_aip.pdf

## Open-source projects worth evaluating

- OHIF Viewer is the strongest open-source web DICOM viewer candidate for future embedded viewing or external launch flows: https://github.com/OHIF/Viewers
- Orthanc is a lightweight open-source DICOM server/PACS that can pair with OHIF through DICOMweb: https://github.com/orthanc-server/orthanc
- `bardurt/odontograma` is a small JavaScript odontogram reference that can help shape an eventual tooth chart UI: https://github.com/bardurt/odontograma
- `react-odontogram` is a React reference for tooth notation and selected-tooth state: https://github.com/biomathcode/react-odontogram
- DentalPin is a modern dental clinic app reference with patients, odontogram, treatments, imaging, and an API. Its BSL license needs review before reuse: https://github.com/martinezsalmeron/dentalpin
- OpenEMR has a mature open-source EHR codebase and FHIR/API surface; its dental-specific fit should be verified against current modules before copying patterns: https://github.com/openemr/openemr

## Implementation References

Use these as design and architecture references while building dental data input. Check licenses before copying source code.

### Tooth Chart / Odontogram

- `react-odontogram`: MIT, React/TypeScript/SVG. Useful for FDI, Universal, and Palmer tooth mapping, SVG tooth shapes, and selected-tooth state. It is more tooth-level than surface-level, so surface charting still needs a local model: https://github.com/biomathcode/react-odontogram
- `react-odontogram-3d`: MIT on package listing, React/TypeScript/Three.js. Useful for 3D tooth interaction concepts. Audit repo maturity/license before copying: https://github.com/dealverina/react-odontogram-3d
- `jquery-odontogram`: jQuery/Canvas. Useful conceptually for procedure modes and tooth-surface position strings such as `18-R`. License was not clearly visible, so treat as conceptual only: https://github.com/Adhiana46/jquery-odontogram
- GateDent odontogram docs: proprietary product docs. Useful for UX concepts such as FDI quadrants, 5-surface workflow, condition snapshots, and PDF export: https://gatedent.com/en/docs/odontoqram

### Tooth Numbering / Surfaces

- HL7 THO ADA Tooth Surface Codes: use as a terminology reference for standard surface codes such as mesial, occlusal/incisal, distal, buccal/facial, and lingual: https://build.fhir.org/ig/HL7/UTG/en/CodeSystem-ADAToothSurfaceCodes.html
- Open Dental ProcedureLogs API: useful import reference for `Surf`, `ToothNum`, `ToothRange`, procedure status lifecycle, and treatment-plan versus completed procedure distinctions. Current Open Dental licensing has changed, so use docs conceptually: https://www.opendental.com/site/apiprocedurelogs.html
- Open Dental ProcedureCodes API: useful for treatment areas such as surface, tooth, mouth, quadrant, sextant, arch, and tooth range: https://www.opendental.com/site/apiprocedurecodes.html

### Periodontal Charting

- Periodontal Chart: web app reference for 32-tooth FDI charting, 6 sites per tooth, BOP, plaque, furcation, mobility, PNG/JSON export, and real-time stats. License/source are unclear, so use as UX/data reference: https://periodontalch.art/
- Zermmi Free Periochart docs: useful for realistic versus abstract chart views, one-handed/keyboard data entry, quadrant traversal, missing/implant status, JSON/PDF import/export. Proprietary docs only: https://www.zermmi.com/en/docs/perioapp
- `javafx-periodontal-chart`: JavaFX project, useful only for chart layout concepts unless license is verified: https://github.com/ZaTribune/javafx-periodontal-chart

### Treatment Plans / Dental EMR Data Models

- Clear.Dental: GPLv3, Qt/QML/C++. Useful for data concepts such as `hardTissue.ini`, `perio.ini`, `txPlan.json`, radiograph/photo directories, and offline-first clinical workflow. Use conceptually unless GPL compatibility is intentional: https://clear.dental/
- OpenMolar: GPLv3, Python/Qt/MySQL/PostgreSQL. Useful for schema and workflow ideas, but project status is limited: https://openmolar.com/
- Apexo: GPLv3, Flutter/Dart. Useful conceptually for patients, appointments, photo attachments, offline/local-first dental clinic management: https://github.com/alselawi/apexo-flutter
- Open Dental legacy repo: GPL-2.0 legacy C#/.NET code. Current product licensing changed, so use only as conceptual/schema reference after legal review: https://github.com/OpenDental/opendental

### DICOM / Dental Imaging

- OHIF Viewer: MIT, TypeScript/React/Cornerstone/DICOMweb. Best web DICOM viewer reference for extension architecture, measurements, MPR/MIP/volume rendering, DICOM SR/PDF, auth, and offline patterns: https://github.com/OHIF/Viewers
- Cornerstone3D: MIT, TypeScript/WebGL/WASM. Lower-level reference for DICOM loading, viewport/tools APIs, annotations, and custom loaders: https://github.com/cornerstonejs/cornerstone3D
- VolView: Apache-2.0, web app built around VTK/ITK. Useful for local drag-and-drop DICOM, 2D slices, 3D volume rendering, and privacy-preserving browser workflows: https://github.com/Kitware/VolView
- Weasis: EPL-2.0 or Apache-2.0, Java viewer. Useful integration reference for PACS/DICOMweb, DICOMDIR/ZIP import/export, annotations, DICOM SR/SEG/RT support: https://github.com/nroduit/Weasis
- Orthanc: GPLv3, C++ DICOM server. Useful as a separate local mini-PACS/reference service for DICOM storage and DICOMweb/REST APIs: https://www.orthanc-server.com/

### Intraoral Scan / 3D File Handling

- Three.js `STLLoader` and `PLYLoader`: MIT. Good first code reference for browser display of STL and PLY scan meshes; dental semantics and PHI-safe storage need local design: https://threejs.org/docs/pages/STLLoader.html
- `xstl`: MIT, Electron/React. Useful reference for opening local STL files and basic mesh viewing controls: https://github.com/emanuelescarabattoli/xstl
- MeshLab and CloudCompare: GPL desktop/native tools. Useful conceptually for mesh conversion, cleanup, decimation, point-cloud comparison, STL/PLY/OBJ workflows. Avoid copying code unless GPL-compatible: https://github.com/cnr-isti-vclab/meshlab and https://github.com/CloudCompare/CloudCompare
- Promaton Viewer docs: proprietary browser dental viewer/API. Useful conceptually for dental-specific supported files and CBCT/intraoral scan treatment planning UX: https://viewer.promaton.com/

### FHIR Dental Examples

- HL7 FHIR Dental Data Exchange IG: use as the primary dental FHIR data-model reference for Dental Bundle, Dental Referral Note, Dental ServiceRequest, Dental Condition, Dental Finding, and Dental Communication. Scope is referral/consult exchange, not a complete chairside odontogram/perio model: https://hl7.org/fhir/us/dental-data-exchange/STU1/
- Dental Condition profile: reference for dental category on `Condition`, tooth/body-site use, and evidence Observations: https://hl7.org/fhir/us/dental-data-exchange/StructureDefinition-dental-condition.html
- Open Dental FHIR spec PDF: useful import/export mapping reference for `Procedure.bodySite` tooth/surface mapping and treatment-planned procedures as `ServiceRequest`: https://www.opendental.com/resources/OpenDentalFHIR19-3Spec.pdf
- JP Core DentalOral ToothSurface extension: useful example of representing tooth surface on `Observation.bodySite`; compare with US requirements before adopting directly: https://jpfhir.jp/fhir/core/1.2.0/StructureDefinition-jp-observation-dentaloral-toothsurface.html

## Modeling direction

- Keep FHIR resources as the source record format.
- Model dental diagnoses/problems as `Condition`.
- Model odontogram findings, periodontal measurements, tooth-specific observations, TMJ/TMD, occlusion, and soft-tissue exams as `Observation`.
- Model completed dental work as `Procedure` and planned work/referrals as `ServiceRequest`.
- Treat radiology and dental imaging reports as `DiagnosticReport`.
- Treat full DICOM studies, including CBCT, as `ImagingStudy`.
- Treat JPEG/PNG/PDF scans, intraoral photos, exported dental documents, and intraoral mesh scan files such as STL/PLY/OBJ as `DocumentReference`.
- Store binaries outside FHIR JSON when possible. Keep URLs, hashes, size, content type, DICOM UIDs, accession numbers, acquisition dates, modality, performer, and clinical interpretation in FHIR metadata.
- Use dental/oral keywords and body-site labels only as an initial grouping heuristic until a dedicated oral-health profile or odontogram data model is added.

## Dental EMR Intake Targets

Dental EMR and practice-management exports are usually a mix of structured APIs, FHIR, CSV/Excel reports, PDFs, scanned forms, image folders, DICOM exports, mesh files, and vendor conversion dumps. The app should expect these categories:

- Patient/provider/facility: demographics, responsible party, family relationships, chart number, preferred dentist/hygienist, medical alerts, clinic, provider, operatory/chair, address, and contact details. Open Dental exposes many of these through public API/FHIR docs: https://www.opendental.com/resources/OpenDentalAPI.pdf
- Dental chart/odontogram: tooth status, missing/primary/supernumerary teeth, implants, existing restorations, planned restorations, tooth movements, tooth notes, tooth numbering systems, and surfaces. Open Dental chart references: https://www.opendental.com/manual/chart.html
- Periodontal charting: exam date, provider, pocket depths, gingival margin/recession, clinical attachment level, MGJ, mobility, furcation, plaque, calculus, bleeding, suppuration, skipped/missing teeth, and indices. Open Dental perio reference: https://www.opendental.com/manual/perio.html
- Procedures and diagnoses: completed/planned procedures with CDT code, date, status, provider, tooth, surface, fees, and notes; dental diagnoses such as caries, periodontal disease, endodontic findings, soft-tissue findings, TMJ/TMD, and occlusion findings. SNODENT reference: https://www.ada.org/resources/practice/dental-standards/snodent
- Treatment plans: proposed, accepted, rejected, and alternative plans; phases, priority, visits, planned appointments, procedures, tooth/surface, provider, estimated fees, insurance estimates, patient portion, and signatures. Open Dental treatment plan reference: https://www.opendental.com/manual/treatmentplan.html
- Imaging/photos/scans: intraoral, bitewing, panoramic, cephalometric, photos, annotations, CBCT/DICOM volumes, intraoral scans, study models, CAD/CAM files, prosthetic files, implant guides, and formats including DICOM/DICOMDIR, JPEG, PNG, TIFF, BMP, PDF, STL, OBJ, PLY, and ZIP.
- Notes/documents: progress notes, SOAP notes, procedure notes, odontogram notes, perio notes, medical/dental history, radiographic interpretations, referral letters, scanned documents, EOBs, and insurance cards.
- Insurance/billing/claims: carriers, plans, subscribers, benefits, deductibles, annual maximums, coverage tables, eligibility checks, preauthorizations, claims, EOBs, ledger entries, payments, fee schedules, CDT codes, and ADA claim form fields. ADA claim form reference: https://www.ada.org/publications/cdt/ada-dental-claim-form
- Medications/allergies/prescriptions: patient-reported medications, prescription records, eRx records, allergies/intolerances, reactions, and active/inactive status.
- Referrals: source/destination provider, specialty, reason, date, status, notes, consult notes, and attachments. Dental ServiceRequest reference: https://build.fhir.org/ig/HL7/dental-data-exchange/branches/master/StructureDefinition-dental-servicerequest.html
- Appointments/recall: appointment time, status, confirmation, dentist, hygienist, operatory, appointment type, duration, planned/ASAP/unscheduled lists, and continuing-care recall.
- Consents/forms/patient education: intake forms, HIPAA/privacy acknowledgments, medical history, treatment consent, anesthesia consent, treatment plan signatures, financial agreements, pre/post-op instructions, and patient education materials.

For a first product pass, the most valuable input flows are likely:

1. Import dental documents/images as `DocumentReference`.
2. Classify dental imaging reports and DICOM metadata into `DiagnosticReport` and `ImagingStudy`.
3. Add manual dental findings/procedures with tooth and surface fields.
4. Add a tooth-chart projection over FHIR `Observation`, `Condition`, `Procedure`, and `ServiceRequest`.
5. Add periodontal chart entry once the tooth/surface data model is stable.
