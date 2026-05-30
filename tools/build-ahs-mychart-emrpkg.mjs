#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { strToU8, zipSync } from 'fflate';

const FORMAT_NAME = 'mere-emr-package';
const FORMAT_VERSION = 1;
const LOINC_BY_LAB_NAME = new Map(
  Object.entries({
    INR: '34714-6',
    'Auto WBC': '6690-2',
    Leukocytes: '6690-2',
    Hemoglobin: '718-7',
    Hematocrit: '4544-3',
    Platelets: '777-3',
    RBC: '789-8',
    Erythrocytes: '789-8',
    MCV: '787-2',
    MCHC: '786-4',
    RDW: '788-0',
    Neutrophils: '770-8',
    'Neutrophil Absolute': '751-8',
    Lymphocytes: '736-9',
    'Lymphocytes Absolute': '731-0',
    Monocytes: '5905-5',
    'Monocytes Absolute': '742-7',
    Eosinophils: '713-8',
    'Eosinophils Absolute': '711-2',
    'Basophils Absolute': '704-7',
    nRBC: '19048-8',
    'Immature Granulocytes Absolute': '53115-2',
    'Granulocytes Immature': '53115-2',
    Sodium: '2951-2',
    Potassium: '2823-3',
    Chloride: '2075-0',
    CO2: '2028-9',
    'Carbon Dioxide (CO2)': '2028-9',
    'Anion Gap': '33037-3',
    Urea: '3094-0',
    'Glucose, Random': '2345-7',
    Creatinine: '2160-0',
    'Estimated Glomerular Filtration Rate': '33914-3',
    eGFR: '33914-3',
    'Thyroid Stimulating Hormone (TSH)': '3016-3',
    'Vitamin B12': '2132-9',
    'Hemoglobin A1c': '4548-4',
    'Gamma Glutamyl Transferase (GGT)': '2324-2',
    Ferritin: '2276-4',
    'Alanine Aminotransferase (ALT)': '1742-6',
    'Lithium Level': '14334-7',
    'Lithium Dose Date': '29742-4',
    'Lithium Dose Time': '29637-6',
    'Cholesterol, Total': '2093-3',
    'HDL Cholesterol': '2085-9',
    'Low Density Lipoprotein Cholesterol (Calculated)': '13457-7',
    Triglycerides: '2571-8',
    'Non High Density Lipoprotein Cholesterol': '43396-1',
    'Specific Gravity, Urine': '5811-5',
    'pH, Urine': '5803-2',
    'Hours Fasting': '87527-8',
  }),
);

const args = parseArgs(process.argv.slice(2));
if (!args.sourceDir || !args.output) {
  console.error(`Usage:
  node tools/build-ahs-mychart-emrpkg.mjs \\
    --source-dir /path/to/ahs-mychart-export \\
    --output /path/to/export.emrpkg \\
    [--json export.json] [--health-summary-dir /path/to/HealthSummary] \\
    [--ccda-dir /path/to/IHE_XDM/patient-folder] \\
    [--report /path/to/report.md]`);
  process.exit(1);
}

const sourceDir = resolve(args.sourceDir);
const jsonPath = args.json
  ? resolve(sourceDir, args.json)
  : discoverSourceJson(sourceDir);
const outputPath = resolve(args.output);
const reportPath = args.report ? resolve(args.report) : undefined;
const healthSummaryDir = args.healthSummaryDir
  ? resolve(args.healthSummaryDir)
  : discoverHealthSummaryDirectory(sourceDir);

const source = JSON.parse(readFileSync(jsonPath, 'utf8'));
const now = Date.now();
const sourceLabel = source.exportSource || 'Alberta Health Services MyChart';
const profileId = stableId(`ahs-mychart-${source.exportDate || jsonPath}`);
const userId = `u-${profileId}`;
const connectionId = `c-${profileId}`;

const user = {
  id: userId,
  is_selected_user: true,
  is_default_user: false,
  first_name: source.patient?.firstName || 'Patient',
  last_name: source.patient?.lastName || '',
  birthday: parseDate(source.patient?.dateOfBirth),
  gender: source.patient?.gender || 'unknown',
  _meta: { lwt: now },
  _deleted: false,
};

const connection = {
  id: connectionId,
  user_id: userId,
  source: 'manual',
  location: `manual://alberta-health-services-myahsconnect/${profileId}`,
  name: `${sourceLabel} import`,
  access_token: '',
  expires_at: 0,
  last_refreshed: source.exportDate,
  source_exported_at: source.exportDate,
  source_system: sourceLabel,
  _meta: { lwt: now },
  _deleted: false,
};

const clinicalDocuments = [];
const clinicalDocumentIds = new Set();
const ccdaExtractionCounts = {};

addClinicalDocument({
  resourceType: 'patient',
  id: userId,
  date: source.exportDate,
  displayName: 'Patient demographics',
  raw: {
    resourceType: 'Patient',
    id: userId,
    name: [{ given: [source.patient?.firstName].filter(Boolean) }],
    birthDate: dateOnly(parseDate(source.patient?.dateOfBirth)),
    gender: normalizeGender(source.patient?.gender),
    extension: source.patient?.age
      ? [
          {
            url: 'https://mere.health/fhir/StructureDefinition/source-age-text',
            valueString: String(source.patient.age),
          },
        ]
      : undefined,
  },
});

addVital('height', 'Body height', '8302-2', source.patient?.height);
addVital('weight', 'Body weight', '29463-7', source.patient?.weight);
addAllergyStatus(source.allergies);
addSurgeries(source.medicalHistory?.surgeries || []);
addFamilyHistory(source.medicalHistory?.familyHistory || []);
addTestResults(source.testResults?.results || []);
addRawExportDocument(source, jsonPath);
addSiblingJsonDocuments(sourceDir);
addMyHealthRecordsExports(sourceDir);
addSourceProvenance();
addHealthSummaryExtractedRecords(healthSummaryDir);
consolidateDiagnosticReports();
addFileDocuments(sourceDir);
if (healthSummaryDir && !isInsidePath(healthSummaryDir, sourceDir)) {
  addFileDocuments(healthSummaryDir, {
    baseDir: dirname(healthSummaryDir),
    prefix: basename(healthSummaryDir),
  });
}
addCompanionResourcesForLooseFiles(sourceDir);

const tableFiles = {
  user_documents: strToU8(JSON.stringify([user], null, 2)),
  connection_documents: strToU8(JSON.stringify([connection], null, 2)),
  clinical_documents: strToU8(JSON.stringify(clinicalDocuments, null, 2)),
  user_preferences: strToU8(JSON.stringify([], null, 2)),
  summary_page_preferences: strToU8(JSON.stringify([], null, 2)),
  instance_config: strToU8(JSON.stringify([], null, 2)),
  uspstf_recommendation_documents: strToU8(JSON.stringify([], null, 2)),
  vector_storage: strToU8(JSON.stringify([], null, 2)),
};

const counts = Object.fromEntries(
  Object.entries(tableFiles).map(([name, bytes]) => [
    name,
    JSON.parse(Buffer.from(bytes).toString('utf8')).length,
  ]),
);

const manifest = {
  format: FORMAT_NAME,
  version: FORMAT_VERSION,
  createdAt: now,
  app: { name: 'mere-medical', version: 'ahs-mychart-builder' },
  schema: { version: 1 },
  tables: Object.keys(tableFiles),
  counts,
  attachmentCount: 0,
};

const files = { 'manifest.json': strToU8(JSON.stringify(manifest, null, 2)) };
for (const [name, bytes] of Object.entries(tableFiles)) {
  files[`tables/${name}.json`] = bytes;
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, zipSync(files, { level: 6 }));

if (reportPath) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, buildReport(), 'utf8');
}

console.log(`Wrote ${outputPath}`);
console.log(`Clinical documents: ${clinicalDocuments.length}`);
if (reportPath) console.log(`Wrote ${reportPath}`);

function addClinicalDocument({
  resourceType,
  id,
  date,
  displayName,
  raw,
  contentType = 'application/json',
  metadata = {},
}) {
  const metadataId = `${resourceType}/${id}`;
  const documentId = `${connectionId}|${userId}|${metadataId}`;
  if (clinicalDocumentIds.has(documentId)) return false;
  clinicalDocumentIds.add(documentId);
  clinicalDocuments.push({
    id: documentId,
    connection_record_id: connectionId,
    user_id: userId,
    data_record: {
      raw: { resource: raw },
      format: contentType.includes('json') ? 'FHIR.R4' : 'FHIR.R4',
      content_type: contentType,
      resource_type: resourceType.toLowerCase(),
      version_history: [],
    },
    type: resourceType,
    metadata: {
      id: metadataId,
      date: normalizeDateTime(date),
      display_name: displayName,
      ...metadata,
    },
    _meta: { lwt: now },
    _deleted: false,
  });
  return true;
}

function addVital(kind, display, loinc, item) {
  if (!item?.value) return;
  const parsed = parseQuantity(item.value);
  const id = stableId(`${kind}-${item.value}-${item.dateRecorded}`);
  addClinicalDocument({
    resourceType: 'observation',
    id,
    date: item.dateRecorded,
    displayName: display,
    raw: {
      resourceType: 'Observation',
      id,
      status: 'final',
      category: [
        {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
            },
          ],
        },
      ],
      code: {
        coding: [{ system: 'http://loinc.org', code: loinc, display }],
        text: display,
      },
      effectiveDateTime: normalizeDateTime(item.dateRecorded),
      valueQuantity: parsed,
      note: [{ text: `Source value: ${item.value}` }],
    },
    metadata: { loinc_coding: [loinc], manual_specialty: 'vitals' },
  });
}

function addAllergyStatus(allergies) {
  if (!allergies) return;
  const list = allergies.list || [];
  if (list.length === 0 && allergies.status) {
    const id = stableId(`allergies-${allergies.status}`);
    addClinicalDocument({
      resourceType: 'allergyintolerance',
      id,
      date: source.exportDate,
      displayName: allergies.status,
      raw: {
        resourceType: 'AllergyIntolerance',
        id,
        clinicalStatus: { text: allergies.status },
        code: { text: allergies.status },
        patient: { reference: `Patient/${userId}` },
        note: [
          { text: 'Imported as stated allergy status from source export.' },
        ],
      },
    });
  }
  for (const allergy of list) {
    const label = allergy.name || allergy.substance || JSON.stringify(allergy);
    const id = stableId(`allergy-${label}`);
    addClinicalDocument({
      resourceType: 'allergyintolerance',
      id,
      date: allergy.date || source.exportDate,
      displayName: label,
      raw: {
        resourceType: 'AllergyIntolerance',
        id,
        code: { text: label },
        patient: { reference: `Patient/${userId}` },
        note: [{ text: JSON.stringify(allergy) }],
      },
    });
  }
}

