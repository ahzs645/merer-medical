import { EyeMetricField } from '../types';

export const OPTOMETRY_REFERENCES = [
  {
    label: 'FHIR VisionPrescription',
    url: 'https://fhir.hl7.org/fhir/visionprescription.html',
  },
  {
    label: 'HL7 Eyecare IG',
    url: 'https://build.fhir.org/ig/HL7/fhir-eyecare-ig/toc.html',
  },
  {
    label: 'HL7 fhir-eyecare-ig GitHub',
    url: 'https://github.com/HL7/fhir-eyecare-ig',
  },
  {
    label: 'DICOM ophthalmology standards',
    url: 'https://www.dicomstandard.org/standards',
  },
  {
    label: 'Eyefinity export elements',
    url: 'https://help.eyefinity.com/eehr/export/elements.htm',
  },
  {
    label: 'Compulink FHIR API docs',
    url: 'https://compulinkadvantage.com/fhirapidocumentation/',
  },
];

export const EYE_METRIC_FIELDS: EyeMetricField[] = [
  {
    key: 'sphere',
    label: 'Sphere',
    type: 'decimal',
    unit: 'D',
    appliesTo: ['OD', 'OS'],
    fhirResource: 'VisionPrescription or Observation',
    notes:
      'Final authorized lens power belongs in VisionPrescription; exam refraction findings belong in Observation.',
  },
  {
    key: 'cylinder',
    label: 'Cylinder',
    type: 'decimal',
    unit: 'D',
    appliesTo: ['OD', 'OS'],
    fhirResource: 'VisionPrescription or Observation',
    notes: 'Preserve plus/minus cylinder convention from the source system.',
  },
  {
    key: 'axis',
    label: 'Axis',
    type: 'integer',
    unit: 'degrees',
    appliesTo: ['OD', 'OS'],
    fhirResource: 'VisionPrescription or Observation',
    notes: 'Valid range is usually 1-180 degrees.',
  },
  {
    key: 'add',
    label: 'Add',
    type: 'decimal',
    unit: 'D',
    appliesTo: ['OD', 'OS'],
    fhirResource: 'VisionPrescription',
    notes: 'Near add for multifocal/progressive lenses.',
  },
  {
    key: 'pd',
    label: 'PD',
    type: 'decimal',
    unit: 'mm',
    appliesTo: ['OD', 'OS', 'OU'],
    fhirResource: 'VisionPrescription',
    notes: 'Store monocular PD where available; binocular PD can be OU.',
  },
  {
    key: 'visualAcuity',
    label: 'Visual acuity',
    type: 'string',
    appliesTo: ['OD', 'OS', 'OU'],
    fhirResource: 'Observation',
    notes:
      'Preserve chart/method and representation, such as Snellen or logMAR.',
  },
  {
    key: 'iop',
    label: 'IOP',
    type: 'decimal',
    unit: 'mmHg',
    appliesTo: ['OD', 'OS'],
    fhirResource: 'Observation',
    notes:
      'Preserve measurement time and device/method, such as Goldmann, iCare, or Tonopen.',
  },
  {
    key: 'octRnfl',
    label: 'OCT RNFL',
    type: 'decimal',
    unit: 'microns',
    appliesTo: ['OD', 'OS'],
    fhirResource: 'Observation + DiagnosticReport',
    notes:
      'Store extracted metrics as Observation and source OCT/PDF/DICOM as DocumentReference or ImagingStudy.',
  },
  {
    key: 'kValue',
    label: 'K value',
    type: 'decimal',
    unit: 'D',
    appliesTo: ['OD', 'OS'],
    fhirResource: 'Observation',
    notes: 'Useful for corneal topography/tomography and contact lens fitting.',
  },
];

export const OPTOMETRY_MODEL_CARDS = [
  {
    title: 'Prescription',
    body: 'Use VisionPrescription for final glasses/contact lens authorization. Keep refraction measurements as Observations.',
  },
  {
    title: 'Exam metrics',
    body: 'Use Observation for VA, IOP, refraction, pachymetry, OCT metrics, visual fields, and topography values.',
  },
  {
    title: 'Ocular conditions',
    body: 'Use Condition for glaucoma, cataract, diabetic retinopathy, AMD, keratoconus, dry eye, amblyopia, and strabismus.',
  },
  {
    title: 'Imaging and device exports',
    body: 'Use DiagnosticReport, ImagingStudy, and DocumentReference for OCT, fundus photos, visual fields, PDFs, DICOM, CSV, XML, and vendor files.',
  },
  {
    title: 'Optical retail',
    body: 'Link frames, lenses, coatings, contact lens brand/base curve/diameter, lab orders, and dispense events to the prescription.',
  },
];
