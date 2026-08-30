#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { strToU8, zipSync } from 'fflate';

const FORMAT_NAME = 'mere-emr-package';
const FORMAT_VERSION = 1;

/**
 * Code tables live above the transposition loops on purpose. They are `const`,
 * so they sit in the temporal dead zone until this point in module evaluation —
 * and the loops below call `labObservationCode()` / `vitalObservationCode()`
 * while building rows. Declared after the loops (as LAB_LOINC was), the very
 * first lab result throws `ReferenceError: Cannot access 'LAB_LOINC' before
 * initialization` and no package is ever written.
 */

const LAB_LOINC = {
  // CBC
  'white blood cells': ['6690-2', 'Leukocytes [#/volume] in Blood'],
  'red blood cells': ['789-8', 'Erythrocytes [#/volume] in Blood'],
  hemoglobin: ['718-7', 'Hemoglobin [Mass/volume] in Blood'],
  hematocrit: ['4544-3', 'Hematocrit [Volume Fraction] of Blood'],
  mcv: ['787-2', 'MCV'],
  mch: ['785-6', 'MCH'],
  mchc: ['786-4', 'MCHC'],
  'rdw-cv': ['788-0', 'Erythrocyte distribution width [Ratio]'],
  platelets: ['777-3', 'Platelets [#/volume] in Blood'],
  pdw: ['32207-3', 'Platelet distribution width'],
  mpv: ['32623-1', 'Platelet mean volume'],
  neutrophils: ['770-8', 'Neutrophils/100 leukocytes'],
  'neutrophils absolute': ['751-8', 'Neutrophils [#/volume] in Blood'],
  eosinophils: ['713-8', 'Eosinophils/100 leukocytes'],
  'eosinophils absolute': ['711-2', 'Eosinophils [#/volume] in Blood'],
  basophils: ['706-2', 'Basophils/100 leukocytes'],
  'basophils absolute': ['704-7', 'Basophils [#/volume] in Blood'],
  lymphocytes: ['736-9', 'Lymphocytes/100 leukocytes'],
  'lymphocytes absolute': ['731-0', 'Lymphocytes [#/volume] in Blood'],
  monocytes: ['5905-5', 'Monocytes/100 leukocytes'],
  'monocytes absolute': ['742-7', 'Monocytes [#/volume] in Blood'],
  // Chemistry
  creatinine: ['2160-0', 'Creatinine [Mass/volume] in Serum or Plasma'],
  potassium: ['2823-3', 'Potassium [Moles/volume] in Serum or Plasma'],
  sodium: ['2951-2', 'Sodium [Moles/volume] in Serum or Plasma'],
  chloride: ['2075-0', 'Chloride [Moles/volume] in Serum or Plasma'],
  co2: ['2028-9', 'Carbon dioxide, total [Moles/volume] in Serum or Plasma'],
  urea: ['22664-7', 'Urea [Moles/volume] in Serum or Plasma'],
  'anion gap': ['33037-3', 'Anion gap in Serum or Plasma'],
  'egfr (ckd-epi)': ['62238-1', 'GFR/1.73 sq M.predicted'],
  'total protein': ['2885-2', 'Protein [Mass/volume] in Serum or Plasma'],
  albumin: ['1751-7', 'Albumin [Mass/volume] in Serum or Plasma'],
  glucose: ['2345-7', 'Glucose [Mass/volume] in Serum or Plasma'],
  calcium: ['17861-6', 'Calcium [Mass/volume] in Serum or Plasma'],
  magnesium: ['19123-9', 'Magnesium [Mass/volume] in Serum or Plasma'],
  'uric acid': ['3084-1', 'Urate [Mass/volume] in Serum or Plasma'],
  ferritin: ['2276-4', 'Ferritin [Mass/volume] in Serum or Plasma'],
  iron: ['2498-4', 'Iron [Mass/volume] in Serum or Plasma'],
  'alt/gpt': ['1742-6', 'Alanine aminotransferase'],
  'ast/got': ['1920-8', 'Aspartate aminotransferase'],
  'alkaline phosphatase': ['6768-6', 'Alkaline phosphatase'],
  ggt: ['2324-2', 'Gamma glutamyl transferase'],
  'pancreatic amylase': ['1798-8', 'Amylase'],
  'bilirubin total': ['1975-2', 'Bilirubin.total'],
  'bilirubin direct': ['1968-7', 'Bilirubin.direct'],
  'bilirubin indirect': ['1971-1', 'Bilirubin.indirect'],
  'c-reactive protein': ['1988-5', 'C reactive protein'],
  // Lipids
  'total cholesterol': ['2093-3', 'Cholesterol [Mass/volume]'],
  'hdl cholesterol': ['2085-9', 'Cholesterol in HDL'],
  'ldl cholesterol': ['13457-7', 'Cholesterol in LDL (calc)'],
  triglycerides: ['2571-8', 'Triglyceride [Mass/volume]'],
  triacylglycerol: ['2571-8', 'Triglyceride [Mass/volume]'],
  'non-hdl cholesterol': ['43396-1', 'Cholesterol non HDL [Mass/volume]'],
  // Diabetes
  'glycated hemoglobin hba1c': ['4548-4', 'Hemoglobin A1c/Hemoglobin.total'],
  'glycated hemoglobin (hba1c)': ['4548-4', 'Hemoglobin A1c/Hemoglobin.total'],
  insulin: ['20448-7', 'Insulin [Units/volume] in Serum or Plasma'],
  'c-peptide': ['1986-9', 'C peptide [Mass/volume] in Serum or Plasma'],
  'c - peptide': ['1986-9', 'C peptide [Mass/volume] in Serum or Plasma'],
  // Vitamins / hormones
  'vitamin b12': ['2132-9', 'Cobalamin (Vitamin B12)'],
  'cyanocobalamine (vitamin b12)': ['2132-9', 'Cobalamin (Vitamin B12)'],
  '25-hydroxyvitamin d': ['1989-3', '25-hydroxyvitamin D'],
  tsh: ['3016-3', 'Thyrotropin [Units/volume] in Serum or Plasma'],
  'thyroid stimulating hormone (tsh)': ['3016-3', 'Thyrotropin'],
  'thyroid stimulating hormone': ['3016-3', 'Thyrotropin'],
  'free thyroxine (ft4)': ['3024-7', 'Thyroxine (T4) free'],
  'free thyroxine': ['3024-7', 'Thyroxine (T4) free'],
  'free triiodothyronine (ft3)': ['3051-0', 'Triiodothyronine (T3) free'],
  'free triiodothyronine': ['3051-0', 'Triiodothyronine (T3) free'],
  estradiol: ['2243-4', 'Estradiol (E2)'],
  prolactin: ['2842-3', 'Prolactin'],
  'total testosterone': ['2986-8', 'Testosterone'],
  'follicle - stimulating hormone (fsh)': ['15067-2', 'Follitropin (FSH)'],
  'follicle-stimulating hormone (fsh)': ['15067-2', 'Follitropin (FSH)'],
  'luteinizing hormone (lh)': ['10501-5', 'Lutropin (LH)'],
  'luteinizing hormone': ['10501-5', 'Lutropin (LH)'],
  'anti-thyroid peroxidase antibodies': ['8099-8', 'Thyroid peroxidase Ab'],
  // Coagulation
  inr: ['6301-6', 'INR in Platelet poor plasma'],
  'quick index': ['5894-1', 'Prothrombin time (Quick)'],
  'prothrombin time': ['5902-2', 'Prothrombin time (PT)'],
  'activated partial thromboplastin time aptt': ['3173-2', 'aPTT'],
  'activated partial thromboplastin time (aptt)': ['3173-2', 'aPTT'],
  fibrinogen: ['3255-7', 'Fibrinogen [Mass/volume]'],
  'thrombin time': ['3243-3', 'Thrombin time'],
  // Tumour markers
  'alpha-fetoprotein afp': ['1834-1', 'Alpha-1-Fetoprotein'],
  'alpha-fetoprotein (afp)': ['1834-1', 'Alpha-1-Fetoprotein'],
  'carcinoembryonic antigen cea': ['2039-6', 'Carcinoembryonic Ag'],
  'carcinoembryonic antigen (cea)': ['2039-6', 'Carcinoembryonic Ag'],
  'prostate-specific antigen total': ['2857-1', 'PSA [Mass/volume]'],
  'prostate specific antigen total psa': ['2857-1', 'PSA [Mass/volume]'],
  'prostate-specific antigen free': ['10886-0', 'PSA Free [Mass/volume]'],
  'index of free psa': ['12841-3', 'PSA Free/PSA total'],
  // Blood group
  'blood type': ['883-9', 'ABO group'],
  'rhesus (d)': ['10331-7', 'Rh type'],
  // Urinalysis
  'urine color': ['5778-6', 'Color of Urine'],
  color: ['5778-6', 'Color of Urine'],
  'urine specific gravity': ['5811-5', 'Specific gravity of Urine'],
  'specific gravity': ['5811-5', 'Specific gravity of Urine'],
  'reaction (ph)': ['5803-2', 'pH of Urine'],
  ketones: ['5797-6', 'Ketones [Mass/volume] in Urine'],
  urobilinogen: ['5818-0', 'Urobilinogen [Mass/volume] in Urine'],
  nitrite: ['5802-4', 'Nitrite [Presence] in Urine'],
};