function addSurgeries(surgeries) {
  for (const surgery of surgeries) {
    if (!surgery?.name) continue;
    const id = stableId(`procedure-${surgery.name}-${surgery.date || ''}`);
    addClinicalDocument({
      resourceType: 'procedure',
      id,
      date: surgery.date || source.exportDate,
      displayName: surgery.name,
      raw: {
        resourceType: 'Procedure',
        id,
        status: 'unknown',
        code: { text: surgery.name },
        performedDateTime: normalizeDateTime(surgery.date),
        subject: { reference: `Patient/${userId}` },
      },
    });
  }
}

function addFamilyHistory(items) {
  for (const [index, family] of items.entries()) {
    const conditions = (family.conditions || []).filter(Boolean);
    const label = [family.relationship, conditions.join(', ')]
      .filter(Boolean)
      .join(': ');
    const id = stableId(`family-${index}-${JSON.stringify(family)}`);
    addClinicalDocument({
      resourceType: 'familymemberhistory',
      id,
      date: source.exportDate,
      displayName: label || family.relationship || 'Family history',
      raw: {
        resourceType: 'FamilyMemberHistory',
        id,
        status: 'completed',
        patient: { reference: `Patient/${userId}` },
        name: family.name || undefined,
        relationship: { text: family.relationship },
        deceasedBoolean:
          family.status?.toLowerCase() === 'deceased' || undefined,
        condition: conditions.map((condition) => ({
          code: { text: condition },
        })),
        note: [{ text: `Source status: ${family.status || 'not specified'}` }],
      },
    });
  }
}

function addTestResults(results) {
  for (const [index, result] of results.entries()) {
    const reportId = stableId(
      `result-${index}-${result.name}-${result.date}-${result.collectionDate}`,
    );
    const resultRefs = [];
    const contextComponents = [];
    for (const [componentIndex, component] of (
      result.components || []
    ).entries()) {
      if (isLabContextComponent(component.name)) {
        contextComponents.push(component);
        continue;
      }
      const obsId = stableId(
        `component-${index}-${componentIndex}-${component.name}-${component.value}`,
      );
      const loinc = labLoinc(component.name || result.name);
      resultRefs.push({ reference: `Observation/${obsId}` });
      addClinicalDocument({
        resourceType: 'observation',
        id: obsId,
        date: result.collectionDate || result.date,
        displayName: component.name || result.name,
        raw: {
          resourceType: 'Observation',
          id: obsId,
          status: 'final',
          category: [{ text: 'laboratory' }],
          code: {
            text: component.name || result.name,
            coding: loinc
              ? [
                  {
                    system: 'http://loinc.org',
                    code: loinc,
                    display: component.name || result.name,
                  },
                ]
              : undefined,
          },
          effectiveDateTime: normalizeDateTime(
            result.collectionDate || result.date,
          ),
          ...labObservationValue(
            component.name || result.name,
            component.value,
            component.unit,
          ),
          referenceRange: buildLabReferenceRange(
            component.referenceRange,
            component.unit,
          ),
          interpretation: component.isAbnormal
            ? [{ text: 'abnormal' }]
            : undefined,
          note: [
            result.name ? { text: `Panel: ${result.name}` } : undefined,
            component.referenceRange
              ? { text: `Reference range: ${component.referenceRange}` }
              : undefined,
          ].filter(Boolean),
        },
        metadata: {
          manual_specialty: 'laboratory',
          loinc_coding: loinc ? [loinc] : undefined,
        },
      });
    }
    addClinicalDocument({
      resourceType: 'diagnosticreport',
      id: reportId,
      date: result.collectionDate || result.date,
      displayName: result.name || 'Test result',
      raw: {
        resourceType: 'DiagnosticReport',
        id: reportId,
        status: 'final',
        code: { text: result.name || 'Test result' },
        effectiveDateTime: normalizeDateTime(
          result.collectionDate || result.date,
        ),
        issued: normalizeDateTime(result.date),
        result: resultRefs.length ? resultRefs : undefined,
        conclusion: result.narrative || undefined,
        note: contextComponents.length
          ? contextComponents.map((component) => ({
              text: `${component.name}: ${formatLabContextComponent(component)}`,
            }))
          : undefined,
        presentedForm: result.narrative
          ? [
              {
                contentType: 'text/plain',
                data: Buffer.from(result.narrative, 'utf8').toString('base64'),
                title: `${result.name || 'Test result'} narrative`,
              },
            ]
          : undefined,
      },
    });
  }
}

function addRawExportDocument(rawExport, filePath) {
  const rel = relative(sourceDir, filePath);
  const id = stableId(`raw-export-${rel}`);
  addClinicalDocument({
    resourceType: 'documentreference',
    id,
    date: rawExport.exportDate,
    displayName: rel,
    raw: {
      resourceType: 'DocumentReference',
      id,
      status: 'current',
      type: { text: 'Raw source export' },
      date: normalizeDateTime(rawExport.exportDate),
      content: [
        {
          attachment: {
            contentType: 'application/json',
            title: rel,
            data: Buffer.from(
              JSON.stringify(rawExport, null, 2),
              'utf8',
            ).toString('base64'),
          },
        },
      ],
    },
  });
}

function addSiblingJsonDocuments(root) {
  for (const file of walkFiles(root)) {
    if (file === jsonPath) continue;
    if (extname(file).toLowerCase() !== '.json') continue;
    if (basename(file).startsWith('.')) continue;
    const rel = relative(root, file);
    const bytes = readFileSync(file);
    const id = stableId(`json-source-${rel}`);
    addClinicalDocument({
      resourceType: 'documentreference',
      id,
      date: source.exportDate,
      displayName: rel,
      raw: {
        resourceType: 'DocumentReference',
        id,
        status: 'current',
        type: { text: 'Additional source export' },
        date: normalizeDateTime(source.exportDate),
        content: [
          {
            attachment: {
              contentType: 'application/json',
              title: rel,
              data: bytes.toString('base64'),
            },
          },
        ],
      },
      metadata: {
        source_file: rel,
        source_size: statSync(file).size,
      },
    });
  }
}

function addMyHealthRecordsExports(root) {
  for (const file of walkFiles(root)) {
    if (extname(file).toLowerCase() !== '.json') continue;
    if (!/^myhealth_records_export(?: copy)?\.json$/i.test(basename(file)))
      continue;
    const rel = relative(root, file);
    const exportData = JSON.parse(readFileSync(file, 'utf8'));
    addMyHealthLabRecords(exportData, rel);
    addMyHealthMedicationRecords(exportData, rel);
    addMyHealthImmunizationRecords(exportData, rel);
    addMyHealthReferralRecords(exportData, rel);
  }
}

function addMyHealthLabRecords(exportData, sourceFile) {
  for (const row of myHealthLabRows(exportData)) {
    const date = row.whenDate || row.when || row.itemDate || source.exportDate;
    const displayName = row.name || row.group || 'Lab result';
    const isDiagnostic =
      row.codeFamily === 'DI-status' ||
      row.attachmentName ||
      /^MRI|^GR |^KNEE|^US |^CT |^XR/i.test(row.group || '');
    if (isDiagnostic) {
      const id = stableId(
        `myhealth-diagnostic-${row.resultUniqueId || `${row.group}-${date}`}`,
      );
      addClinicalDocument({
        resourceType: 'diagnosticreport',
        id,
        date,
        displayName,
        raw: {
          resourceType: 'DiagnosticReport',
          id,
          status: normalizeReportStatus(row.status),
          code: {
            text: displayName,
            coding: row.code
              ? [
                  {
                    system:
                      'https://myhealthrecords.alberta.ca/codes/diagnostic-imaging',
                    code: row.code,
                    display: displayName,
                  },
                ]
              : undefined,
          },
          effectiveDateTime: normalizeDateTime(date),
          performer: row.orderBy ? [{ display: row.orderBy }] : undefined,
          presentedForm: row.attachmentName
            ? [
                {
                  contentType: 'application/pdf',
                  title: row.attachmentName,
                  url: row.attachmentUrl,
                },
              ]
            : undefined,
          note: myHealthNotes([
            ['Ordered by', row.orderedBy],
            ['Source', row.source],
            ['Result id', row.resultUniqueId],
          ]),
        },
        metadata: myHealthMetadata(sourceFile, row),
      });
      continue;
    }

    const existing = findClinicalDocument('observation', displayName, date);
    if (existing) {
      enrichExistingMyHealthObservation(existing, row, sourceFile);
      continue;
    }

    const id = stableId(
      `myhealth-lab-${row.resultUniqueId || `${displayName}-${date}-${row.value}`}`,
    );
    const loinc = normalizedLoincForMyHealthRow(row);
    addClinicalDocument({
      resourceType: 'observation',
      id,
      date,
      displayName,
      raw: {
        resourceType: 'Observation',
        id,
        status: 'final',
        category: [{ text: 'laboratory' }],
        code: {
          text: displayName,
          coding: loinc
            ? [
                {
                  system: 'http://loinc.org',
                  code: loinc,
                  display: displayName,
                },
              ]
            : undefined,
        },
        effectiveDateTime: normalizeDateTime(date),
        ...labObservationValue(
          displayName,
          row.rawValue || row.value,
          row.unit,
        ),
        referenceRange: buildLabReferenceRange(row.range, row.unit),
        interpretation: row.abnormal
          ? [{ text: cleanText(row.abnormal) }]
          : undefined,
        note: myHealthNotes([
          ['Panel', row.group],
          ['Laboratory', row.lab],
          ['Ordered by', row.orderedBy],
          ['Source code', row.code],
          ['Source', row.source],
          ['Result id', row.resultUniqueId],
        ]),
      },
      metadata: {
        ...myHealthMetadata(sourceFile, row),
        manual_specialty: 'laboratory',
        loinc_coding: loinc ? [loinc] : undefined,
      },
    });
  }
}

function addMyHealthMedicationRecords(exportData, sourceFile) {
  const medications = Array.isArray(exportData.medications)
    ? exportData.medications
    : asArray(exportData.medications?.Medication);
  for (const [index, med] of medications.entries()) {
    const name =
      scalar(med.name) ||
      scalar(med.Name) ||
      scalar(med['Generic Name']) ||
      'Medication';
    const date =
      scalar(med['Date Started']) ||
      scalar(med.dateStarted) ||
      source.exportDate;
    const id = stableId(
      `myhealth-med-${index}-${name}-${date}-${scalar(med.Instructions)}`,
    );
    addClinicalDocument({
      resourceType: 'medicationstatement',
      id,
      date,
      displayName: name,
      raw: {
        resourceType: 'MedicationStatement',
        id,
        status: 'active',
        medicationCodeableConcept: { text: name },
        subject: { reference: `Patient/${userId}` },
        effectiveDateTime: normalizeDateTime(date),
        dosage: scalar(med.Instructions)
          ? [{ text: scalar(med.Instructions) }]
          : undefined,
        note: myHealthNotes([
          ['Generic name', scalar(med['Generic Name'])],
          ['Source', scalar(med.Source)],
        ]),
      },
      metadata: {
        terminology_source: 'AHS MyHealth Records JSON',
        source_file: sourceFile,
        source_category: 'medications',
      },
    });
  }
}

