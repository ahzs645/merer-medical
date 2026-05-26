import type { LabCitation } from '../types';

export const australianLabCitations: Record<string, LabCitation> = {
  'AUS-AUSTIN-REF-RANGES': {
    id: 'AUS-AUSTIN-REF-RANGES',
    source: 'Austin Health Pathology reference ranges',
    fullCitation:
      'Austin Health Pathology. Pathology Clinical Trials - Trial Specific Reference Ranges 2025. Effective September 30, 2025.',
    url: 'https://www.austinpathology.org.au/assets/documents/clinical-Trial-Reference-Ranges-Austin-Pathology%28Harmonised%29_Sept2025-Signed.pdf',
    quote:
      'Austin Health publishes Australian age- and sex-partitioned ranges for hematology, coagulation, chemistry, hormones, urinalysis, tumour markers, and lipid targets.',
  },
  'AUS-RCPA-CHEM-HRI': {
    id: 'AUS-RCPA-CHEM-HRI',
    source: 'RCPA harmonised chemical pathology intervals',
    fullCitation:
      'Royal College of Pathologists of Australasia. Table 6 - Harmonised reference intervals for chemical pathology. RCPA Manual.',
    url: 'https://www.rcpa.edu.au/Manuals/RCPA-Manual/General-Information/IG/Table-6-Harmonised-reference-intervals-for-chem',
    quote:
      'RCPA SPIA lists Australasian harmonised serum/plasma chemical pathology intervals with adult, paediatric, and selected sex-specific partitions.',
  },
  'AUS-AACB-TATE-2014': {
    id: 'AUS-AACB-TATE-2014',
    source: 'AACB harmonised Australasian reference intervals',
    fullCitation:
      'Tate JR, Sikaris KA, Jones GRD, et al. Harmonising Adult and Paediatric Reference Intervals in Australia and New Zealand. Clinical Biochemist Reviews. 2014;35(4):213-235.',
    url: 'https://openresearch-repository.anu.edu.au/bitstreams/d21c9162-1f8f-4605-bea3-9686fd4cc620/download',
    quote:
      'The paper publishes AHRIA adult and AHRIP paediatric common reference intervals for chemistry analytes in Australia and New Zealand.',
  },
  'NZ-CHL-GEN-CHEM': {
    id: 'NZ-CHL-GEN-CHEM',
    source: 'Canterbury Health Laboratories general chemistry intervals',
    fullCitation:
      'Canterbury Health Laboratories. Core Biochemistry Reference Intervals: General Chemistry. Issue 3, July 31, 2025.',
    url: 'https://www.chl.co.nz/wp-content/uploads/2023/10/Laboratory-Reference-Intervals-General-Chemistry-1.pdf',
    quote:
      'CHL publishes general chemistry reference intervals with lower and upper limits, age/sex partitions, units, and revision dates.',
  },
  'NZ-AWANUI-AKL-BIOCHEM': {
    id: 'NZ-AWANUI-AKL-BIOCHEM',
    source: 'Awanui Labs Auckland biochemistry reference intervals',
    fullCitation:
      'Awanui Labs Auckland. Reference Intervals - Clinical Chemistry. BIO-QLT-F007, issued September 21, 2025.',
    url: 'https://fl-healthscope-media.s3.amazonaws.com/lab-sites/uploads/sites/2/2025/09/Biochemistry-Reference-intervals-22092025.pdf',
    quote:
      'Awanui Auckland publishes clinical chemistry intervals across diabetic, liver function, bone, iron, endocrine, and related test groups.',
  },
  'NZ-AWANUI-AKL-HAEM': {
    id: 'NZ-AWANUI-AKL-HAEM',
    source: 'Awanui Labs Auckland haematology reference intervals',
    fullCitation:
      'Awanui Labs Auckland. Reference Intervals - Haematology. HAE-F012, issued August 13, 2024.',
    url: 'https://fl-healthscope-media.s3.amazonaws.com/lab-sites/uploads/sites/2/2025/03/Haem-Ref-Int-HAE-F012.pdf',
    quote:
      'Awanui Auckland publishes adult male, female, and antenatal complete blood count intervals plus ESR and coagulation ranges.',
  },
  'AUS-MONASH-REF-MASTER': {
    id: 'AUS-MONASH-REF-MASTER',
    source: 'Monash Health Pathology reference interval master list',
    fullCitation:
      'Monash Health Pathology. Pathology Reference Interval Master List. WIN-QS-19 version 13, issued August 6, 2024.',
    url: 'https://monashpathology.org/wp-content/uploads/2024/08/WIN-QS-19.pdf',
    quote:
      'The Monash master list includes method-specific reference intervals, including blood gas analysis on Radiometer and i-STAT.',
  },
  'AUS-PATHWEST-BLOOD-GAS': {
    id: 'AUS-PATHWEST-BLOOD-GAS',
    source: 'PathWest blood gas and i-STAT reference intervals',
    fullCitation:
      'PathWest Laboratory Medicine WA. Blood Gas Reference Intervals. BMM082 version 1.1, issued January 23, 2025.',
    url: 'https://pathwest.health.wa.gov.au/~/media/PathWest/Documents/Our-Services/Clinical-Services/Point-of-Care-Testing/Blood-Gas-Reference-Intervals.pdf',
    quote:
      'PathWest publishes age-related blood gas, i-STAT CG4+, and i-STAT CHEM8 reference interval charts.',
  },
  'AUS-ADS-HBA1C': {
    id: 'AUS-ADS-HBA1C',
    source: 'Australian Diabetes Society HbA1c diagnosis statement',
    fullCitation:
      'Australian Diabetes Society. HbA1c for Diagnosis of Diabetes Mellitus, May 2023.',
    url: 'https://www.diabetessociety.com.au/guideline/hba1c-for-diagnosis-of-diabetes-mellitus-may-2023/',
    quote:
      'ADS accepts HbA1c for diabetes diagnosis at 6.5% or higher, with repeat confirmation for asymptomatic patients.',
  },
};
