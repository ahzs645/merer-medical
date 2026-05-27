#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { strToU8, zipSync } from 'fflate';

const FORMAT_NAME = 'mere-emr-package';
const FORMAT_VERSION = 1;
const args = parseArgs(process.argv.slice(2));

if (!args.source || !args.output) {
  console.error(`Usage:
  node tools/build-diabetes-records-emrpkg.mjs \\
    --source /path/to/medicalRecords.json \\
    --output /path/to/profile.emrpkg \\
    [--first-name First] [--last-name Last] [--profile-id stable-id]

This tool reads a local medicalRecords.json file and writes a Mere .emrpkg.
It does not contain patient data unless you explicitly pass a source file.`);
  process.exit(1);
}

const sourcePath = resolve(args.source);
const outputPath = resolve(args.output);
const records = JSON.parse(readFileSync(sourcePath, 'utf8'));
const now = Date.now();

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

for (const panel of records.labPanels || []) {
  const resultRefs = [];
  for (const result of panel.results || []) {
    const observationId = stableId(`lab-${panel.id}-${result.id}`);
    resultRefs.push({ reference: `Observation/${observationId}` });
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
            code: { text: result.name },
            effectiveDateTime: atNoon(panel.collectedAt),
            issued: atNoon(panel.collectedAt),
            ...observationValue(result.value, result.unit),
            referenceRange: buildReferenceRange(result),
            interpretation:
              result.flag && result.flag !== 'identity'
                ? { text: result.flag }
                : undefined,
            note: buildNotes([
              `Provider: ${panel.provider}`,
              `Source: ${panel.sourceImage}`,
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
          source_panel_id: panel.id,
          source_result_id: result.id,
        },
      }),
    );
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
    }),
  );
}

for (const report of records.imagingReports || []) {
  const reportId = stableId(`imaging-${report.id}`);
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
          conclusion: report.findings?.join('\n'),
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
    }),
  );
}

for (const group of records.medicationPlans || []) {
  for (const item of group.items || []) {
    const medicationId = stableId(`medication-${group.id}-${item.id}`);
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
            effectiveDateTime: atNoon(item.assignedDate || group.encounterDate),
            medicationCodeableConcept: { text: item.medication },
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
              item.plannerImplication,
              item.note,
              ...(item.mappedTo || []).map((target) => `Mapped to: ${target}`),
            ]),
          },
        },
      }),
    );
  }
}

for (const encounter of records.clinicalEncounters || []) {
  const encounterId = stableId(`encounter-${encounter.id}`);
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
            ]),
          ),
        },
      },
    }),
  );
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
      app: { name: 'mere-medical', version: 'diabetes-record-transpose' },
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
    return { high: { value: Number(upper[1]), unit: unit || undefined } };
  const lower = normalized.match(/^>\s*(-?\d+(?:\.\d+)?)/);
  if (lower)
    return { low: { value: Number(lower[1]), unit: unit || undefined } };
  return {};
}

function buildNotes(parts) {
  const text = parts.filter(Boolean).join('\n');
  return text ? [{ text }] : undefined;
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