function addMyHealthImmunizationRecords(exportData, sourceFile) {
  const immunizations = Array.isArray(exportData.immunizations)
    ? exportData.immunizations
    : asArray(exportData.immunizations?.Immunization);
  for (const [index, immunization] of immunizations.entries()) {
    const name =
      scalar(immunization.name) || scalar(immunization.Name) || 'Immunization';
    const date =
      scalar(immunization.date) ||
      scalar(immunization.Date) ||
      source.exportDate;
    const id = stableId(`myhealth-immunization-${index}-${name}-${date}`);
    addClinicalDocument({
      resourceType: 'immunization',
      id,
      date,
      displayName: name,
      raw: {
        resourceType: 'Immunization',
        id,
        status: 'completed',
        vaccineCode: { text: name },
        patient: { reference: `Patient/${userId}` },
        occurrenceDateTime: normalizeDateTime(date),
        note: myHealthNotes([
          ['Info', scalar(immunization.info)],
          ['Source', scalar(immunization.source)],
        ]),
      },
      metadata: {
        terminology_source: 'AHS MyHealth Records JSON',
        source_file: sourceFile,
        source_category: 'immunizations',
      },
    });
  }
}

function addMyHealthReferralRecords(exportData, sourceFile) {
  for (const referral of asArray(exportData.referrals?.Referral)) {
    const reason = scalar(referral.Reason) || 'Referral';
    const date = scalar(referral.DateSubmitted) || source.exportDate;
    const id = stableId(
      `myhealth-referral-${scalar(referral.ReferralID) || reason}-${date}`,
    );
    addClinicalDocument({
      resourceType: 'servicerequest',
      id,
      date,
      displayName: reason,
      raw: {
        resourceType: 'ServiceRequest',
        id,
        status: normalizeServiceRequestStatus(scalar(referral.ReferralStatus)),
        intent: 'order',
        subject: { reference: `Patient/${userId}` },
        code: { text: reason },
        authoredOn: normalizeDateTime(date),
        requester: scalar(referral.ReferredbyProviderName)
          ? { display: scalar(referral.ReferredbyProviderName) }
          : undefined,
        performer: scalar(referral.ReceivingFacilityName)
          ? [{ display: scalar(referral.ReceivingFacilityName) }]
          : undefined,
        note: myHealthNotes([
          ['Referral ID', scalar(referral.ReferralID)],
          ['Status', scalar(referral.ReferralStatus)],
          ['Status reason', scalar(referral.ReferralStatusReason)],
          ['Last update', scalar(referral.DisplayLastUpdateDate)],
        ]),
      },
      metadata: {
        terminology_source: 'AHS MyHealth Records JSON',
        source_file: sourceFile,
        source_category: 'referrals',
      },
    });
  }
}

function addFileDocuments(root, { baseDir = root, prefix = '' } = {}) {
  if (!root || !existsSync(root)) return;
  for (const file of walkFiles(root)) {
    if (basename(file).startsWith('.')) continue;
    if (file === jsonPath) continue;
    const rel = prefix
      ? join(prefix, relative(root, file))
      : relative(baseDir, file);
    if (rel.includes(`${basename(outputPath)}`)) continue;
    const ext = extname(file).toLowerCase();
    if (
      !['.pdf', '.tif', '.tiff', '.html', '.htm', '.xml', '.txt'].includes(ext)
    )
      continue;
    if (basename(file).toUpperCase() === 'STYLE.XSL') continue;
    const bytes = readFileSync(file);
    const id = stableId(`file-${rel}`);
    const mime = mimeType(ext);
    const xml = ext === '.xml' ? bytes.toString('utf8') : undefined;
    const xmlTitle = xml ? extractXmlTitle(xml) : undefined;
    const extractedText = extractLocalDocumentText(file);
    const content = [
      {
        attachment: {
          contentType: mime,
          title: rel,
          data: bytes.toString('base64'),
        },
      },
    ];
    if (extractedText.text) {
      content.push({
        attachment: {
          contentType: 'text/plain',
          title: `${rel} extracted text`,
          data: Buffer.from(extractedText.text, 'utf8').toString('base64'),
        },
      });
    }
    addClinicalDocument({
      resourceType: 'documentreference',
      id,
      date: xmlTitle?.date || source.exportDate,
      displayName: xmlTitle?.title || rel,
      raw: {
        resourceType: 'DocumentReference',
        id,
        status: 'current',
        type: { text: ext === '.xml' ? 'C-CDA document' : 'Source file' },
        date: normalizeDateTime(xmlTitle?.date || source.exportDate),
        content,
        description: extractedText.text
          ? `Local text extraction (${extractedText.method}) captured ${extractedText.text.length} characters.`
          : undefined,
      },
      metadata: {
        source_file: rel,
        source_size: statSync(file).size,
        local_text_extraction_method: extractedText.method,
        local_text_extraction_chars: extractedText.text?.length,
        local_text_extraction_error: extractedText.error,
      },
    });
  }
}

function addHealthSummaryExtractedRecords(summaryDir) {
  if (!summaryDir || !existsSync(summaryDir)) return;
  const ccdaDir = args.ccdaDir
    ? resolve(args.ccdaDir)
    : discoverCcdaDirectory(summaryDir);
  addCcdaExtractedRecords(ccdaDir, dirname(summaryDir));
}

function addCcdaExtractedRecords(ccdaDir, baseDir = sourceDir) {
  if (!existsSync(ccdaDir)) return;

  for (const file of readdirSync(ccdaDir).filter((name) =>
    /^DOC\d+\.XML$/i.test(name),
  )) {
    const rel = relative(baseDir, join(ccdaDir, file));
    const xml = readFileSync(join(ccdaDir, file), 'utf8');
    const docDate = extractXmlTitle(xml)?.date || source.exportDate;
    const sections = extractCcdaSections(xml);

    for (const section of sections) {
      switch (section.title.toLowerCase()) {
        case 'active problems':
        case 'resolved problems':
        case 'visit diagnoses':
        case 'admitting diagnoses':
          addCcdaConditions(section, docDate, rel);
          break;
        case 'medications':
        case 'ordered prescriptions':
        case 'medications at time of discharge':
        case 'administered medications':
          addCcdaMedications(section, docDate, rel);
          break;
        case 'immunizations':
          addCcdaImmunizations(section, docDate, rel);
          break;
        case 'procedures':
          addCcdaProcedures(section, docDate, rel);
          break;
        case 'encounter details':
        case 'encounters':
          addCcdaEncounters(section, docDate, rel);
          break;
        case 'reason for visit':
          addCcdaReasonForVisit(section, docDate, rel);
          break;
        case 'results':
        case 'last filed vital signs':
          addCcdaResults(section, docDate, rel);
          break;
        case 'plan of treatment':
        case 'discharge instructions':
          addCcdaCarePlan(section, docDate, rel);
          break;
        case 'insurance':
          addCcdaCoverage(section, docDate, rel);
          break;
        case 'advance directives':
          addCcdaConsent(section, docDate, rel);
          break;
        case 'social history':
          addCcdaSocialHistory(section, docDate, rel);
          break;
        case 'care teams':
          addCcdaCareTeams(section, docDate, rel);
          break;
        default:
          break;
      }
    }
  }
}

function addSourceProvenance() {
  const id = stableId(`provenance-${source.exportSource}-${source.exportDate}`);
  addClinicalDocument({
    resourceType: 'provenance',
    id,
    date: source.exportDate,
    displayName: source.exportSource || 'Source export provenance',
    raw: {
      resourceType: 'Provenance',
      id,
      recorded: normalizeDateTime(source.exportDate),
      target: [{ reference: `Patient/${userId}` }],
      agent: [
        {
          type: { text: 'source' },
          who: { display: sourceLabel },
        },
      ],
      entity: [
        {
          role: 'source',
          what: { display: jsonPath },
        },
      ],
    },
    metadata: {
      source_system: source.exportSource,
      source_exported_at: source.exportDate,
    },
  });
}

function addCcdaConditions(section, fallbackDate, sourceFile) {
  for (const row of rowsForSection(section)) {
    const name = row.Problem || row.Diagnosis || row[0];
    if (!isMeaningfulText(name)) continue;
    const date =
      row['Noted Date'] || row['Diagnosed Date'] || row['Start Date'];
    const id = stableId(`ccda-condition-${name}-${date || ''}`);
    addClinicalDocument({
      resourceType: 'condition',
      id,
      date: parseAnyDate(date) || fallbackDate,
      displayName: cleanText(name),
      raw: {
        resourceType: 'Condition',
        id,
        clinicalStatus: {
          text: section.title.includes('Resolved') ? 'resolved' : 'active',
        },
        code: { text: cleanText(name) },
        subject: { reference: `Patient/${userId}` },
        onsetDateTime: parseAnyDate(date),
        note: [{ text: `Extracted from ${section.title} in ${sourceFile}` }],
      },
      metadata: ccdaMetadata(sourceFile, section.title),
    });
    incrementCcdaCount('condition');
  }
}

function addCcdaMedications(section, fallbackDate, sourceFile) {
  for (const row of rowsForSection(section)) {
    const name = row.Medication || row[0];
    if (!isMeaningfulText(name)) continue;
    const sig = row.Sig || row.Instructions || row[1];
    const start = row['Start Date'] || extractParentheticalDate(row[1]);
    const end = row['End Date'];
    const status = row.Status || section.title;
    const id = stableId(
      `ccda-medication-${section.title}-${name}-${sig || ''}-${start || ''}`,
    );
    addClinicalDocument({
      resourceType: 'medicationstatement',
      id,
      date: parseAnyDate(start) || fallbackDate,
      displayName: cleanText(name),
      raw: {
        resourceType: 'MedicationStatement',
        id,
        status: medicationStatus(status),
        medicationCodeableConcept: { text: cleanText(name) },
        subject: { reference: `Patient/${userId}` },
        effectivePeriod: {
          start: parseAnyDate(start),
          end: parseAnyDate(end),
        },
        dosage: sig ? [{ text: cleanText(sig) }] : undefined,
        note: [{ text: `Extracted from ${section.title} in ${sourceFile}` }],
      },
      metadata: ccdaMetadata(sourceFile, section.title),
    });
    incrementCcdaCount('medicationstatement');
  }
}

function addCcdaImmunizations(section, fallbackDate, sourceFile) {
  for (const row of rowsForSection(section)) {
    const vaccine = row.Immunization || row[0];
    if (!isMeaningfulText(vaccine)) continue;
    const dates = splitDates(row['Administration Dates'] || row[1]);
    for (const date of dates.length ? dates : [undefined]) {
      const id = stableId(`ccda-immunization-${vaccine}-${date || ''}`);
      addClinicalDocument({
        resourceType: 'immunization',
        id,
        date: parseAnyDate(date) || fallbackDate,
        displayName: cleanText(vaccine),
        raw: {
          resourceType: 'Immunization',
          id,
          status: 'completed',
          vaccineCode: { text: cleanText(vaccine) },
          patient: { reference: `Patient/${userId}` },
          occurrenceDateTime: parseAnyDate(date),
          note: [{ text: `Extracted from ${section.title} in ${sourceFile}` }],
        },
        metadata: ccdaMetadata(sourceFile, section.title),
      });
      incrementCcdaCount('immunization');
    }
  }
}