const VITAL_LOINC = {
  'blood pressure': ['85354-9', 'Blood pressure panel'],
  'systolic blood pressure': ['8480-6', 'Systolic blood pressure'],
  'diastolic blood pressure': ['8462-4', 'Diastolic blood pressure'],
  'heart rate': ['8867-4', 'Heart rate'],
  pulse: ['8867-4', 'Heart rate'],
  'respiratory rate': ['9279-1', 'Respiratory rate'],
  'body temperature': ['8310-5', 'Body temperature'],
  temperature: ['8310-5', 'Body temperature'],
  'oxygen saturation': ['2708-6', 'Oxygen saturation in Arterial blood'],
  spo2: ['2708-6', 'Oxygen saturation in Arterial blood'],
  'body weight': ['29463-7', 'Body weight'],
  weight: ['29463-7', 'Body weight'],
  'body height': ['8302-2', 'Body height'],
  height: ['8302-2', 'Body height'],
  'body mass index': ['39156-5', 'Body mass index (BMI) [Ratio]'],
  bmi: ['39156-5', 'Body mass index (BMI) [Ratio]'],
};
const args = parseArgs(process.argv.slice(2));

if (!args.source || !args.output) {
  console.error(`Usage:
  node tools/build-diabetes-records-emrpkg.mjs \\
    --source /path/to/medicalRecords.json \\
    --output /path/to/profile.emrpkg \\
    [--assets-dir /path/to/source/files] \\
    [--first-name First] [--last-name Last] [--profile-id stable-id] \\
    [--app-version label]

This tool reads a local medicalRecords.json file and writes a Mere .emrpkg.
It does not contain patient data unless you explicitly pass a source file.`);
  process.exit(1);
}

const sourcePath = resolve(args.source);
const outputPath = resolve(args.output);
const records = JSON.parse(readFileSync(sourcePath, 'utf8'));
const now = Date.now();
const assetsDir = args.assetsDir
  ? resolve(args.assetsDir)
  : records.audit?.sourceDirectory && existsSync(records.audit.sourceDirectory)
    ? records.audit.sourceDirectory
    : undefined;
const sourceAssetIndex = buildSourceAssetIndex(assetsDir);

const profileId = stableId(args.profileId || `manual-profile-${now}`);
const userId = `manual-patient-${profileId}`;
const connectionId = `manual-connection-${profileId}`;

const user = {
  id: userId,
  is_selected_user: true,
  is_default_user: false,
  first_name: args.firstName || 'Imported',
  last_name: args.lastName || 'Patient',
  birthday: records.subject?.dateOfBirth
    ? `${records.subject.dateOfBirth}T00:00:00.000Z`
    : undefined,
  gender: records.subject?.sex || 'unknown',
  _meta: { lwt: now },
  _deleted: false,
};

const connection = {
  id: connectionId,
  user_id: userId,
  source: 'manual',
  location: `manual://${profileId}`,
  name: args.connectionName || 'Imported manual records',
  access_token: '',
  expires_at: 0,
  _meta: { lwt: now },
  _deleted: false,
};

const clinicalDocuments = [];
const sourceDocumentsByKey = new Map();

for (const panel of records.labPanels || []) {
  const sourceDocument = getOrCreateSourceDocument({
    sourceImage: panel.sourceImage,
    date: panel.collectedAt,
    title: panel.title,
    provider: panel.provider,
    audit: panel.audit,
  });
  const resultRefs = [];
  for (const result of panel.results || []) {
    const observationId = stableId(`lab-${panel.id}-${result.id}`);
    resultRefs.push({ reference: `Observation/${observationId}` });
    const nutritionRelevance = nutritionRelevanceForLab(result);
    const labLoinc = labObservationCode(result.name);
    clinicalDocuments.push(
      clinicalDocument({
        id: observationId,
        resourceType: 'observation',
        date: panel.collectedAt,
        displayName: result.shortName || result.name,
        raw: {
          fullUrl: `manual:${observationId}`,
          manual_kind: 'lab',
          source_panel_id: panel.id,
          source_image: panel.sourceImage,
          audit: panel.audit,
          resource: {
            resourceType: 'Observation',
            id: observationId,
            status: 'final',
            category: { text: panel.title },
            code: buildObservationCode(result),
            effectiveDateTime: atNoon(panel.collectedAt),
            issued: atNoon(panel.collectedAt),
            ...observationValue(result.value, result.unit),
            referenceRange: buildReferenceRange(result),
            extension: buildLabExtensions(result, nutritionRelevance),
            interpretation:
              result.flag && result.flag !== 'identity'
                ? { text: result.flag }
                : undefined,
            note: buildNotes([
              `Provider: ${panel.provider}`,
              `Source: ${panel.sourceImage}`,
              sourceDocument
                ? `Source document: ${sourceDocument.documentReferenceId}`
                : undefined,
              result.note,
              result.referenceCitationId
                ? `Reference citation: ${result.referenceCitationId}`
                : undefined,
              result.referenceAgeBand
                ? `Reference age band: ${result.referenceAgeBand}`
                : undefined,
              result.referenceNote,
              result.originalReferenceRange
                ? `Original reference range: ${result.originalReferenceRange}`
                : undefined,
              result.originalFlag
                ? `Original flag: ${result.originalFlag}`
                : undefined,
            ]),
          },
        },
        metadata: {
          manual_specialty: 'laboratory',
          source_panel_id: panel.id,
          source_result_id: result.id,
          loinc_coding: labLoinc ? [labLoinc.code] : [],
          manual_uncoded: !labLoinc,
          ...sourceMeta(sourceDocument),
        },
      }),
    );

    if (nutritionRelevance) {
      const nutritionId = stableId(
        `nutrition-relevance-${panel.id}-${result.id}`,
      );
      clinicalDocuments.push(
        clinicalDocument({
          id: nutritionId,
          resourceType: 'observation',
          date: panel.collectedAt,
          displayName: `${nutritionRelevance.display} nutrition relevance`,
          raw: {
            fullUrl: `manual:${nutritionId}`,
            manual_kind: 'nutrition-relevance',
            source_panel_id: panel.id,
            source_observation_id: observationId,
            source_image: panel.sourceImage,
            audit: panel.audit,
            resource: {
              resourceType: 'Observation',
              id: nutritionId,
              status: 'final',
              category: {
                text: 'Nutrition relevance',
                coding: [
                  {
                    system:
                      'https://mere.health/fhir/CodeSystem/observation-category',
                    code: 'nutrition-relevance',
                    display: 'Nutrition relevance',
                  },
                ],
              },
              code: {
                text: `${nutritionRelevance.display} nutrition relevance`,
                coding: [
                  {
                    system:
                      'https://mere.health/fhir/CodeSystem/nutrition-relevance',
                    code: nutritionRelevance.code,
                    display: nutritionRelevance.display,
                  },
                ],
              },
              effectiveDateTime: atNoon(panel.collectedAt),
              issued: atNoon(panel.collectedAt),
              valueString: nutritionRelevance.text,
              derivedFrom: [{ reference: `Observation/${observationId}` }],
              extension: [
                {
                  url: 'https://mere.health/fhir/StructureDefinition/nutrient',
                  valueCodeableConcept: {
                    text: nutritionRelevance.display,
                    coding: [nutritionRelevance.coding],
                  },
                },
                {
                  url: 'https://mere.health/fhir/StructureDefinition/not-medication-evidence',
                  valueBoolean: true,
                },
              ],
              note: buildNotes([
                'Lab-linked nutrition marker only; this does not assert that the patient takes a supplement.',
                `Source lab: ${result.name}`,
                `Source value: ${formatValueWithUnit(result.value, result.unit)}`,
              ]),
            },
          },
          metadata: {
            source_panel_id: panel.id,
            source_result_id: result.id,
            nutrition_relevance: nutritionRelevance.code,
            ...sourceMeta(sourceDocument),
          },
        }),
      );
    }
  }

  const reportId = stableId(`lab-panel-${panel.id}`);
  clinicalDocuments.push(
    clinicalDocument({
      id: reportId,
      resourceType: 'diagnosticreport',
      date: panel.collectedAt,
      displayName: panel.title,
      raw: {
        fullUrl: `manual:${reportId}`,
        manual_kind: 'lab-panel',
        source_image: panel.sourceImage,
        audit: panel.audit,
        resource: {
          resourceType: 'DiagnosticReport',
          id: reportId,
          status: 'final',
          code: { text: panel.title },
          effectiveDateTime: atNoon(panel.collectedAt),
          issued: atNoon(panel.collectedAt),
          performer: [{ display: panel.provider }],
          result: resultRefs,
          presentedForm: sourceDocument ? [sourceDocument.attachment] : undefined,
          text: {
            status: 'generated',
            div: [
              `Provider: ${panel.provider}`,
              `Source: ${panel.sourceImage}`,
              auditText(panel.audit),
            ]
              .filter(Boolean)
              .join('\n'),
          },
        },
      },
      metadata: { ...sourceMeta(sourceDocument) },
    }),
  );
}

