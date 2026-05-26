import type { LabCitation } from '../types';

export const canadianLabCitations: Record<string, LabCitation> = {
  'APL-CBC-DIFF': {
    id: 'APL-CBC-DIFF',
    source: 'Alberta Precision Laboratories CBC reference intervals',
    fullCitation:
      'Alberta Precision Laboratories. CBC and Differential Provincial Reference Intervals and Critical Values - Epic. HE02-100 Rev 3.00, June 2023.',
    url: 'https://www.albertahealthservices.ca/assets/wf/lab/if-lab-cbc-and-differential-provincial-reference-intervals-and-critical-values-epic.pdf',
    page: 'p.1-2',
    quote:
      'The CBC source provides age and sex partitions from birth through 150 years; the selected male 18-150 year interval includes WBC 4.0-11.0, RBC 4.30-6.00, Hgb 135-175, Hct 0.40-0.52, platelets 140-400, and age-matched absolute differential ranges.',
  },
  'DYN-CBC-MCH': {
    id: 'DYN-CBC-MCH',
    source: 'Dynacare CBC reference range update',
    fullCitation:
      'Dynacare. Partner Update: CBC Reference Ranges, September 28, 2016.',
    url: 'https://www.dynacare.ca/DYN/media/DYN/eng/Notices-Services/2016/Partner-Update-CBC-Reference-Ranges-EN_V2.pdf',
    page: 'CBC reference range table',
    quote:
      'Adult MCH reference interval is listed as 27-32 pg in the Canadian Dynacare CBC update.',
  },
  'APL-ESR': {
    id: 'APL-ESR',
    source: 'Alberta Precision Laboratories ESR',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Erythrocyte Sedimentation Rate.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true%2F1000&id=8733',
    quote:
      'Adult male ESR reference interval is less than or equal to 15 mm/hr.',
  },
  'APL-TOTAL-PROTEIN': {
    id: 'APL-TOTAL-PROTEIN',
    source: 'Alberta Precision Laboratories total protein',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Total Protein.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=788&tests=&zoneid=1',
    quote: 'Adult total protein reference interval is 62-82 g/L.',
  },
  'APL-ALBUMIN': {
    id: 'APL-ALBUMIN',
    source: 'Alberta Precision Laboratories albumin',
    fullCitation: 'Alberta Precision Laboratories Test Directory. Albumin.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=8601&tests=&zoneid=1',
    quote:
      'Adult albumin reference intervals vary by APL performing site; common adult intervals are 30-45 g/L or 35-50 g/L.',
  },
  'APL-GLUCOSE': {
    id: 'APL-GLUCOSE',
    source: 'Alberta Precision Laboratories glucose',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Glucose, Fasting and Glucose, Random.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9646',
    quote:
      'APL lists fasting glucose 3.3-6.0 mmol/L after 72 hours of age; random glucose reference interval is broader.',
  },
  'APL-LIPID-PANEL': {
    id: 'APL-LIPID-PANEL',
    source: 'Alberta Precision Laboratories lipid panel',
    fullCitation: 'Alberta Precision Laboratories Test Directory. Lipid Panel.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9386&tests=&zoneid=1',
    quote:
      'Adult lipid flagging limits include total cholesterol >5.20, LDL-C >=3.50, triglycerides >=1.70, and male HDL-C <1.00 mmol/L.',
  },
  'DC-LIPID-DIABETES': {
    id: 'DC-LIPID-DIABETES',
    source: 'Diabetes Canada dyslipidemia guideline',
    fullCitation:
      'Diabetes Canada Clinical Practice Guidelines Expert Committee. Dyslipidemia. Can J Diabetes 2018;42(Suppl 1):S178-S185.',
    url: 'https://guidelines.diabetes.ca/cpg/chapter25',
    page: 'Key Messages',
    quote:
      'The primary treatment goal for people with diabetes is LDL-cholesterol consistently <2.0 mmol/L or more than 50% reduction from baseline.',
  },
  'CA-SHARED-HEALTH-HBA1C': {
    id: 'CA-SHARED-HEALTH-HBA1C',
    source: 'Shared Health Manitoba Lab Information Manual HbA1c',
    fullCitation:
      'Shared Health Manitoba. Lab Information Manual: Hemoglobin A1c - (B).',
    url: 'https://apps.sbgh.mb.ca/labmanual/test/view?seedId=122',
    quote:
      'Shared Health Manitoba lists HbA1c reference values and diabetes guideline context; reuse is review-only because the manual states all rights reserved and use is subject to license terms.',
  },
  'CA-SHARED-HEALTH-HDL': {
    id: 'CA-SHARED-HEALTH-HDL',
    source: 'Shared Health Manitoba Lab Information Manual HDL cholesterol',
    fullCitation:
      'Shared Health Manitoba. Lab Information Manual: HDL Cholesterol (HDL-c) - (P).',
    url: 'https://apps.sbgh.mb.ca/labmanual/test/view?seedId=1401',
    quote:
      'Shared Health Manitoba lists pediatric and adult sex-specific HDL-C decision limits with Canadian dyslipidemia guideline context.',
  },
  'CA-LHSC-TRACE-ELEMENTS': {
    id: 'CA-LHSC-TRACE-ELEMENTS',
    source: 'London Health Sciences Centre reference ranges',
    fullCitation:
      'London Health Sciences Centre Pathology and Laboratory Medicine. Reference Ranges.',
    url: 'https://www.lhsc.on.ca/pathology-and-laboratory-medicine/reference-ranges',
    quote:
      'LHSC publishes whole blood, erythrocyte, plasma, serum, tissue, and urine reference ranges for essential and toxic trace elements.',
  },
  'CA-NORTHERN-HEALTH-DIRECTORY': {
    id: 'CA-NORTHERN-HEALTH-DIRECTORY',
    source: 'Northern Health BC laboratory services test directory',
    fullCitation:
      'Northern Health Laboratory Services. NH Laboratory Services Test Directory, Version 6.51, Revision Date 2024-07-24.',
    url: 'https://physicians.northernhealth.ca/sites/physicians/files/physician-resources/laboratory-services/documents/nh-lab-services-test-directory.pdf',
    quote:
      'Northern Health includes chemistry and hematology reference interval appendices; candidate values remain review-only pending licensing and extraction QA.',
  },
  'APL-CRP': {
    id: 'APL-CRP',
    source: 'Alberta Precision Laboratories CRP',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. C-reactive Protein.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=226&tests=&zoneid=1',
    quote:
      'CRP reference interval is method-dependent; Roche Cobas less than 8.0 mg/L and Ortho Vitros less than 10.0 mg/L.',
  },
  'APL-BILIRUBIN': {
    id: 'APL-BILIRUBIN',
    source: 'Alberta Precision Laboratories bilirubin',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Bilirubin, Total and Conjugated.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9416&tests=&zoneid=1',
    quote:
      'Adult total bilirubin reference interval is less than 20 umol/L; conjugated bilirubin is less than 7 umol/L.',
  },
  'APL-ALT': {
    id: 'APL-ALT',
    source: 'Alberta Precision Laboratories ALT',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Alanine Aminotransferase.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=8595&tests=&zoneid=1',
    quote: 'Adult male ALT reference interval is less than 70 U/L.',
  },
  'APL-AST': {
    id: 'APL-AST',
    source: 'Alberta Precision Laboratories AST',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Aspartate Aminotransferase.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=8628&tests=&zoneid=1',
    quote:
      'Adult male AST reference interval is less than 55 U/L at most APL sites, with some site-specific differences.',
  },
  'APL-ALP': {
    id: 'APL-ALP',
    source: 'Alberta Precision Laboratories ALP',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Alkaline Phosphatase.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=8618&tests=&zoneid=1',
    quote: 'Adult ALP reference interval is 40-120 U/L.',
  },
  'APL-GGT': {
    id: 'APL-GGT',
    source: 'Alberta Precision Laboratories GGT',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Gamma Glutamyl Transferase.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=8623&tests=&zoneid=1',
    quote:
      'Adult male GGT reference interval is less than 80 U/L in Connect Care and South Zone.',
  },
  'APL-AMYLASE': {
    id: 'APL-AMYLASE',
    source: 'Alberta Precision Laboratories amylase',
    fullCitation: 'Alberta Precision Laboratories Test Directory. Amylase.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=8621',
    quote:
      'Amylase reference interval is 30-110 U/L in Calgary Zone and University of Alberta Hospital, and 30-150 U/L at Edmonton Base Lab.',
  },
  'APL-UREA': {
    id: 'APL-UREA',
    source: 'Alberta Precision Laboratories urea',
    fullCitation: 'Alberta Precision Laboratories Test Directory. Urea.',
    url: 'https://www.albertahealthservices.ca/WEBAPPS/LABSERVICES/INDEXAPL.ASP?DETAILS=TRUE&ID=8835&TESTS=&ZONEID=11',
    quote:
      'Urea intervals are partitioned by age and sex; for males older than 55 years, the reference interval is 3.0-9.0 mmol/L.',
  },
  'APL-CREATININE-EGFR': {
    id: 'APL-CREATININE-EGFR',
    source: 'Alberta Precision Laboratories creatinine/eGFR',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Creatinine - Calgary Zone.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=6175&tests=&zoneid=1',
    quote:
      'Creatinine intervals are age and sex partitioned; the male interval from 15 years and older is 50-120 umol/L, and adult outpatient reports include CKD-EPI eGFR.',
  },
  'APL-URATE': {
    id: 'APL-URATE',
    source: 'Alberta Precision Laboratories urate',
    fullCitation: 'Alberta Precision Laboratories Test Directory. Urate.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=8832&tests=&zoneid=11',
    quote: 'Adult male urate reference interval is 200-500 umol/L.',
  },
  'APL-CALCIUM': {
    id: 'APL-CALCIUM',
    source: 'Alberta Precision Laboratories calcium',
    fullCitation: 'Alberta Precision Laboratories Test Directory. Calcium.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9203&tests=&zoneid=1',
    quote:
      'For patients older than 1 year, total calcium reference interval is 2.10-2.60 mmol/L.',
  },
  'APL-MAGNESIUM': {
    id: 'APL-MAGNESIUM',
    source: 'Alberta Precision Laboratories magnesium',
    fullCitation: 'Alberta Precision Laboratories Test Directory. Magnesium.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9413',
    quote: 'Magnesium reference interval is 0.70-1.00 mmol/L.',
  },
  'APL-ELECTROLYTES': {
    id: 'APL-ELECTROLYTES',
    source: 'Alberta Precision Laboratories electrolyte interval bulletin',
    fullCitation:
      'Alberta Public Laboratories. Revised Changes to Reference Intervals and Critical Values for Sodium, Potassium, Chloride, Albumin, Total Protein, Calcium, Total Bilirubin, Alkaline Phosphatase, Phosphorous and TCO2. Laboratory Bulletin, November 5, 2019.',
    url: 'https://www.albertahealthservices.ca/assets/wf/lab/wf-lab-bulletin-changes-to-reference-intervals-and-critical-values-for-na-k-cl-alb-total-protein-ca-total-bilirubin-alk-phosphatase-phosphorous-and-tco2-non-blood-gas-revision.pdf',
    page: 'p.2',
    quote:
      'Provincial adult intervals include sodium 135-145 mmol/L and potassium 3.5-5.0 mmol/L for patients age 1 year and older.',
  },
  'APL-SODIUM': {
    id: 'APL-SODIUM',
    source: 'Alberta Precision Laboratories sodium',
    fullCitation: 'Alberta Precision Laboratories Test Directory. Sodium.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=8810&tests=&zoneid=1',
    quote: 'Sodium reference interval is 135-145 mmol/L.',
  },
  'APL-POTASSIUM': {
    id: 'APL-POTASSIUM',
    source: 'Alberta Precision Laboratories potassium',
    fullCitation: 'Alberta Precision Laboratories Test Directory. Potassium.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=8809&tests=&zoneid=1',
    quote:
      'Potassium reference intervals are age-partitioned: less than 29 days 3.5-6.0, 29-364 days 3.5-5.5, and greater than 364 days 3.5-5.0 mmol/L.',
  },
  'APL-IRON-TIBC': {
    id: 'APL-IRON-TIBC',
    source: 'Alberta Precision Laboratories iron/TIBC',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Iron and TIBC.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9390',
    quote:
      'Iron reference interval is 8-35 umol/L; ferritin is preferred to screen for iron deficiency.',
  },
  'APL-FERRITIN': {
    id: 'APL-FERRITIN',
    source: 'Alberta Precision Laboratories ferritin',
    fullCitation: 'Alberta Precision Laboratories Test Directory. Ferritin.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9193&tests=&zoneid=1',
    quote:
      'For males older than 15 years, ferritin reference interval is 30-500 ug/L.',
  },
  'APL-B12': {
    id: 'APL-B12',
    source: 'Alberta Precision Laboratories vitamin B12',
    fullCitation: 'Alberta Precision Laboratories Test Directory. Vitamin B12.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9188&tests=&zoneid=1',
    quote:
      'Vitamin B12 intervals are age partitioned; patients younger than 10 years use >=250 pmol/L and patients 10 years or older use >=160 pmol/L.',
  },
  'APL-VITAMIN-D': {
    id: 'APL-VITAMIN-D',
    source: 'Alberta Precision Laboratories vitamin D',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. 25-Hydroxy Vitamin D.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9034',
    quote:
      '25-hydroxy vitamin D reference interval is 50-200 nmol/L; less than 25 is severe deficiency and greater than 200 is possible toxicity.',
  },
  'APL-URINALYSIS': {
    id: 'APL-URINALYSIS',
    source: 'Alberta Precision Laboratories urinalysis',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Urinalysis - Calgary Zone.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true%2F1000&id=6795',
    quote:
      'Macroscopic urinalysis intervals include clear/yellow urine, specific gravity 1.005-1.030, pH 5.0-8.0, and negative blood, protein, glucose, ketones, nitrite, and leukocyte esterase; microscopic WBC is 0-5/hpf and RBC 0-2/hpf.',
  },
  'APL-URINE-ACR': {
    id: 'APL-URINE-ACR',
    source: 'Alberta Precision Laboratories urine ACR',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Albumin, Urine, Timed; Albumin/Creatinine Ratio.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9459&tests=&zoneid=1',
    quote:
      'For age 2 years and older, urine albumin/creatinine ratio reference interval is less than 3.0 mg/mmol; random urine albumin and creatinine do not have separate reference intervals due to diurnal variation.',
  },
  'APL-THYROID': {
    id: 'APL-THYROID',
    source: 'APL thyroid hormone reference interval update',
    fullCitation:
      'Alberta Precision Laboratories and DynaLIFE Medical Labs. Update to thyroid hormone reference intervals and to the progressive TSH algorithm. Laboratory Bulletin, June 13, 2022.',
    url: 'https://www.albertahealthservices.ca/assets/wf/lab/if-lab-hp-bulletin-update-to-thyroid-hormone-reference-intervals-and-to-the-progressive-tsh-algorithm.pdf',
    page: 'Appendices A-C',
    quote:
      'The bulletin lists pediatric and adult intervals for TSH, free T4, and free T3, including TSH >=1 year 0.20-6.50, FT4 >=30 days 10.0-25.0, and FT3 >=18 years 3.0-6.5.',
  },
  'APL-TPO': {
    id: 'APL-TPO',
    source: 'APL endocrine test update',
    fullCitation:
      'Alberta Precision Laboratories. Changes and Updates to Endocrine Tests. Laboratory Bulletin, March 21, 2022.',
    url: 'https://www.albertahealthservices.ca/assets/wf/lab/if-lab-hp-bulletin-changes-and-updates-to-endocrine-tests.pdf',
    quote:
      'Anti-thyroid peroxidase reference interval changed to less than 35 kIU/L to reflect current methodology.',
  },
  'APL-FSH': {
    id: 'APL-FSH',
    source: 'Alberta Precision Laboratories FSH',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Follicle Stimulating Hormone.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9129&tests=&zoneid=1',
    quote:
      'FSH intervals are age, sex, and site partitioned; at sites other than Edmonton Base Lab, males 13 years and older use 1.0-18.0 IU/L.',
  },
  'APL-LH': {
    id: 'APL-LH',
    source: 'Alberta Precision Laboratories LH',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Luteinizing Hormone.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9128',
    quote:
      'LH intervals are age, sex, and site partitioned; at sites other than Edmonton Base Lab, males 70 years and older use 3.0-35.0 IU/L.',
  },
  'APL-ESTRADIOL': {
    id: 'APL-ESTRADIOL',
    source: 'Alberta Precision Laboratories estradiol',
    fullCitation: 'Alberta Precision Laboratories Test Directory. Estradiol.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=8929&tests=&zoneid=1',
    quote:
      'For males age 10 years or older, estradiol reference interval is less than 160 pmol/L.',
  },
  'APL-TESTOSTERONE': {
    id: 'APL-TESTOSTERONE',
    source: 'Alberta Precision Laboratories testosterone',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Testosterone, Total.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=8932',
    quote:
      'For males 18 years or older, total testosterone reference interval is 8.0-35.0 nmol/L; values are highest in the morning.',
  },
  'APL-PROLACTIN': {
    id: 'APL-PROLACTIN',
    source: 'Alberta Precision Laboratories prolactin',
    fullCitation: 'Alberta Precision Laboratories Test Directory. Prolactin.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9116&tests=&zoneid=1',
    quote:
      'Adult male prolactin reference interval is less than 21 ug/L at Edmonton Base Lab or 4.0-15.0 ug/L at other sites.',
  },
  'APL-INR': {
    id: 'APL-INR',
    source: 'Alberta Precision Laboratories INR',
    fullCitation: 'Alberta Precision Laboratories Test Directory. INR.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=8764&tests=&zoneid=1',
    quote:
      'INR reference interval is 0.8-1.2; prothrombin time is reported in INR.',
  },
  'APL-PTT': {
    id: 'APL-PTT',
    source: 'APL PTT reference interval bulletin',
    fullCitation:
      'Alberta Public Laboratories. Activated Partial Thromboplastin Time (PTT) Reference Interval Adjustment. Laboratory Bulletin, July 2, 2019.',
    url: 'https://www.albertahealthservices.ca/assets/wf/lab/wf-lab-bulletin-activated-partial-thromboplastin-tim-ptt-reference-interval-adjustment.pdf',
    quote:
      'Effective July 9, 2019, Calgary Zone PTT reference interval was adjusted to 28.0-38.0 seconds.',
  },
  'APL-FIBRINOGEN': {
    id: 'APL-FIBRINOGEN',
    source: 'Alberta Precision Laboratories fibrinogen',
    fullCitation: 'Alberta Precision Laboratories Test Directory. Fibrinogen.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=8806',
    quote: 'Fibrinogen reference interval is 2.0-4.0 g/L.',
  },
  'APL-AFP': {
    id: 'APL-AFP',
    source: 'Alberta Precision Laboratories AFP',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Alpha Fetoprotein.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9589&tests=&zoneid=1',
    quote:
      'Non-pregnant AFP reference interval is less than 9 ug/L; values may be higher in children under 1 year.',
  },
  'APL-CEA': {
    id: 'APL-CEA',
    source: 'Alberta Precision Laboratories CEA',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Carcinoembryonic Antigen.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=9177',
    quote:
      'CEA reference interval is 0.0-5.0 ug/L, and CEA should not be used for screening or as a primary diagnostic test.',
  },
  'APL-PSA': {
    id: 'APL-PSA',
    source: 'Alberta Precision Laboratories PSA',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Prostate Specific Antigen, Total.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp?details=true&id=7220',
    quote:
      'Male PSA intervals are age partitioned: 1 day-49 years, 50-59, 60-69, and 70-150 years; the selected 70-150 year interval is 0.0-6.5 ug/L.',
  },
  'APL-HBA1C': {
    id: 'APL-HBA1C',
    source: 'Alberta Precision Laboratories HbA1c',
    fullCitation:
      'Alberta Precision Laboratories Test Directory. Hemoglobin A1C.',
    url: 'https://www.albertahealthservices.ca/webapps/labservices/indexAPL.asp%3Fid%3D9520%26tests%3D%26zoneid%3D1%26details%3Dtrue',
    quote:
      'HbA1c reference interval is 4.3-5.9%; APL notes Diabetes Canada interpretation, including prediabetes at 6.0-6.4% and diabetes at >6.5%.',
  },
};