function addCcdaProcedures(section, fallbackDate, sourceFile) {
  for (const row of rowsForSection(section)) {
    const name = row['Procedure Name'] || row.Procedure || row[0];
    if (!isMeaningfulText(name)) continue;
    const date = row['Date/Time'] || row.Date || row[2] || row[1];
    const id = stableId(`ccda-procedure-${name}-${date || ''}`);
    addClinicalDocument({
      resourceType: 'procedure',
      id,
      date: parseAnyDate(date) || fallbackDate,
      displayName: cleanText(name),
      raw: {
        resourceType: 'Procedure',
        id,
        status: 'completed',
        code: { text: cleanText(name) },
        subject: { reference: `Patient/${userId}` },
        performedDateTime: parseAnyDate(date),
        note: [{ text: `Extracted from ${section.title} in ${sourceFile}` }],
      },
      metadata: ccdaMetadata(sourceFile, section.title),
    });
    incrementCcdaCount('procedure');
  }
}

function addCcdaEncounters(section, fallbackDate, sourceFile) {
  for (const row of rowsForSection(section)) {
    const description = row.Description || row.Type || row[1] || 'Encounter';
    const date = row.Date || row[0];
    if (!isMeaningfulText(description) && !isMeaningfulText(date)) continue;
    const id = stableId(`ccda-encounter-${description}-${date || ''}`);
    addClinicalDocument({
      resourceType: 'encounter',
      id,
      date: parseAnyDate(date) || fallbackDate,
      displayName: cleanText(description || 'Encounter'),
      raw: {
        resourceType: 'Encounter',
        id,
        status: 'finished',
        class: { display: cleanText(row.Type || 'Encounter') },
        subject: { reference: `Patient/${userId}` },
        period: { start: parseAnyDate(date) },
        location: row.Department
          ? [{ location: { display: cleanText(row.Department) } }]
          : undefined,
        reasonCode: row.Description
          ? [{ text: cleanText(row.Description) }]
          : undefined,
        note: [{ text: `Extracted from ${section.title} in ${sourceFile}` }],
      },
      metadata: ccdaMetadata(sourceFile, section.title),
    });
    incrementCcdaCount('encounter');
  }
}

function addCcdaReasonForVisit(section, fallbackDate, sourceFile) {
  const text = sectionText(section.xml);
  if (!isMeaningfulText(text)) return;
  const id = stableId(
    `ccda-reason-for-visit-${sourceFile}-${text.slice(0, 160)}`,
  );
  addClinicalDocument({
    resourceType: 'encounter',
    id,
    date: fallbackDate,
    displayName: 'Reason for Visit',
    raw: {
      resourceType: 'Encounter',
      id,
      status: 'finished',
      class: { display: 'Reason for Visit' },
      subject: { reference: `Patient/${userId}` },
      period: { start: normalizeDateTime(fallbackDate) },
      reasonCode: [{ text }],
      note: [{ text: `Extracted from ${section.title} in ${sourceFile}` }],
    },
    metadata: ccdaMetadata(sourceFile, section.title),
  });
  incrementCcdaCount('encounter');
}

function addCcdaResults(section, fallbackDate, sourceFile) {
  const rows = rowsForSection(section);
  if (section.title === 'Last Filed Vital Signs') {
    addCcdaVitalSigns(section, fallbackDate, sourceFile);
    return;
  }

  const resultItems = extractResultItems(section.xml);
  for (const result of resultItems) {
    const existing = findDiagnosticReportForCcdaResult(result);
    if (existing) {
      mergeCcdaResultIntoDiagnosticReport(
        existing,
        result,
        sourceFile,
        section.title,
      );
      continue;
    }
    const id = stableId(
      `ccda-result-${result.title}-${result.date || ''}-${result.narrative.slice(0, 80)}`,
    );
    addClinicalDocument({
      resourceType: 'diagnosticreport',
      id,
      date: parseAnyDate(result.date) || fallbackDate,
      displayName: cleanText(result.title || 'C-CDA result'),
      raw: {
        resourceType: 'DiagnosticReport',
        id,
        status: 'final',
        code: { text: cleanText(result.title || 'C-CDA result') },
        effectiveDateTime: parseAnyDate(result.date) || fallbackDate,
        conclusion: result.narrative || undefined,
        presentedForm: result.narrative
          ? [
              {
                contentType: 'text/plain',
                data: Buffer.from(result.narrative, 'utf8').toString('base64'),
                title: `${cleanText(result.title || 'C-CDA result')} narrative`,
              },
            ]
          : undefined,
      },
      metadata: {
        ...ccdaMetadata(sourceFile, section.title),
        manual_specialty: result.modality ? 'imaging' : undefined,
        manual_imaging_details: result.modality
          ? {
              modality: result.modality,
              studyType: cleanText(result.title),
              accessionId: result.accession,
              bodySite: inferBodySite(result.title + ' ' + result.narrative),
            }
          : undefined,
      },
    });
    incrementCcdaCount('diagnosticreport');
  }
}

function addCcdaVitalSigns(section, fallbackDate, sourceFile) {
  for (const row of vitalRowsForSection(section)) {
    const name = cleanText(row['Vital Sign']);
    const reading = cleanText(row.Reading);
    if (!isMeaningfulText(name) || !isMeaningfulText(reading)) continue;

    const takenAt = parseAnyDate(row['Time Taken']) || fallbackDate;
    const coding = vitalCoding(name);
    const id = stableId(
      `ccda-vital-${name}-${reading}-${row['Time Taken'] || ''}`,
    );
    addClinicalDocument({
      resourceType: 'observation',
      id,
      date: takenAt,
      displayName: name,
      raw: {
        resourceType: 'Observation',
        id,
        status: 'final',
        category: [
          {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
              },
            ],
            text: 'Vital Signs',
          },
        ],
        code: {
          text: name,
          coding: coding
            ? [{ system: 'http://loinc.org', code: coding, display: name }]
            : undefined,
        },
        effectiveDateTime: takenAt,
        ...vitalObservationValue(name, reading),
        note: [
          row.Comments ? { text: cleanText(row.Comments) } : undefined,
          { text: `Extracted from ${section.title} in ${sourceFile}` },
        ].filter(Boolean),
      },
      metadata: {
        ...ccdaMetadata(sourceFile, section.title),
        manual_specialty: 'vitals',
        loinc_coding: coding ? [coding] : undefined,
      },
    });
    incrementCcdaCount('observation');
  }
}

function addCcdaCarePlan(section, fallbackDate, sourceFile) {
  const text = sectionText(section.xml);
  if (!isMeaningfulText(text)) return;
  const id = stableId(`ccda-careplan-${section.title}-${text.slice(0, 160)}`);
  addClinicalDocument({
    resourceType: 'careplan',
    id,
    date: fallbackDate,
    displayName: section.title,
    raw: {
      resourceType: 'CarePlan',
      id,
      status: 'active',
      intent: 'plan',
      subject: { reference: `Patient/${userId}` },
      description: text,
    },
    metadata: ccdaMetadata(sourceFile, section.title),
  });
  incrementCcdaCount('careplan');
}

function addCcdaCoverage(section, fallbackDate, sourceFile) {
  const rows = rowsForSection(section);
  const text = sectionText(section.xml);
  for (const [index, row] of rows.entries()) {
    const payer = row.Payer || row['Insurance'] || row['Plan'] || row[0];
    if (!isMeaningfulText(payer)) continue;
    const id = stableId(
      `ccda-coverage-${payer}-${row['Policy Number'] || row[1] || index}`,
    );
    addClinicalDocument({
      resourceType: 'coverage',
      id,
      date: fallbackDate,
      displayName: cleanText(payer),
      raw: {
        resourceType: 'Coverage',
        id,
        status: 'active',
        beneficiary: { reference: `Patient/${userId}` },
        payor: [{ display: cleanText(payer) }],
        subscriberId: cleanText(row['Policy Number'] || row['Member ID'] || ''),
        class: row.Plan
          ? [{ type: { text: 'plan' }, value: cleanText(row.Plan) }]
          : undefined,
        text: text ? { status: 'generated', div: text } : undefined,
      },
      metadata: ccdaMetadata(sourceFile, section.title),
    });
    incrementCcdaCount('coverage');
  }
}

function addCcdaConsent(section, fallbackDate, sourceFile) {
  const text = sectionText(section.xml);
  if (!isMeaningfulText(text)) return;
  const id = stableId(`ccda-consent-${section.title}-${text.slice(0, 160)}`);
  const directiveRows = rowsForSection(section);
  const directives = directiveRows
    .map((row) =>
      [row.Directive, row.Description, row.Status, row[0], row[1]]
        .filter(isMeaningfulText)
        .map(cleanText)
        .join(' - '),
    )
    .filter(isMeaningfulText);
  addClinicalDocument({
    resourceType: 'consent',
    id,
    date: fallbackDate,
    displayName: section.title,
    raw: {
      resourceType: 'Consent',
      id,
      status: 'active',
      scope: { text: 'Advance directive' },
      category: [
        {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
              code: 'acd',
              display: 'Advance Care Directive',
            },
          ],
          text: 'Advance directive',
        },
      ],
      patient: { reference: `Patient/${userId}` },
      dateTime: fallbackDate,
      policyText: directives.length ? directives.join('\n') : text,
      provision: directives.length
        ? {
            type: 'permit',
            provision: directives.map((directive) => ({
              type: 'permit',
              code: [{ text: directive }],
            })),
          }
        : undefined,
      sourceAttachment: {
        contentType: 'text/plain',
        data: Buffer.from(text, 'utf8').toString('base64'),
        title: `${section.title} from ${sourceFile}`,
      },
    },
    metadata: ccdaMetadata(sourceFile, section.title),
  });
  incrementCcdaCount('consent');
}