for (const report of records.imagingReports || []) {
  const reportId = stableId(`imaging-${report.id}`);
  const sourceDocument = getOrCreateSourceDocument({
    sourceImage: report.sourceImage,
    date: report.studyDate,
    title: report.title,
    provider: report.provider,
    audit: report.audit,
  });
  const imagingFindingRefs = [];
  for (const finding of extractImagingFindings(report)) {
    const findingId = stableId(`imaging-finding-${report.id}-${finding.id}`);
    imagingFindingRefs.push({ reference: `Observation/${findingId}` });
    clinicalDocuments.push(
      clinicalDocument({
        id: findingId,
        resourceType: 'observation',
        date: report.studyDate,
        displayName: finding.label,
        raw: {
          fullUrl: `manual:${findingId}`,
          manual_kind: 'imaging-finding',
          source_report_id: report.id,
          source_image: report.sourceImage,
          audit: report.audit,
          resource: {
            resourceType: 'Observation',
            id: findingId,
            status: 'final',
            category: { text: 'Imaging finding' },
            code: {
              text: finding.label,
              coding: finding.code
                ? [
                    {
                      system: finding.code.system,
                      code: finding.code.code,
                      display: finding.code.display,
                    },
                  ]
                : undefined,
            },
            bodySite: finding.bodySite
              ? {
                  text: finding.bodySite,
                  coding: finding.bodySiteCode
                    ? [
                        {
                          system: finding.bodySiteCode.system,
                          code: finding.bodySiteCode.code,
                          display: finding.bodySiteCode.display,
                        },
                      ]
                    : undefined,
                }
              : undefined,
            effectiveDateTime: atNoon(report.studyDate),
            issued: atNoon(report.studyDate),
            ...observationValue(finding.value, finding.unit),
            derivedFrom: [{ reference: `DiagnosticReport/${reportId}` }],
            note: buildNotes([
              finding.sourceText,
              sourceDocument
                ? `Source document: ${sourceDocument.documentReferenceId}`
                : undefined,
            ]),
          },
        },
        metadata: {
          source_report_id: report.id,
          imaging_finding_category: finding.category,
          ...sourceMeta(sourceDocument),
        },
      }),
    );
  }

  clinicalDocuments.push(
    clinicalDocument({
      id: reportId,
      resourceType: 'diagnosticreport',
      date: report.studyDate,
      displayName: report.title,
      raw: {
        fullUrl: `manual:${reportId}`,
        manual_kind: 'imaging',
        source_image: report.sourceImage,
        audit: report.audit,
        resource: {
          resourceType: 'DiagnosticReport',
          id: reportId,
          status: 'final',
          code: { text: report.title },
          effectiveDateTime: atNoon(report.studyDate),
          issued: atNoon(report.studyDate),
          performer: [{ display: report.provider }],
          result: imagingFindingRefs,
          presentedForm: sourceDocument ? [sourceDocument.attachment] : undefined,
          conclusion: report.findings?.join('\n'),
          extension: [
            {
              url: 'https://mere.health/fhir/StructureDefinition/imaging-findings',
              extension: extractImagingFindings(report).map((finding) =>
                imagingFindingExtension(finding),
              ),
            },
          ],
          text: {
            status: 'generated',
            div: buildReportText([
              `Provider: ${report.provider}`,
              `Source: ${report.sourceImage}`,
              report.note,
              auditText(report.audit),
              ...(report.findings || []),
            ]),
          },
        },
      },
      metadata: { ...sourceMeta(sourceDocument) },
    }),
  );
}

for (const group of records.medicationPlans || []) {
  const sourceDocument = getOrCreateSourceDocument({
    sourceImage: group.sourceImage,
    date: group.encounterDate,
    title: group.title,
    provider: group.provider,
    audit: group.audit,
  });
  const medicationListEntries = [];
  for (const item of group.items || []) {
    const medicationId = stableId(`medication-${group.id}-${item.id}`);
    medicationListEntries.push({
      item: { reference: `MedicationStatement/${medicationId}` },
    });
    clinicalDocuments.push(
      clinicalDocument({
        id: medicationId,
        resourceType: 'medicationstatement',
        date: item.assignedDate || group.encounterDate,
        displayName: item.medication,
        raw: {
          fullUrl: `manual:${medicationId}`,
          manual_kind: 'medicationstatement',
          source_image: item.sourceImage || group.sourceImage,
          audit: group.audit,
          resource: {
            resourceType: 'MedicationStatement',
            id: medicationId,
            status: mapMedicationStatus(item.status),
            category: {
              text: inferMedicationCategory(item).display,
              coding: [inferMedicationCategory(item)],
            },
            effectivePeriod: buildMedicationEffectivePeriod(item, group),
            informationSource: buildMedicationInformationSource(item, group),
            medicationCodeableConcept: buildMedicationCode(item.medication),
            reasonCode: buildMedicationReason(item),
            statusReason: buildMedicationStatusReason(item),
            extension: buildMedicationExtensions(item, group),
            dosage: [
              {
                text: item.dose,
                route: item.route ? { text: item.route } : undefined,
                timing: item.frequency
                  ? { code: { text: item.frequency } }
                  : undefined,
              },
            ],
            note: buildNotes([
              `Plan: ${group.title}`,
              `Provider: ${group.provider}`,
              `Source section: ${item.sourceSection}`,
              `Plan status: ${item.status}`,
              stopReason(item) ? `Stop reason: ${stopReason(item)}` : undefined,
              conditionalInstruction(item)
                ? `Conditional instruction: ${conditionalInstruction(item)}`
                : undefined,
              item.plannerImplication,
              item.note,
              sourceDocument
                ? `Source document: ${sourceDocument.documentReferenceId}`
                : undefined,
              ...(item.mappedTo || []).map((target) => `Mapped to: ${target}`),
            ]),
          },
        },
        metadata: { ...sourceMeta(sourceDocument) },
      }),
    );
  }

  if (medicationListEntries.length) {
    const listId = stableId(`medication-reconciliation-list-${group.id}`);
    clinicalDocuments.push(
      clinicalDocument({
        id: listId,
        resourceType: 'list',
        date: group.encounterDate,
        displayName: `${group.title} medication reconciliation`,
        raw: {
          fullUrl: `manual:${listId}`,
          manual_kind: 'medication-reconciliation-list',
          source_image: group.sourceImage,
          audit: group.audit,
          resource: {
            resourceType: 'List',
            id: listId,
            status: 'current',
            mode: 'working',
            title: `${group.title} medication reconciliation`,
            date: atNoon(group.encounterDate),
            source: buildMedicationInformationSource(undefined, group),
            code: {
              text: 'Medication reconciliation list',
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '10160-0',
                  display: 'History of Medication use Narrative',
                },
              ],
            },
            entry: medicationListEntries,
            note: buildNotes([
              `Provider: ${group.provider}`,
              `Source: ${group.sourceImage}`,
              auditText(group.audit),
              ...(group.planSummary || []).map((item) => `Plan: ${item}`),
            ]),
          },
        },
        metadata: { ...sourceMeta(sourceDocument) },
      }),
    );
  }
}

for (const encounter of records.clinicalEncounters || []) {
  const encounterId = stableId(`encounter-${encounter.id}`);
  const sourceDocument = getOrCreateSourceDocument({
    sourceImage: encounter.sourceImage,
    date: encounter.encounterDate,
    title: encounter.title,
    provider: encounter.provider,
    audit: encounter.audit,
  });
  clinicalDocuments.push(
    clinicalDocument({
      id: encounterId,
      resourceType: 'encounter',
      date: encounter.encounterDate,
      displayName: encounter.title,
      raw: {
        fullUrl: `manual:${encounterId}`,
        manual_kind: 'encounter',
        source_image: encounter.sourceImage,
        audit: encounter.audit,
        resource: {
          resourceType: 'Encounter',
          id: encounterId,
          status: 'finished',
          class: 'manual',
          type: [{ text: encounter.title }],
          period: { start: atNoon(encounter.encounterDate) },
          location: [{ location: { display: encounter.provider } }],
          text: {
            status: 'generated',
            div: buildReportText([
              `Provider: ${encounter.provider}`,
              `Source: ${encounter.sourceImage}`,
              auditText(encounter.audit),
              ...(encounter.sections || []).flatMap((section) => [
                section.title,
                ...(section.items || []),
              ]),
            ]),
          },
          note: buildNotes(
            (encounter.sections || []).flatMap((section) => [
              section.title,
              ...(section.items || []).map((item) => `- ${item}`),
            ]).concat(
              sourceDocument
                ? [`Source document: ${sourceDocument.documentReferenceId}`]
                : [],
            ),
          ),
        },
      },
      metadata: { ...sourceMeta(sourceDocument) },
    }),
  );
}

