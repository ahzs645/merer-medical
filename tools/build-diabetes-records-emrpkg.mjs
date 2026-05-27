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
    const nutritionRelevance = nutritionRelevanceForLab(result);
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
            note: buildNotes([finding.sourceText]),
          },
        },
        metadata: {
          source_report_id: report.id,
          imaging_finding_category: finding.category,
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
    }),
  );
}

for (const group of records.medicationPlans || []) {
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
              ...(item.mappedTo || []).map((target) => `Mapped to: ${target}`),
            ]),
          },
        },
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

function labObservationCode(name) {
  const normalized = name.toLowerCase();
  const codes = {
    'blood type': {
      system: 'http://loinc.org',
      code: '883-9',
      display: 'ABO group',
    },
    'rhesus (d)': {
      system: 'http://loinc.org',
      code: '10331-7',
      display: 'Rh type',
    },
    'c-reactive protein': {
      system: 'http://loinc.org',
      code: '1988-5',
      display: 'C reactive protein',
    },
  };
  return codes[normalized];
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
