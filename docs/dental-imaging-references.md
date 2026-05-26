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