for (const condition of records.conditions || []) {
  const conditionId = stableId(`condition-${condition.id}`);
  const conditionDate =
    condition.onsetDate || condition.recordedDate || condition.date;
  const sourceDocument = getOrCreateSourceDocument({
    sourceImage: condition.sourceImage,
    date: conditionDate,
    title: condition.name,
    provider: condition.provider,
    audit: condition.audit,
  });
  clinicalDocuments.push(
    clinicalDocument({
      id: conditionId,
      resourceType: 'condition',
      date: conditionDate,
      displayName: condition.name,
      raw: {
        fullUrl: `manual:${conditionId}`,
        manual_kind: 'condition',
        source_image: condition.sourceImage,
        audit: condition.audit,
        resource: {
          resourceType: 'Condition',
          id: conditionId,
          clinicalStatus: condition.clinicalStatus || 'active',
          verificationStatus: condition.verificationStatus || 'confirmed',
          category: condition.category
            ? { text: condition.category }
            : undefined,
          code: {
            text: condition.name,
            coding: condition.code ? [condition.code] : undefined,
          },
          onsetDateTime: condition.onsetDate
            ? atNoon(condition.onsetDate)
            : undefined,
          dateRecorded: condition.recordedDate
            ? atNoon(condition.recordedDate)
            : undefined,
          note: buildNotes([
            condition.provider ? `Provider: ${condition.provider}` : undefined,
            condition.sourceImage
              ? `Source: ${condition.sourceImage}`
              : undefined,
            condition.note,
            sourceDocument
              ? `Source document: ${sourceDocument.documentReferenceId}`
              : undefined,
          ]),
        },
      },
      metadata: { ...sourceMeta(sourceDocument) },
    }),
  );
}

for (const allergy of records.allergies || []) {
  const allergyId = stableId(`allergy-${allergy.id}`);
  const allergyDate = allergy.recordedDate || allergy.date;
  const sourceDocument = getOrCreateSourceDocument({
    sourceImage: allergy.sourceImage,
    date: allergyDate,
    title: allergy.substance,
    provider: allergy.provider,
    audit: allergy.audit,
  });
  clinicalDocuments.push(
    clinicalDocument({
      id: allergyId,
      resourceType: 'allergyintolerance',
      date: allergyDate,
      displayName: allergy.substance,
      raw: {
        fullUrl: `manual:${allergyId}`,
        manual_kind: 'allergyintolerance',
        source_image: allergy.sourceImage,
        audit: allergy.audit,
        resource: {
          resourceType: 'AllergyIntolerance',
          id: allergyId,
          status: allergy.status || 'active',
          criticality: allergy.criticality,
          recordedDate: allergyDate ? atNoon(allergyDate) : undefined,
          substance: {
            text: allergy.substance,
            coding: allergy.code ? [allergy.code] : undefined,
          },
          reaction: allergy.reaction
            ? [
                {
                  manifestation: [
                    { text: allergy.reaction.manifestation || allergy.reaction },
                  ],
                  severity: allergy.reaction.severity,
                },
              ]
            : undefined,
          note: buildNotes([
            allergy.provider ? `Provider: ${allergy.provider}` : undefined,
            allergy.sourceImage ? `Source: ${allergy.sourceImage}` : undefined,
            allergy.note,
            sourceDocument
              ? `Source document: ${sourceDocument.documentReferenceId}`
              : undefined,
          ]),
        },
      },
      metadata: { ...sourceMeta(sourceDocument) },
    }),
  );
}

for (const family of records.familyHistory || []) {
  const familyId = stableId(`family-history-${family.id}`);
  const familyDate = family.recordedDate || family.date;
  const familyConditions = family.conditions || (family.condition ? [family.condition] : []);
  const sourceDocument = getOrCreateSourceDocument({
    sourceImage: family.sourceImage,
    date: familyDate,
    title: family.relationship,
    provider: family.provider,
    audit: family.audit,
  });
  const displayName =
    family.title ||
    [family.relationship, familyConditions.join(', ')]
      .filter(Boolean)
      .join(' - ') ||
    'Family history';
  clinicalDocuments.push(
    clinicalDocument({
      id: familyId,
      resourceType: 'familymemberhistory',
      date: familyDate,
      displayName,
      raw: {
        fullUrl: `manual:${familyId}`,
        manual_kind: 'familymemberhistory',
        source_image: family.sourceImage,
        audit: family.audit,
        resource: {
          resourceType: 'FamilyMemberHistory',
          id: familyId,
          status: 'completed',
          date: familyDate ? atNoon(familyDate) : undefined,
          relationship: family.relationship
            ? { text: family.relationship }
            : undefined,
          deceasedBoolean:
            typeof family.deceased === 'boolean' ? family.deceased : undefined,
          condition: familyConditions.length
            ? familyConditions.map((name) => ({ code: { text: name } }))
            : undefined,
          note: buildNotes([
            family.provider ? `Provider: ${family.provider}` : undefined,
            family.sourceImage ? `Source: ${family.sourceImage}` : undefined,
            family.note,
            sourceDocument
              ? `Source document: ${sourceDocument.documentReferenceId}`
              : undefined,
          ]),
        },
      },
      metadata: { ...sourceMeta(sourceDocument) },
    }),
  );
}

for (const social of records.socialHistory || []) {
  const socialId = stableId(`social-history-${social.id}`);
  const socialDate = social.recordedDate || social.date;
  const sourceDocument = getOrCreateSourceDocument({
    sourceImage: social.sourceImage,
    date: socialDate,
    title: social.topic,
    provider: social.provider,
    audit: social.audit,
  });
  clinicalDocuments.push(
    clinicalDocument({
      id: socialId,
      resourceType: 'observation',
      date: socialDate,
      displayName: social.topic,
      raw: {
        fullUrl: `manual:${socialId}`,
        manual_kind: 'socialhistory',
        source_image: social.sourceImage,
        audit: social.audit,
        resource: {
          resourceType: 'Observation',
          id: socialId,
          status: 'final',
          category: {
            text: 'Social history',
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'social-history',
                display: 'Social History',
              },
            ],
          },
          code: {
            text: social.topic,
            coding: social.code ? [social.code] : undefined,
          },
          effectiveDateTime: socialDate ? atNoon(socialDate) : undefined,
          issued: socialDate ? atNoon(socialDate) : undefined,
          valueString: social.value,
          note: buildNotes([
            social.provider ? `Provider: ${social.provider}` : undefined,
            social.sourceImage ? `Source: ${social.sourceImage}` : undefined,
            social.note,
            sourceDocument
              ? `Source document: ${sourceDocument.documentReferenceId}`
              : undefined,
          ]),
        },
      },
      metadata: {
        manual_specialty: 'social-history',
        ...sourceMeta(sourceDocument),
      },
    }),
  );
}