function addCcdaCareTeams(section, fallbackDate, sourceFile) {
  const rows = rowsForSection(section);
  if (rows.length === 0) return;
  const id = stableId(
    `ccda-careteam-${sourceFile}-${sectionText(section.xml).slice(0, 120)}`,
  );
  const participants = rows
    .map((row) => {
      const member = cleanText(row['Team Member'] || row[0]);
      if (!member) return undefined;
      const phones = [
        ...member.matchAll(/\d{3}-\d{3}-\d{4}(?:\s+\([^)]+\))?/g),
      ].map((m) => m[0]);
      const displayName = member
        .replace(/\d{3}-\d{3}-\d{4}(?:\s+\([^)]+\))?/g, '')
        .trim();
      return {
        role: [
          {
            text: [row.Relationship, row.Specialty]
              .filter(isMeaningfulText)
              .map(cleanText)
              .join(' - '),
          },
        ],
        member: { display: displayName || member },
        period: {
          start: parseAnyDate(row['Start Date']),
          end: parseAnyDate(row['End Date']),
        },
        extension: phones.map((phone) => ({
          url: 'https://mere.health/fhir/StructureDefinition/care-team-contact',
          valueString: phone,
        })),
      };
    })
    .filter(Boolean);

  if (participants.length === 0) return;
  addClinicalDocument({
    resourceType: 'careteam',
    id,
    date: parseAnyDate(rows[0]['Start Date']) || fallbackDate,
    displayName: 'Care Team',
    raw: {
      resourceType: 'CareTeam',
      id,
      status: 'active',
      name: 'Care Team',
      subject: { reference: `Patient/${userId}` },
      participant: participants,
      managingOrganization: [{ display: 'Alberta Health Services' }],
      period: { start: parseAnyDate(rows[0]['Start Date']) },
    },
    metadata: ccdaMetadata(sourceFile, section.title),
  });
  incrementCcdaCount('careteam');
}

function addCcdaSocialHistory(section, fallbackDate, sourceFile) {
  for (const row of rowsForSection(section)) {
    const entries = socialHistoryEntries(row);
    for (const entry of entries) {
      const id = stableId(
        `ccda-social-${entry.name}-${entry.value}-${entry.date || ''}`,
      );
      addClinicalDocument({
        resourceType: 'observation',
        id,
        date: parseAnyDate(entry.date) || fallbackDate,
        displayName: entry.name,
        raw: {
          resourceType: 'Observation',
          id,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'social-history',
                  display: 'Social History',
                },
              ],
              text: 'Social History',
            },
          ],
          code: entry.code
            ? {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: entry.code,
                    display: entry.name,
                  },
                ],
                text: entry.name,
              }
            : { text: entry.name },
          subject: { reference: `Patient/${userId}` },
          effectiveDateTime: parseAnyDate(entry.date) || fallbackDate,
          valueString: entry.value,
          note: [{ text: `Extracted from ${section.title} in ${sourceFile}` }],
        },
        metadata: {
          ...ccdaMetadata(sourceFile, section.title),
          loinc_coding: entry.code ? [entry.code] : undefined,
        },
      });
      incrementCcdaCount('observation');
    }
  }
}

function addCompanionResourcesForLooseFiles(root) {
  for (const file of walkFiles(root)) {
    const rel = relative(root, file);
    const name = basename(file).toLowerCase();
    if (
      name.startsWith('.') ||
      !['.pdf', '.tif', '.tiff', '.html', '.htm'].includes(
        extname(file).toLowerCase(),
      )
    )
      continue;
    if (rel.includes('HealthSummary/')) continue;
    const extractedText = extractLocalDocumentText(file).text;
    const extractedTextNote = extractedText
      ? { text: compactText(extractedText, 4000) }
      : undefined;

    if (name.includes('knee') || name.includes('ecg')) {
      const modality = name.includes('ecg') ? 'ECG' : inferModality(name);
      const id = stableId(`loose-diagnostic-${rel}`);
      addClinicalDocument({
        resourceType: 'diagnosticreport',
        id,
        date: source.exportDate,
        displayName: basename(file, extname(file)),
        raw: {
          resourceType: 'DiagnosticReport',
          id,
          status: 'final',
          code: { text: basename(file, extname(file)) },
          effectiveDateTime: normalizeDateTime(source.exportDate),
          conclusion: extractedText
            ? compactText(extractedText, 4000)
            : undefined,
          presentedForm: [
            { contentType: mimeType(extname(file).toLowerCase()), title: rel },
            extractedText
              ? {
                  contentType: 'text/plain',
                  title: `${rel} extracted text`,
                  data: Buffer.from(extractedText, 'utf8').toString('base64'),
                }
              : undefined,
          ].filter(Boolean),
        },
        metadata: {
          manual_specialty: 'imaging',
          manual_imaging_details: {
            modality,
            studyType: basename(file, extname(file)),
            bodySite: inferBodySite(name),
          },
          source_file: rel,
        },
      });
    } else if (name.includes('consent')) {
      const id = stableId(`loose-consent-${rel}`);
      addClinicalDocument({
        resourceType: 'consent',
        id,
        date: source.exportDate,
        displayName: basename(file, extname(file)),
        raw: {
          resourceType: 'Consent',
          id,
          status: 'active',
          scope: { text: 'Procedure consent' },
          category: [{ text: 'Procedure consent' }],
          patient: { reference: `Patient/${userId}` },
          policyText: extractedText
            ? compactText(extractedText, 4000)
            : undefined,
          sourceAttachment: {
            contentType: mimeType(extname(file).toLowerCase()),
            title: rel,
          },
        },
        metadata: { source_file: rel },
      });
    } else if (name.includes('prescription')) {
      const id = stableId(`loose-prescription-${rel}`);
      addClinicalDocument({
        resourceType: 'medicationrequest',
        id,
        date: source.exportDate,
        displayName: basename(file, extname(file)),
        raw: {
          resourceType: 'MedicationRequest',
          id,
          status: 'unknown',
          intent: 'order',
          subject: { reference: `Patient/${userId}` },
          medicationCodeableConcept: { text: 'Prescription document' },
          note: [
            extractedTextNote || {
              text: `Medication details require OCR/manual review of ${rel}`,
            },
          ],
        },
        metadata: { source_file: rel },
      });
    } else if (name.includes('treatment plan')) {
      const id = stableId(`loose-careplan-${rel}`);
      addClinicalDocument({
        resourceType: 'careplan',
        id,
        date: source.exportDate,
        displayName: basename(file, extname(file)),
        raw: {
          resourceType: 'CarePlan',
          id,
          status: 'unknown',
          intent: 'plan',
          subject: { reference: `Patient/${userId}` },
          description: extractedText
            ? compactText(extractedText, 4000)
            : `Treatment plan document preserved at ${rel}; clinical details require PDF text extraction/manual review.`,
        },
        metadata: { source_file: rel },
      });
    }
  }
}

function buildReport() {
  const resourceCounts = {};
  const ccdaResourceCounts = {};
  const localTextDocuments = clinicalDocuments.filter(
    (d) => d.metadata?.local_text_extraction_chars,
  );
  const labDocuments = clinicalDocuments.filter(
    (d) =>
      d.data_record.resource_type === 'observation' &&
      d.metadata?.manual_specialty === 'laboratory',
  );
  const codedLabDocuments = labDocuments.filter(
    (d) => d.metadata?.loinc_coding?.length,
  );
  for (const doc of clinicalDocuments) {
    const type = doc.data_record.resource_type;
    resourceCounts[type] = (resourceCounts[type] || 0) + 1;
    if (doc.metadata?.terminology_source === 'AHS MyChart C-CDA') {
      ccdaResourceCounts[type] = (ccdaResourceCounts[type] || 0) + 1;
    }
  }
  const sourceKeys = [...new Set(collectPaths(source))].sort();
  return `# AHS/MyChart emrpkg support review

Generated package: ${outputPath}
Source JSON: ${jsonPath}

## Imported content

- User rows: 1
- Connection rows: 1
- Clinical documents: ${clinicalDocuments.length}
- Source test results: ${source.testResults?.results?.length || 0}
- Source result components: ${(source.testResults?.results || []).reduce((sum, r) => sum + (r.components || []).length, 0)}
- IHE/XDM XML files preserved as DocumentReference attachments: ${clinicalDocuments.filter((d) => d.data_record.resource_type === 'documentreference' && d.metadata?.source_file?.endsWith('.XML')).length}
- Other source files preserved as DocumentReference attachments: ${clinicalDocuments.filter((d) => d.data_record.resource_type === 'documentreference' && d.metadata?.source_file && !d.metadata.source_file.endsWith('.XML')).length}
- C-CDA extracted first-class records: ${Object.values(ccdaResourceCounts).reduce((sum, count) => sum + count, 0)}
- Files with local text extraction/OCR: ${localTextDocuments.length}
- Extracted local text characters: ${localTextDocuments.reduce((sum, d) => sum + (d.metadata.local_text_extraction_chars || 0), 0)}
- Laboratory observations with LOINC coding: ${codedLabDocuments.length} of ${labDocuments.length}
- Laboratory observations still uncoded: ${labDocuments.length - codedLabDocuments.length}

## C-CDA extraction mix

${
  Object.entries(ccdaResourceCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([type, count]) => `- ${type}: ${count}`)
    .join('\n') || '- none'
}

## Resource mix

${Object.entries(resourceCounts)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}

## Source fields found

${sourceKeys.map((key) => `- ${key}`).join('\n')}

## Gaps to support better

- Empty letter placeholders are preserved in the raw JSON export when present, but there is no letter-specific data to model unless the source JSON contains letter content.
- C-CDA XML files are preserved as attachments and the builder now extracts common clinical rows into first-class records, including insurance, advance directives, care-team members, and social-history observations. Remaining C-CDA work is deeper coding/normalization of those extracted records.
- PDF text extraction and TIFF OCR are attempted locally with installed command-line tools (\`pdftotext\`, \`tesseract\`). Extracted text is embedded as additional \`text/plain\` DocumentReference content and mirrored into companion DiagnosticReport/Consent/MedicationRequest/CarePlan records where applicable. Deeper semantic structuring of free text should remain review-gated.
- Lab components have name, value, unit, referenceRange, and abnormal flag. A conservative offline LOINC map is applied for common labs; fuller terminology enrichment still needs a curated licensed LOINC release or terminology service.
- Family history maps to FamilyMemberHistory and has timeline display. It is not yet part of the Summary tab.
- AHS/MyChart-specific provenance is represented as a Provenance record plus connection/source metadata, but there is still no dedicated first-class AHS connection source type in the connection UI.
`;
}

function myHealthLabRows(exportData) {
  const rows = [];
  for (const item of asArray(exportData.labResults?.LabTestResultsItem)) {
    for (const group of asArray(item.Group?.LabTestGroup)) {
      const attachment = group.attachment?.['d5p1:PHRAttachment'];
      for (const result of asArray(group.Results?.LabTestResult)) {
        rows.push({
          group: scalar(group.GroupName),
          itemDate:
            scalar(item.LabResultDisplayDateText) ||
            scalar(item.LabResultDisplayDate) ||
            scalar(item.LabResultDate),
          orderBy: scalar(item.OrderByType),
          orderedBy: scalar(item.OrderedByName),
          source: scalar(item.Source),
          lab: scalar(item.LaboratoryName) || scalar(group.LaboratoryName),
          name:
            scalar(result.Name) ||
            scalar(result.ClinicalCode?.Text) ||
            scalar(group.GroupName),
          code: scalar(result.ClinicalCode?.Code?.Code?.Value),
          codeFamily: scalar(result.ClinicalCode?.Code?.Code?.Family),
          displayDate: scalar(result.DisplayDate),
          when: scalar(result.When),
          whenDate: scalar(result.WhenDate),
          status: scalar(result.LabOrderStatus) || scalar(group.LabOrderStatus),
          value:
            scalar(result.Values?.DisplayValue) || scalar(result.Values?.Value),
          rawValue: scalar(result.Values?.Value),
          range: scalar(result.Values?.RangeDisplayText),
          unit: scalar(result.Values?.UnitText),
          abnormal: scalar(result.AbnormalityIndicator),
          resultUniqueId: scalar(result.ResultUniqueId),
          attachmentName: scalar(attachment?.['d5p1:Name']),
          attachmentUrl: scalar(attachment?.['d5p1:DownloadUrl']),
        });
      }
    }
  }
  return rows;
}

