import type { LabCitation } from '../types';

export const ukLabCitations: Record<string, LabCitation> = {
  'UK-WORCS-FBC': {
    id: 'UK-WORCS-FBC',
    source: 'Worcestershire Acute Hospitals NHS full blood count',
    fullCitation:
      'Worcestershire Acute Hospitals NHS Trust. Pathology Tests A to Z: Full Blood Count.',
    url: 'https://www.worcsacute.nhs.uk/pathology-tests-a-to-z/full-blood-count/',
    quote:
      'NHS FBC table provides age-partitioned counts and adult sex partitions for RBC, haemoglobin, haematocrit, and platelets.',
  },
  'UK-SYNNOVIS-CHEM': {
    id: 'UK-SYNNOVIS-CHEM',
    source: 'Synnovis chemistry reference intervals',
    fullCitation:
      'Synnovis. BSL-ALL-CHEM-INST3 Chemistry Reference Intervals, Version 5. Effective December 22, 2025.',
    url: 'https://www.synnovis.co.uk/sites/default/files/upload/Quality/BSL-ALL-CHEM-INST3%20Chemistry%20Reference%20Intervals%20v5.pdf',
    quote:
      'Synnovis publishes blood sciences chemistry intervals for all sites, including age and sex partitions for common chemistry, endocrine, and lipid analytes.',
  },
  'UK-MFT-BLOOD-COUNTS': {
    id: 'UK-MFT-BLOOD-COUNTS',
    source: 'Manchester University NHS Foundation Trust blood counts',
    fullCitation:
      'Manchester University NHS Foundation Trust. Haematology User Guide, Blood Counts reference ranges table, MI_HAEM28 Revision 16. Active July 11, 2024.',
    url: 'https://mft.nhs.uk/app/uploads/2024/07/Blood-counts-reference-ranges.pdf',
    page: 'p.26',
    quote:
      'MFT blood counts table lists neonatal, paediatric, adolescent, and adult full blood count intervals with adult sex-specific RBC, haemoglobin, haematocrit, and ESR intervals.',
  },
  'UK-UHD-HAEMATOLOGY': {
    id: 'UK-UHD-HAEMATOLOGY',
    source: 'University Hospitals Dorset haematology reference ranges',
    fullCitation:
      'University Hospitals Dorset NHS Foundation Trust. Test Repertoire and Reference Ranges: Haematology and Coagulation.',
    url: 'https://www.uhd.nhs.uk/directory/name/187-services/joint-service/pathology/haematology-medical-pathology/2389-test-repertoire-and-reference-ranges',
    quote:
      'UHD publishes adult, paediatric, infant, ESR, HbA1c, coagulation, and D-dimer reference ranges for haematology and coagulation testing.',
  },
  'UK-NWANGLIA-BIOCHEM': {
    id: 'UK-NWANGLIA-BIOCHEM',
    source: 'North West Anglia NHS biochemistry ranges',
    fullCitation:
      'North West Anglia NHS Foundation Trust. Pathology requesting and reporting updates: Updated Clinical Biochemistry Reference Ranges.',
    url: 'https://www.nwangliaft.nhs.uk/pathology-requesting-and-reporting-updates',
    quote:
      'NHS harmonisation table publishes age- and sex-partitioned chemistry and endocrine intervals used for UK chemistry, thyroid, ferritin, B12, and testosterone entries.',
  },
  'UK-NWL-UREA': {
    id: 'UK-NWL-UREA',
    source: 'North West London Pathology urea',
    fullCitation: 'North West London Pathology. Test Database: Urea.',
    url: 'https://www.nwlpathology.nhs.uk/tests-database/urea/',
    quote:
      'NHS test database lists urea intervals partitioned by neonatal, infant, child, and adult age groups.',
  },
  'UK-GLOS-SODIUM': {
    id: 'UK-GLOS-SODIUM',
    source: 'Gloucestershire Hospitals NHS sodium',
    fullCitation:
      'Gloucestershire Hospitals NHS Foundation Trust. Sodium (Na).',
    url: 'https://www.gloshospitals.nhs.uk/our-services/services-we-offer/pathology/tests-and-investigations/sodium-na/',
    quote:
      'NHS pathology page lists serum sodium reference range as 133-146 mmol/L.',
  },
  'UK-GLOS-POTASSIUM': {
    id: 'UK-GLOS-POTASSIUM',
    source: 'Gloucestershire Hospitals NHS potassium',
    fullCitation:
      'Gloucestershire Hospitals NHS Foundation Trust. Potassium (K).',
    url: 'https://www.gloshospitals.nhs.uk/our-services/services-we-offer/pathology/tests-and-investigations/potassium-k/',
    quote:
      'NHS pathology page lists serum potassium and adult 24 hour urine potassium reference ranges.',
  },
  'UK-GLOS-ALBUMIN': {
    id: 'UK-GLOS-ALBUMIN',
    source: 'Gloucestershire Hospitals NHS albumin',
    fullCitation: 'Gloucestershire Hospitals NHS Foundation Trust. Albumin.',
    url: 'https://www.gloshospitals.nhs.uk/our-services/services-we-offer/pathology/tests-and-investigations/albumin/',
    quote:
      'NHS pathology page lists age-partitioned albumin reference ranges and page review/update date.',
  },
  'UK-GLOS-CREATININE-EGFR': {
    id: 'UK-GLOS-CREATININE-EGFR',
    source: 'Gloucestershire Hospitals NHS creatinine/eGFR',
    fullCitation:
      'Gloucestershire Hospitals NHS Foundation Trust. Creatinine and eGFR CKD-EPI.',
    url: 'https://www.gloshospitals.nhs.uk/our-services/services-we-offer/pathology/tests-and-investigations/creatinine-and-egfr-ckd-epi/',
    quote:
      'NHS pathology page lists creatinine intervals by pediatric age bands and sex-specific adolescent/adult partitions.',
  },
  'UK-GLOS-THYROID': {
    id: 'UK-GLOS-THYROID',
    source: 'Gloucestershire Hospitals NHS thyroid function tests',
    fullCitation:
      'Gloucestershire Hospitals NHS Foundation Trust. Thyroid Function Tests (TSH, FT4, FT3).',
    url: 'https://www.gloshospitals.nhs.uk/our-services/services-we-offer/pathology/tests-and-investigations/thyroid-function-tests-tsh-ft4-ft3/',
    quote:
      'NHS pathology page lists adult, pediatric, and pregnancy-related intervals for TSH, FT4, and FT3.',
  },
  'UK-WORCS-LIPIDS': {
    id: 'UK-WORCS-LIPIDS',
    source: 'Worcestershire Acute Hospitals NHS cholesterol health check',
    fullCitation:
      'Worcestershire Acute Hospitals NHS Trust. Pathology Tests A to Z: Cholesterol (Health Check).',
    url: 'https://www.worcsacute.nhs.uk/pathology-tests-a-to-z/cholesterol-health-check/',
    quote:
      'NHS cholesterol health check table lists fasting total cholesterol and sex-specific HDL cholesterol reference values.',
  },
  'UK-GLOS-LIPIDS': {
    id: 'UK-GLOS-LIPIDS',
    source: 'Gloucestershire Hospitals NHS lipid profile',
    fullCitation:
      'Gloucestershire Hospitals NHS Foundation Trust. Lipids (cholesterol, triglycerides, HDL, LDL).',
    url: 'https://www.gloshospitals.nhs.uk/our-services/services-we-offer/pathology/tests-and-investigations/lipids-cholesterol-triglycerides-hdl-ldl/',
    quote:
      'NHS lipid profile page lists a fasting serum triglyceride reference range and notes other lipid markers should be risk-assessed.',
  },
  'UK-UHD-HAEM-COAG': {
    id: 'UK-UHD-HAEM-COAG',
    source: 'University Hospitals Dorset haematology/coagulation ranges',
    fullCitation:
      'University Hospitals Dorset NHS Foundation Trust. Haematology Test Repertoire and Reference Ranges.',
    url: 'https://www.uhd.nhs.uk/services/pathology/haematology/test-repertoire-and-reference-ranges',
    quote:
      'NHS haematology page lists adult and paediatric coagulation reference ranges and ESR reference ranges.',
  },
  'UK-UHNM-PSA': {
    id: 'UK-UHNM-PSA',
    source: 'University Hospitals of North Midlands PSA',
    fullCitation:
      'University Hospitals of North Midlands NHS Trust. Prostate specific antigen (PSA).',
    url: 'https://www.uhnm.nhs.uk/our-services/pathology/tests/prostate-specific-antigen-psa/',
    quote:
      'NHS PSA page lists male age-specific reference limits for under 50, 50-59, 60-69, and 70 years and older.',
  },
  'UK-NWL-ACR': {
    id: 'UK-NWL-ACR',
    source: 'North West London Pathology urine ACR',
    fullCitation:
      'North West London Pathology. Test Database: Albumin:creatinine ratio (urine).',
    url: 'https://www.nwlpathology.nhs.uk/tests-database/albumincreatinine-ratio-urine/',
    quote:
      'NHS urine ACR page lists random urine albumin/creatinine ratio reference range below 3 mg/mmol creatinine.',
  },
  'UK-NICE-CKD': {
    id: 'UK-NICE-CKD',
    source: 'NICE chronic kidney disease guideline',
    fullCitation:
      'National Institute for Health and Care Excellence. Chronic kidney disease: assessment and management. NICE guideline NG203.',
    url: 'https://www.nice.org.uk/guidance/ng203/chapter/Recommendations',
    quote:
      'NICE CKD classification combines GFR and ACR; G1 and G2 can be low risk with no CKD if no other kidney damage markers exist.',
  },
  'UK-NICE-HBA1C': {
    id: 'UK-NICE-HBA1C',
    source: 'NICE type 2 diabetes prevention glossary',
    fullCitation:
      'National Institute for Health and Care Excellence. Type 2 diabetes: prevention in people at high risk, PH38 glossary.',
    url: 'https://www.nice.org.uk/guidance/ph38/chapter/Glossary',
    quote:
      'NICE cites the WHO HbA1c diagnostic cut-off of 48 mmol/mol, equivalent to 6.5%, for non-pregnant adults.',
  },
};