for (const panel of records.vitals || []) {
  const sourceDocument = getOrCreateSourceDocument({
    sourceImage: panel.sourceImage,
    date: panel.recordedAt,
    title: panel.title || 'Vital signs',
    provider: panel.provider,
    audit: panel.audit,
  });
  for (const measure of panel.measurements || []) {
    const vitalId = stableId(`vital-${panel.id}-${measure.id}`);
    const vital = vitalObservationCode(measure.name);
    clinicalDocuments.push(
      clinicalDocument({
        id: vitalId,
        resourceType: 'observation',
        date: measure.recordedAt || panel.recordedAt,
        displayName: vital?.display || measure.name,
        raw: {
          fullUrl: `manual:${vitalId}`,
          manual_kind: 'vital',
          source_panel_id: panel.id,
          source_image: measure.sourceImage || panel.sourceImage,
          audit: panel.audit,
          resource: {
            resourceType: 'Observation',
            id: vitalId,
            status: 'final',
            category: {
              text: 'Vital signs',
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
            code: vital
              ? {
                  text: vital.display,
                  coding: [
                    { system: 'http://loinc.org', code: vital.code, display: vital.display },
                  ],
                }
              : { text: measure.name },
            effectiveDateTime: atNoon(measure.recordedAt || panel.recordedAt),
            issued: atNoon(measure.recordedAt || panel.recordedAt),
            ...observationValue(measure.value, measure.unit),
            component: buildVitalComponents(measure),
            bodySite: measure.bodySite ? { text: measure.bodySite } : undefined,
            method: measure.method ? { text: measure.method } : undefined,
            referenceRange: buildReferenceRange(measure),
            interpretation:
              measure.flag && measure.flag !== 'identity'
                ? { text: measure.flag }
                : undefined,
            note: buildNotes([
              panel.provider ? `Provider: ${panel.provider}` : undefined,
              measure.position ? `Position: ${measure.position}` : undefined,
              measure.note,
              sourceDocument
                ? `Source document: ${sourceDocument.documentReferenceId}`
                : undefined,
            ]),
          },
        },
        metadata: {
          manual_specialty: 'vitals',
          source_panel_id: panel.id,
          source_result_id: measure.id,
          loinc_coding: vital ? [vital.code] : [],
          manual_uncoded: !vital,
          ...sourceMeta(sourceDocument),
        },
      }),
    );
  }
}

for (const procedure of records.procedures || []) {
  const procedureId = stableId(`procedure-${procedure.id}`);
  // A surgical history line often gives no date at all. Falling through to
  // `atNoon(undefined)` would stamp it 1970-01-01 and open a phantom decade at
  // the foot of the timeline, so an undated procedure is filed on the date it
  // was written down instead; `performedDateTime` below stays unset, which is
  // what actually says "we do not know when this happened".
  const procedureDate =
    procedure.performedDate || procedure.date || procedure.recordedDate;
  const sourceDocument = getOrCreateSourceDocument({
    sourceImage: procedure.sourceImage,
    date: procedureDate,
    title: procedure.name,
    provider: procedure.provider,
    audit: procedure.audit,
  });
  clinicalDocuments.push(
    clinicalDocument({
      id: procedureId,
      resourceType: 'procedure',
      date: procedureDate,
      displayName: procedure.name,
      raw: {
        fullUrl: `manual:${procedureId}`,
        manual_kind: 'procedure',
        source_image: procedure.sourceImage,
        audit: procedure.audit,
        resource: {
          resourceType: 'Procedure',
          id: procedureId,
          status: procedure.status || 'completed',
          category: procedure.category ? { text: procedure.category } : undefined,
          code: {
            text: procedure.name,
            coding: procedure.code ? [procedure.code] : undefined,
          },
          performedDateTime: procedure.performedDate
            ? atNoon(procedure.performedDate)
            : undefined,
          bodySite: procedure.bodySite ? [{ text: procedure.bodySite }] : undefined,
          outcome: procedure.outcome ? { text: procedure.outcome } : undefined,
          performer: procedure.provider
            ? [{ actor: { display: procedure.provider } }]
            : undefined,
          note: buildNotes([
            procedure.provider ? `Provider: ${procedure.provider}` : undefined,
            procedure.laterality ? `Laterality: ${procedure.laterality}` : undefined,
            procedure.datePrecision === 'unknown'
              ? 'Date not stated in the source document'
              : undefined,
            procedure.note,
            sourceDocument
              ? `Source document: ${sourceDocument.documentReferenceId}`
              : undefined,
          ]),
        },
      },
      metadata: { ...sourceMeta(sourceDocument) },
    }),
  );
}

function getOrCreateSourceDocument({ sourceImage, date, title, provider, audit }) {
  if (!sourceImage) return undefined;

  const sourceKey = `${sourceImage}`;
  const existing = sourceDocumentsByKey.get(sourceKey);
  if (existing) return existing;

  const asset = findSourceAsset(sourceImage);
  const sourceId = stableId(`source-document-${sourceImage}`);
  const documentReferenceId = `manual:source-document-${sourceId}`;
  const attachmentMetadataId = `manual:source-attachment-${sourceId}`;
  const contentType = asset ? contentTypeForPath(asset.path) : undefined;
  const attachment = {
    contentType,
    url: attachmentMetadataId,
    title: sourceImage,
    size: asset?.bytes.byteLength,
  };

  clinicalDocuments.push(
    clinicalDocument({
      id: `source-document-${sourceId}`,
      resourceType: 'documentreference',
      date,
      displayName: `${title} source document`,
      raw: {
        fullUrl: documentReferenceId,
        manual_kind: 'source-document',
        source_image: sourceImage,
        audit,
        resource: {
          resourceType: 'DocumentReference',
          id: `source-document-${sourceId}`,
          status: 'current',
          type: { text: title },
          subject: { reference: `Patient/${userId}` },
          indexed: atNoon(date),
          author: provider ? [{ display: provider }] : undefined,
          description: asset
            ? `Embedded source file: ${basename(asset.path)}`
            : `Source file not found while packaging: ${sourceImage}`,
          content: [{ attachment }],
          text: {
            status: 'generated',
            div: buildReportText([
              `Source: ${sourceImage}`,
              asset ? `Embedded file: ${asset.path}` : undefined,
              provider ? `Provider: ${provider}` : undefined,
              auditText(audit),
            ]),
          },
        },
      },
      metadata: {
        id: documentReferenceId,
        manual_subtype: 'source-document',
        source_image: sourceImage,
        source_file_path: asset?.path,
      },
    }),
  );

  if (asset && contentType) {
    clinicalDocuments.push(
      clinicalDocument({
        id: `source-attachment-${sourceId}`,
        resourceType: 'documentreference_attachment',
        date,
        displayName: sourceImage,
        raw: asset.bytes.toString('base64'),
        metadata: {
          id: attachmentMetadataId,
          manual_subtype: 'source-document',
          source_image: sourceImage,
          source_file_path: asset.path,
        },
      }),
    );
    const attachmentDoc = clinicalDocuments[clinicalDocuments.length - 1];
    attachmentDoc.data_record.content_type = contentType;
  }

  const sourceDocument = {
    documentReferenceId,
    attachment,
    assetPath: asset?.path,
  };
  sourceDocumentsByKey.set(sourceKey, sourceDocument);
  return sourceDocument;
}

const tables = {
  user_documents: [user],
  user_preferences: [
    {
      id: `preferences-${userId}`,
      user_id: userId,
      use_proxy: false,
      _meta: { lwt: now },
      _deleted: false,
    },
  ],
  connection_documents: [connection],
  clinical_documents: clinicalDocuments,
  summary_page_preferences: [
    {
      id: `summary-${userId}`,
      user_id: userId,
      cards: [],
      _meta: { lwt: now },
      _deleted: false,
    },
  ],
  instance_config: [],
  uspstf_recommendation_documents: [],
  vector_storage: [],
};

const files = {};
const counts = {};
for (const [name, rows] of Object.entries(tables)) {
  files[`tables/${name}.json`] = strToU8(JSON.stringify(rows, null, 2));
  counts[name] = rows.length;
}
files['manifest.json'] = strToU8(
  JSON.stringify(
    {
      format: FORMAT_NAME,
      version: FORMAT_VERSION,
      createdAt: now,
      app: { name: 'mere-medical', version: args.appVersion || 'diabetes-record-transpose' },
      schema: { version: 1 },
      tables: Object.keys(tables),
      counts,
      attachmentCount: 0,
    },
    null,
    2,
  ),
);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, zipSync(files, { level: 6 }));

console.log(`Wrote ${outputPath}`);
console.log(JSON.stringify(counts, null, 2));

function clinicalDocument({
  id,
  resourceType,
  date,
  displayName,
  raw,
  metadata = {},
}) {
  return {
    id: `${connectionId}|${userId}|manual:${id}`,
    connection_record_id: connectionId,
    user_id: userId,
    data_record: {
      raw,
      format: 'FHIR.DSTU2',
      content_type: 'application/json',
      resource_type: resourceType,
      version_history: [],
    },
    metadata: {
      id: `manual:${id}`,
      date: atNoon(date),
      display_name: displayName,
      loinc_coding: [],
      manual_uncoded: true,
      ...metadata,
    },
    _meta: { lwt: now },
    _deleted: false,
  };
}

function buildSourceAssetIndex(root) {
  if (!root || !existsSync(root)) return new Map();
  const files = [];
  collectFiles(root, files);

  const index = new Map();
  files.forEach((filePath) => {
    const name = basename(filePath);
    index.set(normalizeAssetName(name), filePath);
  });
  return index;
}

function collectFiles(dir, files) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, files);
    } else if (entry.isFile() && entry.name !== '.DS_Store') {
      files.push(fullPath);
    }
  }
}

function findSourceAsset(sourceImage) {
  const filename = sourceImageToFilename(sourceImage);
  const path = sourceAssetIndex.get(normalizeAssetName(filename));
  if (!path) return undefined;
  return {
    path,
    bytes: readFileSync(path),
  };
}

function sourceImageToFilename(sourceImage) {
  return `${sourceImage}`
    .replace(/\s+pages?\s+.*$/i, '')
    .replace(/\s+page\s+.*$/i, '')
    .trim();
}