function findClinicalDocument(resourceType, displayName, date) {
  const targetDate = dateOnly(normalizeDateTime(date));
  const targetName = cleanText(displayName).toLowerCase();
  return clinicalDocuments.find(
    (doc) =>
      doc.data_record?.resource_type === resourceType &&
      cleanText(doc.metadata?.display_name).toLowerCase() === targetName &&
      dateOnly(normalizeDateTime(doc.metadata?.date)) === targetDate,
  );
}

function enrichExistingMyHealthObservation(document, row, sourceFile) {
  const resource =
    document.data_record.raw.resource || document.data_record.raw;
  if (row.range && !resource.referenceRange) {
    resource.referenceRange = buildLabReferenceRange(row.range, row.unit);
  }
  const loinc = normalizedLoincForMyHealthRow(row);
  if (
    loinc &&
    !resource.code?.coding?.some(
      (coding) => coding.system === 'http://loinc.org' && coding.code === loinc,
    )
  ) {
    resource.code = resource.code || { text: row.name };
    resource.code.coding = [
      ...(resource.code.coding || []),
      { system: 'http://loinc.org', code: loinc, display: row.name },
    ];
  }
  resource.note = [
    ...(resource.note || []),
    ...myHealthNotes([
      ['AHS MyHealth panel', row.group],
      ['AHS MyHealth laboratory', row.lab],
      ['AHS MyHealth source code', row.code],
      ['AHS MyHealth result id', row.resultUniqueId],
    ]),
  ];
  document.metadata = {
    ...document.metadata,
    source_file: document.metadata.source_file || sourceFile,
    source_lab_code: row.code || document.metadata.source_lab_code,
    source_lab_panel: row.group || document.metadata.source_lab_panel,
    source_laboratory: row.lab || document.metadata.source_laboratory,
    myhealth_result_unique_id:
      row.resultUniqueId || document.metadata.myhealth_result_unique_id,
    loinc_coding: loinc
      ? [...new Set([...(document.metadata.loinc_coding || []), loinc])]
      : document.metadata.loinc_coding,
  };
}

function findDiagnosticReportForCcdaResult(result) {
  const resultDay = dateOnly(parseAnyDate(result.date));
  const resultName = normalizeReportName(result.title);
  if (!resultDay || !resultName) return undefined;

  return clinicalDocuments.find((doc) => {
    if (doc.data_record?.resource_type !== 'diagnosticreport') return false;
    const docDay = dateOnly(normalizeDateTime(doc.metadata?.date));
    if (docDay !== resultDay) return false;
    const docName = normalizeReportName(doc.metadata?.display_name);
    return (
      docName === resultName ||
      docName.includes(resultName) ||
      resultName.includes(docName)
    );
  });
}

function mergeCcdaResultIntoDiagnosticReport(
  document,
  result,
  sourceFile,
  sectionTitle,
) {
  const resource =
    document.data_record.raw.resource || document.data_record.raw;
  const title = cleanText(
    result.title || document.metadata?.display_name || 'C-CDA result',
  );
  if (result.narrative && !resource.conclusion) {
    resource.conclusion = result.narrative;
  }
  if (result.narrative) {
    const presentedForm = resource.presentedForm || [];
    const hasNarrative = presentedForm.some(
      (form) =>
        form.contentType === 'text/plain' &&
        form.title === `${title} narrative`,
    );
    if (!hasNarrative) {
      resource.presentedForm = [
        ...presentedForm,
        {
          contentType: 'text/plain',
          data: Buffer.from(result.narrative, 'utf8').toString('base64'),
          title: `${title} narrative`,
        },
      ];
    }
  }
  promoteBestPresentedTextToConclusion(resource);
  resource.note = [
    ...(resource.note || []),
    ...myHealthNotes([
      ['C-CDA source file', sourceFile],
      ['C-CDA section', sectionTitle],
      ['Accession', result.accession],
    ]),
  ];
  document.metadata = {
    ...document.metadata,
    ccda_source_file: sourceFile,
    ccda_section: sectionTitle,
    manual_specialty:
      document.metadata.manual_specialty ||
      (result.modality ? 'imaging' : undefined),
    manual_imaging_details: {
      ...(document.metadata.manual_imaging_details || {}),
      modality:
        document.metadata.manual_imaging_details?.modality || result.modality,
      studyType: document.metadata.manual_imaging_details?.studyType || title,
      accessionId:
        document.metadata.manual_imaging_details?.accessionId ||
        result.accession,
      bodySite:
        document.metadata.manual_imaging_details?.bodySite ||
        inferBodySite(`${result.title} ${result.narrative}`),
    },
  };
}

function consolidateDiagnosticReports() {
  const groups = new Map();
  for (const doc of clinicalDocuments) {
    if (doc.data_record?.resource_type !== 'diagnosticreport') continue;
    const key = diagnosticConsolidationKey(doc);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  }

  for (const docs of groups.values()) {
    if (docs.length < 2) continue;
    const target =
      docs.find(
        (doc) =>
          doc.metadata?.terminology_source === 'AHS MyHealth Records JSON',
      ) ||
      docs.find((doc) =>
        (
          doc.data_record.raw.resource || doc.data_record.raw
        ).presentedForm?.some((form) => form.url),
      ) ||
      docs[0];
    for (const doc of docs) {
      if (doc === target) continue;
      mergeDiagnosticReportDocument(target, doc);
      const index = clinicalDocuments.indexOf(doc);
      if (index >= 0) clinicalDocuments.splice(index, 1);
      clinicalDocumentIds.delete(doc.id);
    }
  }
}

function mergeDiagnosticReportDocument(target, sourceDocument) {
  const targetResource =
    target.data_record.raw.resource || target.data_record.raw;
  const sourceResource =
    sourceDocument.data_record.raw.resource || sourceDocument.data_record.raw;
  if (
    sourceResource.conclusion &&
    (!targetResource.conclusion ||
      sourceResource.conclusion.length > targetResource.conclusion.length)
  ) {
    targetResource.conclusion = sourceResource.conclusion;
  }
  targetResource.presentedForm = mergePresentedForms(
    targetResource.presentedForm || [],
    sourceResource.presentedForm || [],
  );
  promoteBestPresentedTextToConclusion(targetResource);
  targetResource.note = mergeNotes(
    targetResource.note || [],
    sourceResource.note || [],
  );
  target.metadata = {
    ...target.metadata,
    ccda_source_file:
      target.metadata.ccda_source_file ||
      sourceDocument.metadata?.ccda_source_file ||
      sourceDocument.metadata?.source_file,
    ccda_section:
      target.metadata.ccda_section ||
      sourceDocument.metadata?.ccda_section ||
      sourceDocument.metadata?.manual_subtype,
    manual_specialty:
      target.metadata.manual_specialty ||
      sourceDocument.metadata?.manual_specialty,
    manual_imaging_details: {
      ...(sourceDocument.metadata?.manual_imaging_details || {}),
      ...(target.metadata.manual_imaging_details || {}),
    },
  };
}

function promoteBestPresentedTextToConclusion(resource) {
  const candidates = (resource.presentedForm || [])
    .filter((form) => form.contentType === 'text/plain' && form.data)
    .map((form) => Buffer.from(form.data, 'base64').toString('utf8').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (
    candidates[0] &&
    (!resource.conclusion || candidates[0].length > resource.conclusion.length)
  ) {
    resource.conclusion = candidates[0];
  }
}

function mergePresentedForms(left, right) {
  const out = [...left];
  for (const form of right) {
    const key = `${form.contentType || ''}|${form.title || ''}|${form.url || ''}|${form.data ? 'data' : ''}`;
    const exists = out.some(
      (item) =>
        `${item.contentType || ''}|${item.title || ''}|${item.url || ''}|${item.data ? 'data' : ''}` ===
        key,
    );
    if (!exists) out.push(form);
  }
  return out.length ? out : undefined;
}

function mergeNotes(left, right) {
  const seen = new Set();
  return [...left, ...right].filter((note) => {
    const text = note?.text;
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  });
}

function diagnosticConsolidationKey(document) {
  const date = dateOnly(normalizeDateTime(document.metadata?.date));
  const name = document.metadata?.display_name;
  const key = reportSemanticKey(name);
  return date && key ? `${date}|${key}` : undefined;
}

function reportSemanticKey(value) {
  const normalized = normalizeReportName(value);
  const body = inferBodySite(normalized) || '';
  const modality = inferModality(normalized) || '';
  if (!body || !modality) return undefined;
  const skyline = normalized.includes('skyline') ? '|skyline' : '';
  return `${modality.toLowerCase()}|${body}${skyline}`;
}

function normalizeReportName(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\bmr knee\b/g, 'mri knee')
    .replace(/\bus knee\b/g, 'knee us')
    .replace(/\bof knee\b/g, 'knee')
    .replace(/\s+-\s+(efw|jhc|rca|cchc)$/i, '')
    .replace(/\s+-\s+final result.*$/i, '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedLoincForMyHealthRow(row) {
  return (
    labLoinc(row.name) ||
    (row.codeFamily === 'Lab-Test-Results' && isLikelyLoinc(row.code)
      ? row.code
      : undefined)
  );
}

function isLikelyLoinc(code) {
  return /^\d{1,6}-\d$/.test(String(code || ''));
}

function myHealthMetadata(sourceFile, row) {
  return {
    terminology_source: 'AHS MyHealth Records JSON',
    source_file: sourceFile,
    source_category:
      row.codeFamily === 'DI-status' || row.attachmentName
        ? 'diagnostic-imaging'
        : 'labs',
    source_lab_code: row.code,
    source_lab_panel: row.group,
    source_laboratory: row.lab,
    myhealth_result_unique_id: row.resultUniqueId,
  };
}

function myHealthNotes(pairs) {
  return pairs
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([label, value]) => ({ text: `${label}: ${value}` }));
}

function asArray(value) {
  const item = scalar(value);
  if (item === undefined) return [];
  return Array.isArray(item) ? item : [item];
}

function scalar(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value;
  if (value['@attributes']?.['i:nil'] === 'true') return undefined;
  if (Object.keys(value).length === 0) return undefined;
  return value;
}

function normalizeReportStatus(status) {
  return cleanText(status).toLowerCase().includes('final')
    ? 'final'
    : 'unknown';
}

function normalizeServiceRequestStatus(status) {
  const label = cleanText(status).toLowerCase();
  if (label.includes('cancel')) return 'revoked';
  if (label.includes('complete')) return 'completed';
  return 'active';
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg
      .slice(2)
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    out[key] = argv[i + 1];
    i++;
  }
  return out;
}

function discoverSourceJson(root) {
  const candidates = walkFiles(root).filter((file) => {
    const name = basename(file);
    return (
      extname(file).toLowerCase() === '.json' &&
      !name.startsWith('.') &&
      !name.toLowerCase().includes('report')
    );
  });

  if (candidates.length === 0) {
    throw new Error(`No source JSON file found under ${root}`);
  }

  const scored = candidates.map((file) => {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8'));
      const componentCount = (parsed.testResults?.results || []).reduce(
        (sum, result) => sum + (result.components || []).length,
        0,
      );
      const resultCount = parsed.testResults?.results?.length || 0;
      const patientScore = parsed.patient ? 10 : 0;
      return { file, score: componentCount * 10 + resultCount + patientScore };
    } catch {
      return { file, score: -1 };
    }
  });

  scored.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
  if (scored[0].score < 0) {
    throw new Error(`No readable source JSON file found under ${root}`);
  }
  return scored[0].file;
}

function discoverHealthSummaryDirectory(root) {
  const direct = join(root, 'HealthSummary');
  if (existsSync(direct)) return direct;

  const candidates = walkDirectories(root)
    .filter((dir) => basename(dir).toLowerCase() === 'healthsummary')
    .map((dir) => ({
      dir,
      docCount: countCcdaDocs(discoverCcdaDirectory(dir)),
    }));

  candidates.sort(
    (a, b) => b.docCount - a.docCount || a.dir.localeCompare(b.dir),
  );
  return candidates[0]?.dir;
}

function discoverCcdaDirectory(root) {
  const explicit =
    basename(root).toLowerCase() === 'healthsummary'
      ? join(root, 'IHE_XDM')
      : join(root, 'HealthSummary', 'IHE_XDM');
  const searchRoot = existsSync(explicit) ? explicit : root;
  const candidates = [];

  for (const dir of walkDirectories(searchRoot)) {
    const docCount = countCcdaDocs(dir);
    if (docCount > 0) candidates.push({ dir, docCount });
  }

  candidates.sort(
    (a, b) => b.docCount - a.docCount || a.dir.localeCompare(b.dir),
  );
  return candidates[0]?.dir || join(root, 'HealthSummary', 'IHE_XDM');
}

function countCcdaDocs(dir) {
  if (!dir || !existsSync(dir)) return 0;
  return readdirSync(dir).filter((name) => /^DOC\d+\.XML$/i.test(name)).length;
}

function walkDirectories(dir) {
  const out = [dir];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walkDirectories(p));
  }
  return out;
}

function isInsidePath(child, parent) {
  const rel = relative(parent, child);
  return rel === '' || (!!rel && !rel.startsWith('..') && !rel.startsWith('/'));
}

function stableId(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 32);
}

function parseDate(value) {
  if (!value) return undefined;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/');
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }
  if (/^\d{1,2}\/[A-Za-z]{3}\/\d{4}$/.test(value)) {
    const [day, mon, year] = value.split('/');
    const month = String(
      [
        'jan',
        'feb',
        'mar',
        'apr',
        'may',
        'jun',
        'jul',
        'aug',
        'sep',
        'oct',
        'nov',
        'dec',
      ].indexOf(mon.toLowerCase()) + 1,
    ).padStart(2, '0');
    return `${year}-${month}-${day.padStart(2, '0')}T00:00:00.000Z`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function normalizeDateTime(value) {
  return parseDate(value) || source.exportDate || new Date(now).toISOString();
}

function dateOnly(value) {
  return value?.slice(0, 10);
}

function normalizeGender(value) {
  const v = String(value || '').toLowerCase();
  if (['male', 'female', 'other', 'unknown'].includes(v)) return v;
  return undefined;
}

function parseQuantity(value) {
  const match = String(value)
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
  if (!match) return { value: undefined, unit: String(value) };
  return {
    value: Number(match[1]),
    unit: match[2] || undefined,
    code: match[2] || undefined,
    system: match[2] ? 'http://unitsofmeasure.org' : undefined,
  };
}

function observationValue(value, unit) {
  const parsed = parseQuantity([value, unit].filter(Boolean).join(' '));
  if (parsed.value !== undefined && !Number.isNaN(parsed.value)) {
    return { valueQuantity: parsed };
  }
  return {
    valueString: value === undefined || value === null ? '' : String(value),
  };
}

function vitalObservationValue(name, reading) {
  const label = cleanText(name).toLowerCase();
  const value = cleanText(reading);
  const bp = value.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (bp && label.includes('blood pressure')) {
    return {
      component: [
        {
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '8480-6',
                display: 'Systolic blood pressure',
              },
            ],
            text: 'Systolic blood pressure',
          },
          valueQuantity: {
            value: Number(bp[1]),
            unit: 'mmHg',
            system: 'http://unitsofmeasure.org',
            code: 'mm[Hg]',
          },
        },
        {
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '8462-4',
                display: 'Diastolic blood pressure',
              },
            ],
            text: 'Diastolic blood pressure',
          },
          valueQuantity: {
            value: Number(bp[2]),
            unit: 'mmHg',
            system: 'http://unitsofmeasure.org',
            code: 'mm[Hg]',
          },
        },
      ],
    };
  }
  return observationValue(value.replace(/(\d)%$/, '$1 %'), '');
}

function labObservationValue(name, value, unit) {
  const label = cleanText(name).toLowerCase();
  const stringValue =
    value === undefined || value === null ? '' : String(value).trim();
  if (label.includes('dose date')) {
    return { valueString: normalizeSplitDateValue(value, unit) || stringValue };
  }
  if (label.includes('dose time')) {
    return { valueString: normalizeTimeValue(stringValue) || stringValue };
  }
  if (label === 'nrbc' && /^</.test(stringValue)) {
    return { valueString: stringValue };
  }
  return observationValue(value, unit);
}

function buildLabReferenceRange(rangeText, unit) {
  const text = cleanText(rangeText);
  if (!text) return undefined;

  const parsed = parseLabReferenceRange(text);
  return [
    {
      text,
      low:
        parsed?.low !== undefined
          ? { value: parsed.low, unit: parsed.unit || unit || undefined }
          : undefined,
      high:
        parsed?.high !== undefined
          ? { value: parsed.high, unit: parsed.unit || unit || undefined }
          : undefined,
      extension: buildReferenceRangeExtensions(parsed),
    },
  ];
}

function parseLabReferenceRange(rangeText) {
  const normalized = cleanText(rangeText)
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .replace(/[–—]/g, '-')
    .replace(/,/g, '');
  const number = '(-?\\d+(?:\\.\\d+)?)';
  const unitMatch = normalized.match(
    new RegExp(
      `${number}\\s*(?:-|to|<=|<|>=|>)?\\s*${number}?\\s*([^\\d<>=\\-]+)?$`,
      'i',
    ),
  );
  const unit =
    cleanText(unitMatch?.[3]).replace(/^[()]+|[()]+$/g, '') || undefined;

  const lteMatch = normalized.match(new RegExp(`^(<=|<)\\s*${number}`));
  if (lteMatch?.[1] && lteMatch[2]) {
    return {
      high: Number(lteMatch[2]),
      unit,
      upperBoundExclusive: lteMatch[1] === '<',
    };
  }

  const gteMatch = normalized.match(new RegExp(`^(>=|>)\\s*${number}`));
  if (gteMatch?.[1] && gteMatch[2]) {
    return {
      low: Number(gteMatch[2]),
      unit,
      lowerBoundExclusive: gteMatch[1] === '>',
    };
  }

  const rangeMatch = normalized.match(
    new RegExp(`${number}\\s*(?:-|to)\\s*${number}`, 'i'),
  );
  if (rangeMatch?.[1] && rangeMatch[2]) {
    return {
      low: Number(rangeMatch[1]),
      high: Number(rangeMatch[2]),
      unit,
      lowerBoundExclusive: false,
      upperBoundExclusive: false,
    };
  }

  return undefined;
}

function buildReferenceRangeExtensions(parsed) {
  if (!parsed) return undefined;
  const extensions = [
    parsed.lowerBoundExclusive !== undefined
      ? {
          url: 'https://meremedical.co/fhir/StructureDefinition/reference-range-lower-bound-exclusive',
          valueBoolean: parsed.lowerBoundExclusive,
        }
      : undefined,
    parsed.upperBoundExclusive !== undefined
      ? {
          url: 'https://meremedical.co/fhir/StructureDefinition/reference-range-upper-bound-exclusive',
          valueBoolean: parsed.upperBoundExclusive,
        }
      : undefined,
  ].filter(Boolean);
  return extensions.length ? extensions : undefined;
}

function isLabContextComponent(name) {
  const label = cleanText(name).toLowerCase();
  return [
    'hours fasting',
    'lithium dose date',
    'lithium dose time',
    'time taken',
  ].includes(label);
}

function formatLabContextComponent(component) {
  const label = cleanText(component.name).toLowerCase();
  const value =
    component.value === undefined || component.value === null
      ? ''
      : String(component.value).trim();
  const unit =
    component.unit === undefined || component.unit === null
      ? ''
      : String(component.unit).trim();
  if (label.includes('dose date')) {
    return (
      normalizeSplitDateValue(value, unit) ||
      [value, unit].filter(Boolean).join(' ')
    );
  }
  if (label.includes('dose time')) {
    return normalizeTimeValue(value) || value;
  }
  return [value, unit].filter(Boolean).join(' ');
}

function normalizeSplitDateValue(value, unit) {
  const date = `${value || ''}${unit || ''}`.replace(/\s+/g, '');
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
}

function normalizeTimeValue(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 3) return `0${digits[0]}:${digits.slice(1)}`;
  if (digits.length === 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return undefined;
}

function extractLocalDocumentText(file) {
  const ext = extname(file).toLowerCase();
  try {
    if (ext === '.pdf' && commandExists('pdftotext')) {
      const text = execFileSync('pdftotext', ['-layout', file, '-'], {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      });
      return { method: 'pdftotext', text: cleanExtractedText(text) };
    }
    if (['.tif', '.tiff'].includes(ext) && commandExists('tesseract')) {
      const text = execFileSync('tesseract', [file, 'stdout', '-l', 'eng'], {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      });
      return { method: 'tesseract', text: cleanExtractedText(text) };
    }
    if (['.html', '.htm'].includes(ext)) {
      const html = readFileSync(file, 'utf8');
      return { method: 'html-text', text: cleanExtractedText(stripHtml(html)) };
    }
  } catch (error) {
    return {
      method:
        ext === '.pdf'
          ? 'pdftotext'
          : ['.tif', '.tiff'].includes(ext)
            ? 'tesseract'
            : 'html-text',
      error: error.message,
    };
  }
  return {};
}