function normalizeAssetName(value) {
  return `${value}`
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function contentTypeForPath(path) {
  switch (extname(path).toLowerCase()) {
    case '.pdf':
      return 'application/pdf';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.txt':
      return 'text/plain';
    case '.html':
    case '.htm':
      return 'text/html';
    case '.xml':
      return 'application/xml';
    default:
      return 'application/octet-stream';
  }
}

function observationValue(value, unit) {
  if (value === undefined || value === null || value === '') return {};
  if (typeof value === 'number') {
    return {
      valueQuantity: quantity(value, unit),
    };
  }

  const text = `${value}`.trim();
  if (/^pending$/i.test(text)) {
    return {
      dataAbsentReason: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/data-absent-reason',
            code: 'pending',
            display: 'Pending',
          },
        ],
        text: 'Pending',
      },
    };
  }

  const comparatorMatch = text.match(/^(<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)$/);
  if (comparatorMatch) {
    return {
      valueQuantity: quantity(
        Number(comparatorMatch[2]),
        unit,
        comparatorMatch[1],
      ),
    };
  }

  if (/^-?\d+(?:\.\d+)?$/.test(text)) {
    return {
      valueQuantity: quantity(Number(text), unit),
    };
  }

  const coded = qualitativeObservationCode(text);
  if (coded) {
    return {
      valueCodeableConcept: {
        text: unit ? `${text} ${unit}` : text,
        coding: [coded],
      },
    };
  }

  const semiquantitative = parseSemiQuantitativeValue(text, unit);
  if (semiquantitative) {
    return {
      valueRange: semiquantitative,
    };
  }

  return {
    valueString: unit ? `${text} ${unit}` : text,
  };
}

function quantity(value, unit, comparator) {
  return {
    value,
    comparator,
    unit: unit || undefined,
    system: unit ? 'http://unitsofmeasure.org' : undefined,
    code: unit || undefined,
  };
}

function buildReferenceRange(result) {
  const range = result.referenceRange || result.originalReferenceRange;
  if (!range) return undefined;
  const parsed = parseRange(range, result.unit);
  return [
    {
      text: range,
      low: parsed.low,
      high: parsed.high,
      extension: buildReferenceRangeExtensions(result, parsed),
    },
  ];
}

function parseRange(range, unit) {
  const normalized = `${range}`.replace(/%$/, '').trim();
  const lowHigh = normalized.match(
    /^(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/,
  );
  if (lowHigh) {
    return {
      low: { value: Number(lowHigh[1]), unit: unit || undefined },
      high: { value: Number(lowHigh[2]), unit: unit || undefined },
    };
  }
  const upper = normalized.match(/^<\s*(-?\d+(?:\.\d+)?)/);
  if (upper)
    return {
      high: { value: Number(upper[1]), unit: unit || undefined },
      comparator: '<',
    };
  const lower = normalized.match(/^>\s*(-?\d+(?:\.\d+)?)/);
  if (lower)
    return {
      low: { value: Number(lower[1]), unit: unit || undefined },
      comparator: '>',
    };
  const upperInclusive = normalized.match(/^<=\s*(-?\d+(?:\.\d+)?)/);
  if (upperInclusive)
    return {
      high: { value: Number(upperInclusive[1]), unit: unit || undefined },
      comparator: '<=',
    };
  const lowerInclusive = normalized.match(/^>=\s*(-?\d+(?:\.\d+)?)/);
  if (lowerInclusive)
    return {
      low: { value: Number(lowerInclusive[1]), unit: unit || undefined },
      comparator: '>=',
    };
  return {};
}

function buildObservationCode(result) {
  const coded = labObservationCode(result.name);
  return {
    text: result.name,
    coding: coded ? [coded] : undefined,
  };
}

function buildLabExtensions(result, nutritionRelevance) {
  const extensions = [];
  const qualitative = qualitativeObservationCode(`${result.value}`.trim());
  const semi = parseSemiQuantitativeValue(
    `${result.value}`.trim(),
    result.unit,
  );

  if (qualitative) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/coded-qualitative-value',
      valueCodeableConcept: { text: `${result.value}`, coding: [qualitative] },
    });
  }
  if (semi) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/semi-quantitative-value',
      valueRange: semi,
    });
  }
  if (result.originalReferenceRange && result.referenceRange) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/original-reference-range',
      valueString: result.originalReferenceRange,
    });
  }
  if (result.referenceCitationId) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/reference-citation-id',
      valueString: result.referenceCitationId,
    });
  }
  if (result.referenceAgeBand) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/reference-age-band',
      valueString: result.referenceAgeBand,
    });
  }
  if (isDiabetesTarget(result)) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/clinical-target-context',
      valueCodeableConcept: {
        text: 'Diabetes clinical target',
        coding: [
          {
            system:
              'https://mere.health/fhir/CodeSystem/reference-range-context',
            code: 'diabetes-target',
            display: 'Diabetes target',
          },
        ],
      },
    });
  }
  if (nutritionRelevance) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/nutrition-relevance',
      valueCodeableConcept: {
        text: nutritionRelevance.display,
        coding: [nutritionRelevance.coding],
      },
    });
  }

  return extensions.length ? extensions : undefined;
}

function buildReferenceRangeExtensions(result, parsed) {
  const extensions = [];
  if (parsed.comparator) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/reference-range-comparator',
      valueCode: parsed.comparator,
    });
  }
  if (result.referenceAgeBand) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/reference-range-applies-to',
      valueString: result.referenceAgeBand,
    });
  }
  if (result.originalReferenceRange && result.referenceRange) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/alternate-reference-range',
      valueString: result.originalReferenceRange,
    });
  }
  if (isDiabetesTarget(result)) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/reference-range-purpose',
      valueCode: 'clinical-target',
    });
  }
  return extensions.length ? extensions : undefined;
}

function qualitativeObservationCode(value) {
  const normalized = value.toLowerCase();
  const codes = {
    negative: {
      system: 'http://snomed.info/sct',
      code: '260385009',
      display: 'Negative',
    },
    absent: {
      system: 'http://snomed.info/sct',
      code: '2667000',
      display: 'Absent',
    },
    clear: {
      system: 'https://mere.health/fhir/CodeSystem/qualitative-lab-answer',
      code: 'clear',
      display: 'Clear',
    },
    yellow: {
      system: 'https://mere.health/fhir/CodeSystem/qualitative-lab-answer',
      code: 'yellow',
      display: 'Yellow',
    },
    straw: {
      system: 'https://mere.health/fhir/CodeSystem/qualitative-lab-answer',
      code: 'straw',
      display: 'Straw',
    },
    'o (i)': {
      system: 'https://mere.health/fhir/CodeSystem/abo-blood-group',
      code: 'O',
      display: 'Blood group O',
    },
    'rhd (+) positive': {
      system: 'https://mere.health/fhir/CodeSystem/rhesus-blood-group',
      code: 'RhD-positive',
      display: 'RhD positive',
    },
  };
  return codes[normalized];
}

function parseSemiQuantitativeValue(value, unit) {
  const match = value.match(/^(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return undefined;
  return {
    low: { value: Number(match[1]), unit: unit || undefined },
    high: { value: Number(match[2]), unit: unit || undefined },
  };
}

// Curated analyte name -> LOINC map. Codes only need to be stable and shared
// across same-analyte results so the app can group a measure's history and draw
// trends; standard LOINC codes are used where well established.

function labObservationCode(name) {
  const normalized = name.toLowerCase().trim();
  const hit = LAB_LOINC[normalized];
  if (!hit) return undefined;
  return { system: 'http://loinc.org', code: hit[0], display: hit[1] };
}


function vitalObservationCode(name) {
  const key = `${name || ''}`.trim().toLowerCase();
  const hit = VITAL_LOINC[key];
  return hit ? { code: hit[0], display: hit[1] } : undefined;
}

/**
 * Blood pressure is one reading with two numbers, so it is stored the way FHIR
 * stores it: a panel-coded Observation whose systolic and diastolic live in
 * `component`. Every other vital carries its number on the Observation itself
 * and has no components.
 */
function buildVitalComponents(measure) {
  if (!Array.isArray(measure.components) || measure.components.length === 0) {
    return undefined;
  }
  return measure.components.map((component) => {
    const coded = vitalObservationCode(component.name);
    return {
      code: coded
        ? {
            text: coded.display,
            coding: [
              { system: 'http://loinc.org', code: coded.code, display: coded.display },
            ],
          }
        : { text: component.name },
      ...observationValue(component.value, component.unit),
    };
  });
}

function isDiabetesTarget(result) {
  return /diabetes target|clinical target/i.test(
    [result.referenceRange, result.referenceNote].filter(Boolean).join(' '),
  );
}

function buildNotes(parts) {
  const text = parts.filter(Boolean).join('\n');
  return text ? [{ text }] : undefined;
}

// Pointers that let the web UI open the original source file from any record.
// `source_attachment_id` is the metadata.id of the embedded attachment doc and
// is only set when the source bytes were actually packaged.
function sourceMeta(sourceDocument) {
  if (!sourceDocument) return {};
  const meta = { source_document_id: sourceDocument.documentReferenceId };
  if (sourceDocument.assetPath) {
    meta.source_attachment_id = sourceDocument.attachment.url;
  }
  return meta;
}

function extractImagingFindings(report) {
  return (report.findings || []).flatMap((text, index) => {
    const findings = [];
    const sourceText = `${text}`;

    for (const match of sourceText.matchAll(
      /(right lobe|left lobe|gallbladder|right kidney|left kidney|prostate)\s+(?:normal location,\s*)?(?:size\s+)?(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x?\s*(\d+(?:\.\d+)?)?\s*mm/gi,
    )) {
      const bodySite = titleCase(match[1]);
      const dimensions = [match[2], match[3], match[4]]
        .filter(Boolean)
        .join(' x ');
      findings.push({
        id: `${index}-${stableId(bodySite)}-dimensions`,
        label: `${bodySite} dimensions`,
        value: dimensions,
        unit: 'mm',
        bodySite,
        bodySiteCode: bodySiteCoding(bodySite),
        category: 'measurement',
        sourceText,
      });
    }

    for (const match of sourceText.matchAll(
      /(right lobe|left lobe|overall)\s+volume\s+(\d+(?:\.\d+)?)\s*cm3/gi,
    )) {
      const bodySite =
        match[1].toLowerCase() === 'overall'
          ? 'Thyroid gland'
          : `Thyroid ${match[1].toLowerCase()}`;
      findings.push({
        id: `${index}-${stableId(bodySite)}-volume`,
        label: `${bodySite} volume`,
        value: Number(match[2]),
        unit: 'cm3',
        bodySite,
        bodySiteCode: bodySiteCoding(bodySite),
        code: {
          system: 'https://mere.health/fhir/CodeSystem/imaging-finding',
          code: 'organ-volume',
          display: 'Organ volume',
        },
        category: 'measurement',
        sourceText,
      });
    }

    for (const match of sourceText.matchAll(
      /(liver right lobe size|portal vein|inferior vena cava|common bile duct|isthmus|wall thickness)\s+(\d+(?:\.\d+)?)\s*mm/gi,
    )) {
      const label = titleCase(match[1]);
      findings.push({
        id: `${index}-${stableId(label)}`,
        label,
        value: Number(match[2]),
        unit: 'mm',
        bodySite: inferBodySite(label),
        bodySiteCode: bodySiteCoding(inferBodySite(label)),
        category: 'measurement',
        sourceText,
      });
    }

    for (const match of sourceText.matchAll(
      /(hyperechoic inclusions)\s+(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*mm/gi,
    )) {
      const bodySite = sourceText.toLowerCase().includes('left kidney')
        ? 'Left kidney'
        : sourceText.toLowerCase().includes('right kidney')
          ? 'Right kidney'
          : 'Kidney';
      findings.push({
        id: `${index}-${stableId(bodySite)}-hyperechoic-inclusions`,
        label: 'Hyperechoic inclusions',
        value: `${match[2]}-${match[3]}`,
        unit: 'mm',
        bodySite,
        bodySiteCode: bodySiteCoding(bodySite),
        code: {
          system: 'https://mere.health/fhir/CodeSystem/imaging-finding',
          code: 'hyperechoic-inclusion',
          display: 'Hyperechoic inclusion',
        },
        category: 'finding',
        sourceText,
      });
    }

    const prostateWeight = sourceText.match(
      /prostate.*estimated weight\s+(\d+(?:\.\d+)?)\s*g/i,
    );
    if (prostateWeight) {
      findings.push({
        id: `${index}-prostate-weight`,
        label: 'Prostate estimated weight',
        value: Number(prostateWeight[1]),
        unit: 'g',
        bodySite: 'Prostate',
        bodySiteCode: bodySiteCoding('Prostate'),
        category: 'measurement',
        sourceText,
      });
    }

    if (/no enlarged .*lymph nodes/i.test(sourceText)) {
      findings.push({
        id: `${index}-regional-lymph-nodes`,
        label: 'Regional lymph nodes',
        value: 'No enlarged or structurally changed lymph nodes',
        bodySite: 'Regional lymph nodes',
        category: 'impression',
        sourceText,
      });
    }

    return findings;
  });
}

function imagingFindingExtension(finding) {
  return {
    url: 'finding',
    extension: [
      { url: 'label', valueString: finding.label },
      finding.bodySite
        ? {
            url: 'bodySite',
            valueCodeableConcept: {
              text: finding.bodySite,
              coding: finding.bodySiteCode ? [finding.bodySiteCode] : undefined,
            },
          }
        : undefined,
      finding.category
        ? { url: 'category', valueCode: finding.category }
        : undefined,
      typeof finding.value === 'number'
        ? {
            url: 'valueQuantity',
            valueQuantity: quantity(finding.value, finding.unit),
          }
        : {
            url: 'valueString',
            valueString:
              `${finding.value || ''}${finding.unit ? ` ${finding.unit}` : ''}`.trim(),
          },
    ].filter(Boolean),
  };
}

function buildMedicationCode(name) {
  return {
    text: name,
    coding: medicationCoding(name) ? [medicationCoding(name)] : undefined,
  };
}

function medicationCoding(name) {
  const normalized = name.toLowerCase();
  const codes = {
    metformin: {
      system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
      code: '6809',
      display: 'metformin',
    },
    glimepiride: {
      system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
      code: '25789',
      display: 'glimepiride',
    },
    atorvastatin: {
      system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
      code: '83367',
      display: 'atorvastatin',
    },
  };
  if (normalized.includes('farxiga') || normalized.includes('dapagliflozin')) {
    return {
      system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
      code: '1488564',
      display: 'dapagliflozin',
    };
  }
  return codes[normalized];
}

function buildMedicationInformationSource(item, group) {
  const sourceText = [
    group?.provider,
    item?.sourceSection ? `section: ${item.sourceSection}` : undefined,
  ]
    .filter(Boolean)
    .join('; ');
  return sourceText
    ? {
        display: sourceText,
      }
    : undefined;
}

function buildMedicationEffectivePeriod(item, group) {
  const start = atNoon(item.assignedDate || group.encounterDate);
  const period = { start };
  const stoppedAt = stopDate(item);
  if (stoppedAt) period.end = atNoon(stoppedAt);
  return period;
}

function buildMedicationStatusReason(item) {
  const statusText = item.status || 'active';
  const reason = stopReason(item);
  return {
    text: reason ? `${statusText}: ${reason}` : statusText,
    coding: [
      {
        system: 'https://mere.health/fhir/CodeSystem/medication-plan-status',
        code: stableId(statusText),
        display: statusText,
      },
    ],
  };
}

function buildMedicationReason(item) {
  const text = [item.plannerImplication, item.note, item.sourceSection].join(
    ' ',
  );
  if (/diabetes|glucose|carbohydrate|cgm/i.test(text)) {
    return [
      {
        text: 'Diabetes management',
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '73211009',
            display: 'Diabetes mellitus',
          },
        ],
      },
    ];
  }
  if (/ldl|lipid|atorvastatin/i.test(text)) {
    return [{ text: 'Hyperlipidemia / cardiovascular risk management' }];
  }
  return undefined;
}

function buildMedicationExtensions(item, group) {
  const extensions = [];
  const category = inferMedicationCategory(item);
  const adherence = inferMedicationAdherence(item);
  const condition = conditionalInstruction(item);
  const stoppedAt = stopDate(item);
  const stoppedBecause = stopReason(item);
  const historyEvents = buildMedicationHistoryEvents(item, group);

  extensions.push({
    url: 'https://mere.health/fhir/StructureDefinition/medication-category',
    valueCodeableConcept: {
      text: category.display,
      coding: [category],
    },
  });

  if (adherence) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/medication-adherence',
      valueCodeableConcept: {
        text: adherence.display,
        coding: [adherence],
      },
    });
  }

  if (condition) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/medication-start-condition',
      valueString: condition,
    });
  }

  if (stoppedAt) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/medication-stop-date',
      valueDateTime: atNoon(stoppedAt),
    });
  }

  if (stoppedBecause) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/medication-stop-reason',
      valueString: stoppedBecause,
    });
  }

  for (const event of historyEvents) {
    extensions.push({
      url: 'https://mere.health/fhir/StructureDefinition/medication-history-event',
      extension: [
        {
          url: 'type',
          valueCodeableConcept: {
            text: event.display,
            coding: [
              {
                system:
                  'https://mere.health/fhir/CodeSystem/medication-history-event',
                code: event.code,
                display: event.display,
              },
            ],
          },
        },
        event.date
          ? { url: 'date', valueDateTime: atNoon(event.date) }
          : undefined,
        event.source ? { url: 'source', valueString: event.source } : undefined,
        event.note ? { url: 'note', valueString: event.note } : undefined,
      ].filter(Boolean),
    });
  }

  return extensions.length ? extensions : undefined;
}