function commandExists(command) {
  try {
    execFileSync('/usr/bin/which', [command], {
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"');
}

function cleanExtractedText(text) {
  const cleaned = String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
  return cleaned.length >= 12 ? cleaned : undefined;
}

function compactText(text, limit) {
  const cleaned = cleanExtractedText(text) || '';
  return cleaned.length > limit
    ? `${cleaned.slice(0, limit - 20).trim()}\n[truncated]`
    : cleaned;
}

function labLoinc(name) {
  const normalized = cleanText(name).toLowerCase();
  for (const [label, code] of LOINC_BY_LAB_NAME.entries()) {
    if (normalized === label.toLowerCase()) return code;
  }
  return undefined;
}

function vitalCoding(name) {
  const normalized = cleanText(name).toLowerCase();
  return {
    'blood pressure': '85354-9',
    pulse: '8867-4',
    temperature: '8310-5',
    'respiratory rate': '9279-1',
    'oxygen saturation': '2708-6',
    weight: '29463-7',
    height: '8302-2',
    'body mass index': '39156-5',
  }[normalized];
}

function socialHistoryEntries(row) {
  const entries = [];
  if (isMeaningfulText(row['Tobacco Use'])) {
    entries.push({
      name: 'Tobacco smoking status',
      code: '72166-2',
      value: row['Tobacco Use'],
      date: row.Date,
    });
  }
  if (isMeaningfulText(row['Alcohol Use'])) {
    entries.push({
      name: 'Alcohol use',
      value: [row['Alcohol Use'], row['Standard Drinks/Week']]
        .filter(isMeaningfulText)
        .join('; '),
      date: row['Date Recorded'],
    });
  }
  if (isMeaningfulText(row['Alcohol Habits'])) {
    entries.push({
      name: row['Alcohol Habits'],
      value: row.Answer,
      date: row['Date Recorded'],
    });
  }
  if (
    isMeaningfulText(row[0]) &&
    isMeaningfulText(row[1]) &&
    entries.length === 0
  ) {
    entries.push({ name: row[0], value: row[1], date: row[2] });
  }
  return entries.filter((entry) => isMeaningfulText(entry.value));
}

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

function mimeType(ext) {
  return (
    {
      '.pdf': 'application/pdf',
      '.tif': 'image/tiff',
      '.tiff': 'image/tiff',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.xml': 'application/xml',
      '.txt': 'text/plain',
      '.json': 'application/json',
    }[ext] || 'application/octet-stream'
  );
}

function extractXmlTitle(xml) {
  const title = xml.match(/<title>([^<]*)<\/title>/)?.[1];
  const value = xml.match(/<effectiveTime[^>]*value="([^"]+)"/)?.[1];
  return { title, date: parseCdaDate(value) };
}

function extractCcdaSections(xml) {
  const sections = [];
  const re = /<section\b[\s\S]*?<\/section>/g;
  let match;
  while ((match = re.exec(xml))) {
    const sectionXml = match[0];
    const title = decodeXml(
      sectionXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '',
    ).trim();
    const code = sectionXml.match(/<code\b[^>]*code="([^"]+)"/)?.[1];
    if (title) sections.push({ title, code, xml: sectionXml });
  }
  return sections;
}

function rowsForSection(section) {
  const tableRows = [...section.xml.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(
    (match) => extractCells(match[0]),
  );
  if (tableRows.length > 1) {
    const headers = tableRows[0].map((cell) => cell.text);
    return tableRows
      .slice(1)
      .map((cells) => rowFromCells(headers, cells))
      .filter((row) => Object.values(row).some(isMeaningfulText));
  }

  return [...section.xml.matchAll(/<item\b[\s\S]*?<\/item>/g)]
    .map((match) => itemToRow(match[0]))
    .filter((row) => Object.values(row).some(isMeaningfulText));
}

function vitalRowsForSection(section) {
  const textXml =
    section.xml.match(/<text\b[^>]*>([\s\S]*?)<\/text>/)?.[1] || section.xml;
  const firstTable = textXml.match(/<table\b[\s\S]*?<\/table>/)?.[0] || '';
  const tableRows = [...firstTable.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(
    (match) => extractCells(match[0]),
  );
  if (tableRows.length <= 1) return [];
  const headers = tableRows[0].map((cell) => cell.text);
  return tableRows
    .slice(1)
    .map((cells) => rowFromCells(headers, cells))
    .filter((row) => Object.values(row).some(isMeaningfulText));
}

function extractCells(rowXml) {
  return [...rowXml.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/g)].map(
    (match) => ({
      text: cleanText(match[1]),
      id: match[0].match(/\bID="([^"]+)"/)?.[1],
    }),
  );
}

function rowFromCells(headers, cells) {
  const row = {};
  cells.forEach((cell, index) => {
    const key = cleanText(headers[index] || `${index}`);
    row[key] = cell.text;
    row[index] = cell.text;
  });
  return row;
}

function itemToRow(itemXml) {
  const bold = cleanText(
    itemXml.match(
      /<content\b[^>]*styleCode="Bold"[^>]*>([\s\S]*?)<\/content>/,
    )?.[1] || '',
  );
  const text = cleanText(itemXml);
  const row = { 0: bold || text };
  const started = text.match(/\bStarted\s+([^)]+)/i)?.[1];
  const given = text.match(/\bGiven\s+([^)]+)/i)?.[1];
  const performed = text.match(/\bPerformed\s+([^)]+)/i)?.[1];
  if (started) row['Start Date'] = started;
  if (given) row['Administration Dates'] = given;
  if (performed) row['Date/Time'] = performed;
  const sig = cleanText(
    itemXml.match(/<paragraph\b[^>]*>([\s\S]*?)<\/paragraph>/)?.[1] || '',
  );
  if (sig) row.Sig = sig;
  if (bold) {
    row.Medication = bold;
    row.Immunization = bold;
    row['Procedure Name'] = bold;
  }
  return row;
}

function extractResultItems(sectionXml) {
  const items = [...sectionXml.matchAll(/<item\b[\s\S]*?<\/item>/g)];
  return items
    .map((match) => {
      const itemXml = match[0];
      const title = cleanText(
        itemXml.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/)?.[1] ||
          itemXml.match(/<content\b[^>]*>([\s\S]*?)<\/content>/)?.[1] ||
          'C-CDA result',
      );
      const narrative = cleanText(
        itemXml.match(
          /<paragraph\b[^>]*Narrative[^>]*>([\s\S]*?)<\/paragraph>/,
        )?.[1] ||
          itemXml.match(
            /<td\b[^>]*styleCode="xpre"[^>]*>([\s\S]*?)<\/td>/,
          )?.[1] ||
          itemXml,
      );
      return {
        title,
        narrative,
        date:
          title.match(/\(([^)]*\d{4}[^)]*)\)/)?.[1] ||
          narrative.match(/Exam\/Service Date:\s*([^\n]+)/i)?.[1],
        accession: narrative.match(/Accession #\(s\):\s*([^\n]+)/i)?.[1],
        modality: inferModality(title + ' ' + narrative),
      };
    })
    .filter((item) => isMeaningfulText(item.title));
}

function sectionText(xml) {
  return cleanText(xml.match(/<text\b[^>]*>([\s\S]*?)<\/text>/)?.[1] || xml);
}

function ccdaMetadata(sourceFile, sectionTitle) {
  return {
    source_file: sourceFile,
    manual_specialty: 'ccda',
    manual_subtype: sectionTitle,
    terminology_source: 'AHS MyChart C-CDA',
  };
}

function incrementCcdaCount(type) {
  ccdaExtractionCounts[type] = (ccdaExtractionCounts[type] || 0) + 1;
}

function cleanText(value) {
  return decodeXml(String(value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function isMeaningfulText(value) {
  const text = cleanText(value);
  return Boolean(text && text !== '-' && text.toLowerCase() !== 'n/a');
}

function parseAnyDate(value) {
  if (!value) return undefined;
  const text = cleanText(value)
    .replace(/\bMDT\b|\bMST\b/g, '')
    .trim();
  const first = text.split(/\s+-\s+|,/)[0].trim();
  const dayMonthYearTime = first.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/,
  );
  if (dayMonthYearTime) {
    const [, day, month, year, hour, minute] = dayMonthYearTime;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00.000Z`;
  }
  const dayMonthYear = first.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dayMonthYear) {
    const [, day, month, year] = dayMonthYear;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`;
  }
  const dayTextMonthYear = first.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})/);
  if (dayTextMonthYear) {
    const [, day, mon, year] = dayTextMonthYear;
    const month = monthNumber(mon);
    return month
      ? `${year}-${month}-${day.padStart(2, '0')}T00:00:00.000Z`
      : undefined;
  }
  return parseDate(first);
}

function extractParentheticalDate(value) {
  return cleanText(value).match(
    /\((?:Started|Given|Performed)?\s*([^)]*\d{4}[^)]*)\)/i,
  )?.[1];
}

function splitDates(value) {
  return cleanText(value)
    .split(/\s*,\s*|\s+,\s+| and /)
    .map((part) => part.trim())
    .filter(Boolean);
}

function monthNumber(mon) {
  const index = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ].indexOf(mon.toLowerCase());
  return index >= 0 ? String(index + 1).padStart(2, '0') : undefined;
}

function medicationStatus(status) {
  const normalized = cleanText(status).toLowerCase();
  if (normalized.includes('active') || normalized.includes('ordered'))
    return 'active';
  if (normalized.includes('completed') || normalized.includes('discharge'))
    return 'completed';
  return 'unknown';
}

function inferModality(text) {
  const normalized = text.toLowerCase();
  if (/\bmri?\b/.test(normalized) || normalized.includes('magnetic resonance'))
    return 'MRI';
  if (/\bct\b/.test(normalized) || normalized.includes('computed tomography'))
    return 'CT';
  if (/\bus\b/.test(normalized) || normalized.includes('ultrasound'))
    return 'Ultrasound';
  if (
    /\bgr\b/.test(normalized) ||
    normalized.includes('x-ray') ||
    normalized.includes('xray') ||
    normalized.includes('radiograph')
  )
    return 'X-ray';
  if (normalized.includes('ecg') || normalized.includes('ekg')) return 'ECG';
  return undefined;
}

function inferBodySite(text) {
  const normalized = text.toLowerCase();
  for (const site of [
    'knee',
    'abdomen',
    'pelvis',
    'chest',
    'kidney',
    'bladder',
  ]) {
    if (normalized.includes(site)) return site;
  }
  return undefined;
}

function parseCdaDate(value) {
  if (!value || value.length < 8) return undefined;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`;
}

function collectPaths(value, prefix = '') {
  if (Array.isArray(value)) {
    const childPaths = value.flatMap((item) =>
      collectPaths(item, `${prefix}[]`),
    );
    return [prefix, ...childPaths].filter(Boolean);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      collectPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix].filter(Boolean);
}