function inferMedicationCategory(item) {
  const text = [item.medication, item.note, item.sourceSection].join(' ');
  const categories = [
    ['vitamin', /vitamin|b12|d3|folate/i, 'Vitamin'],
    ['supplement', /supplement|omega|fish oil|coq10/i, 'Supplement'],
    ['herbal', /herbal|turmeric|curcumin|ginseng/i, 'Herbal product'],
    ['otc', /over[-\s]?the[-\s]?counter|otc|aspirin/i, 'OTC medication'],
  ];
  const match = categories.find(([, pattern]) => pattern.test(text));
  const code = match?.[0] || 'prescription';
  const display = match?.[2] || 'Prescription medication';
  return {
    system: 'https://mere.health/fhir/CodeSystem/medication-category',
    code,
    display,
  };
}

function inferMedicationAdherence(item) {
  const text = [item.status, item.note, item.plannerImplication].join(' ');
  if (/not taking|not-taking/i.test(text)) {
    return {
      system: 'https://mere.health/fhir/CodeSystem/medication-adherence',
      code: 'not-taking',
      display: 'Patient reported not taking',
    };
  }
  if (/continue|current/i.test(text)) {
    return {
      system: 'https://mere.health/fhir/CodeSystem/medication-adherence',
      code: 'taking-as-directed',
      display: 'Taking as directed',
    };
  }
  if (/assigned|planned|begin|start/i.test(text)) {
    return {
      system: 'https://mere.health/fhir/CodeSystem/medication-adherence',
      code: 'not-yet-started',
      display: 'Not yet started',
    };
  }
  if (/stopped|discontinu/i.test(text)) {
    return {
      system: 'https://mere.health/fhir/CodeSystem/medication-adherence',
      code: 'stopped',
      display: 'Stopped',
    };
  }
  return undefined;
}

function buildMedicationHistoryEvents(item, group) {
  const events = [];
  const source = item.sourceSection || group?.title;
  if (item.status === 'current') {
    events.push({
      code: 'current',
      display: 'Listed as current',
      date: item.assignedDate || group?.encounterDate,
      source,
      note: item.note,
    });
  }
  if (item.status === 'assigned' || item.status === 'planned') {
    events.push({
      code: 'assigned',
      display: 'Assigned',
      date: item.assignedDate || group?.encounterDate,
      source,
      note: conditionOrNote(item),
    });
  }
  if (/not taking/i.test([item.note, item.plannerImplication].join(' '))) {
    events.push({
      code: 'patient-not-taking',
      display: 'Patient reported not taking',
      date: item.assignedDate || group?.encounterDate,
      source,
      note: item.note,
    });
  }
  if (stopDate(item) || item.status === 'stopped') {
    events.push({
      code: 'stopped',
      display: 'Stopped',
      date: stopDate(item) || item.assignedDate || group?.encounterDate,
      source,
      note: stopReason(item) || item.note,
    });
  }
  if (
    /dose|daily|twice|morning|with meals/i.test(
      item.frequency || item.dose || '',
    )
  ) {
    events.push({
      code: 'dose-instruction',
      display: 'Dose instruction recorded',
      date: item.assignedDate || group?.encounterDate,
      source,
      note: [item.dose, item.frequency, item.route].filter(Boolean).join(', '),
    });
  }
  return events;
}

function conditionalInstruction(item) {
  const text = [item.note, item.plannerImplication].filter(Boolean).join(' ');
  const afterDays = text.match(
    /(?:begin|start).*?after\s+(\d+)\s+days?[^.;]*/i,
  );
  if (afterDays) return sentenceCase(afterDays[0]);
  const cgmSplit = text.match(
    /first\s+\d+\s+days?[^.;]+last\s+\d+\s+days?[^.;]+/i,
  );
  if (cgmSplit) return sentenceCase(cgmSplit[0]);
  return undefined;
}

function conditionOrNote(item) {
  return conditionalInstruction(item) || item.note || item.plannerImplication;
}

function stopDate(item) {
  if (item.status !== 'stopped' && item.status !== 'not-taking')
    return undefined;
  return item.assignedDate;
}

function stopReason(item) {
  const text = [item.note, item.plannerImplication].filter(Boolean).join(' ');
  const because = text.match(/because of ([^.;]+)/i);
  if (because) return sentenceCase(because[1]);
  const afterStopping = text.match(/after discontinuing ([^.;]+)/i);
  if (/urinary frequency/i.test(text) && afterStopping) {
    return 'Urinary frequency concern';
  }
  if (/urinary frequency/i.test(text)) return 'Urinary frequency concern';
  if (/discontinu/i.test(text)) return text;
  return undefined;
}

function nutritionRelevanceForLab(result) {
  const text = [result.name, result.shortName, result.note]
    .filter(Boolean)
    .join(' ');
  const matches = [
    {
      pattern: /25[-\s]?hydroxyvitamin d|vitamin d|25-oh/i,
      code: 'vitamin-d',
      display: 'Vitamin D',
      coding: {
        system: 'http://loinc.org',
        code: '1989-3',
        display: '25-hydroxyvitamin D',
      },
    },
    {
      pattern: /cyanocobalamine|vitamin b12|\bb12\b/i,
      code: 'vitamin-b12',
      display: 'Vitamin B12',
      coding: {
        system: 'http://loinc.org',
        code: '2132-9',
        display: 'Cobalamin (Vitamin B12)',
      },
    },
    {
      pattern: /magnesium/i,
      code: 'magnesium',
      display: 'Magnesium',
      coding: {
        system: 'http://loinc.org',
        code: '19123-9',
        display: 'Magnesium',
      },
    },
    {
      pattern: /\biron\b/i,
      code: 'iron',
      display: 'Iron',
      coding: {
        system: 'http://loinc.org',
        code: '2498-4',
        display: 'Iron',
      },
    },
    {
      pattern: /ferritin/i,
      code: 'ferritin',
      display: 'Ferritin',
      coding: {
        system: 'http://loinc.org',
        code: '2276-4',
        display: 'Ferritin',
      },
    },
    {
      pattern: /zinc/i,
      code: 'zinc',
      display: 'Zinc',
      coding: {
        system: 'http://loinc.org',
        code: '5763-8',
        display: 'Zinc',
      },
    },
    {
      pattern: /folate/i,
      code: 'folate',
      display: 'Folate',
      coding: {
        system: 'http://loinc.org',
        code: '2284-8',
        display: 'Folate',
      },
    },
  ];
  const match = matches.find((candidate) => candidate.pattern.test(text));
  if (!match) return undefined;
  return {
    ...match,
    text: `${match.display} lab marker: ${formatValueWithUnit(result.value, result.unit)}`,
  };
}

function formatValueWithUnit(value, unit) {
  return [value, unit]
    .filter((part) => part !== undefined && part !== '')
    .join(' ');
}

function sentenceCase(value) {
  const text = `${value}`.trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function titleCase(value) {
  return `${value}`.replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferBodySite(label) {
  const normalized = label.toLowerCase();
  if (normalized.includes('liver')) return 'Liver';
  if (normalized.includes('portal vein')) return 'Portal vein';
  if (normalized.includes('inferior vena cava')) return 'Inferior vena cava';
  if (normalized.includes('common bile duct')) return 'Common bile duct';
  if (normalized.includes('isthmus')) return 'Thyroid isthmus';
  if (normalized.includes('wall thickness')) return 'Bladder';
  return label;
}

function bodySiteCoding(bodySite) {
  const codes = {
    liver: ['10200004', 'Liver'],
    'portal vein': ['32764006', 'Portal vein'],
    'inferior vena cava': ['64131007', 'Inferior vena cava'],
    'common bile duct': ['28273000', 'Common bile duct'],
    bladder: ['89837001', 'Urinary bladder'],
    prostate: ['41216001', 'Prostate'],
    'left kidney': ['18639004', 'Left kidney'],
    'right kidney': ['9846003', 'Right kidney'],
    kidney: ['64033007', 'Kidney'],
    'thyroid gland': ['69748006', 'Thyroid gland'],
  };
  const code = codes[`${bodySite}`.toLowerCase()];
  return code
    ? {
        system: 'http://snomed.info/sct',
        code: code[0],
        display: code[1],
      }
    : undefined;
}

function auditText(audit) {
  if (!audit) return '';
  return [
    `Audit: ${audit.status}`,
    audit.verifiedAt ? `Verified at: ${audit.verifiedAt}` : undefined,
    audit.verifiedBy ? `Verified by: ${audit.verifiedBy}` : undefined,
    ...(audit.notes || []).map((note) => `Audit note: ${note}`),
  ]
    .filter(Boolean)
    .join('\n');
}

function buildReportText(parts) {
  return parts.filter(Boolean).join('\n\n');
}

function mapMedicationStatus(status) {
  if (status === 'stopped' || status === 'not-taking') return 'stopped';
  if (status === 'historical') return 'completed';
  if (status === 'assigned' || status === 'planned') return 'intended';
  return 'active';
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg
      .slice(2)
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = 'true';
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function atNoon(date) {
  if (!date) return new Date(0).toISOString();
  if (`${date}`.includes('T')) return date;
  return new Date(`${date}T12:00:00.000Z`).toISOString();
}

function stableId(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
