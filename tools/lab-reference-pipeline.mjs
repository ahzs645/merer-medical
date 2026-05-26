#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), '..');
const sourceDir = join(repoRoot, 'data', 'lab-reference-sources');
const outputDir = join(repoRoot, 'data', 'lab-reference-imports');

const sources = [
  {
    id: 'rcpa-table-6-chemistry',
    kind: 'clinical-reference',
    parser: 'rcpaChemistry',
    country: 'australian',
    category: 'chemistry',
    licenseRisk: 'permission-gated',
    url: 'https://www.rcpa.edu.au/Manuals/RCPA-Manual/General-Information/IG/Table-6-Harmonised-reference-intervals-for-chem',
  },
  {
    id: 'uk-worcs-full-blood-count',
    kind: 'clinical-reference',
    parser: 'ukWorcsFbc',
    country: 'uk',
    category: 'hematology',
    licenseRisk: 'curated-citation',
    url: 'https://www.worcsacute.nhs.uk/pathology-tests-a-to-z/full-blood-count/',
  },
  {
    id: 'uk-glos-sodium',
    kind: 'clinical-reference',
    parser: 'ukGlosChemistry',
    country: 'uk',
    category: 'chemistry',
    licenseRisk: 'curated-citation',
    url: 'https://www.gloshospitals.nhs.uk/our-services/services-we-offer/pathology/tests-and-investigations/sodium-na/',
  },
  {
    id: 'uk-glos-potassium',
    kind: 'clinical-reference',
    parser: 'ukGlosChemistry',
    country: 'uk',
    category: 'chemistry',
    licenseRisk: 'curated-citation',
    url: 'https://www.gloshospitals.nhs.uk/our-services/services-we-offer/pathology/tests-and-investigations/potassium-k/',
  },
  {
    id: 'uk-glos-albumin',
    kind: 'clinical-reference',
    parser: 'ukGlosChemistry',
    country: 'uk',
    category: 'chemistry',
    licenseRisk: 'curated-citation',
    url: 'https://www.gloshospitals.nhs.uk/our-services/services-we-offer/pathology/tests-and-investigations/albumin/',
  },
  {
    id: 'uk-glos-creatinine-egfr',
    kind: 'clinical-reference',
    parser: 'ukGlosChemistry',
    country: 'uk',
    category: 'chemistry',
    licenseRisk: 'curated-citation',
    url: 'https://www.gloshospitals.nhs.uk/our-services/services-we-offer/pathology/tests-and-investigations/creatinine-and-egfr-ckd-epi/',
  },
  {
    id: 'uk-glos-thyroid',
    kind: 'clinical-reference',
    parser: 'ukGlosChemistry',
    country: 'uk',
    category: 'chemistry',
    licenseRisk: 'curated-citation',
    url: 'https://www.gloshospitals.nhs.uk/our-services/services-we-offer/pathology/tests-and-investigations/thyroid-function-tests-tsh-ft4-ft3/',
  },
  {
    id: 'caliper-database',
    kind: 'link-only',
    parser: 'profileOnly',
    licenseRisk: 'permission-gated-platform-specific',
    url: 'https://caliperproject.ca/caliper/database/',
  },
  {
    id: 'merck-lab-reference-ranges',
    kind: 'citation-only',
    parser: 'profileOnly',
    licenseRisk: 'do-not-import',
    url: 'https://www.merckmanuals.com/professional/resources/normal-laboratory-values/laboratory-reference-ranges',
  },
  {
    id: 'ohdsi-dqd-thresholds',
    kind: 'plausibility-thresholds',
    parser: 'profileOnly',
    licenseRisk: 'separate-from-reference-standards',
    url: 'https://ohdsi.github.io/DataQualityDashboard/articles/Thresholds.html',
  },
];

const sourceById = new Map(sources.map((source) => [source.id, source]));

function getArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function selectedSources() {
  const sourceId = getArg('source');
  if (!sourceId) return sources;
  const source = sourceById.get(sourceId);
  if (!source) {
    throw new Error(
      `Unknown source ${sourceId}. Known sources: ${sources
        .map((item) => item.id)
        .join(', ')}`,
    );
  }
  return [source];
}

async function main() {
  if (hasFlag('list')) {
    console.log(JSON.stringify(sources, null, 2));
    return;
  }

  const shouldFetch = hasFlag('fetch') || hasFlag('all');
  const shouldAnalyze = hasFlag('analyze') || hasFlag('all');

  if (!shouldFetch && !shouldAnalyze) {
    console.error(
      'Usage: node tools/lab-reference-pipeline.mjs --list | --fetch | --analyze | --all [--source id]',
    );
    process.exit(1);
  }

  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  const picked = selectedSources();
  if (shouldFetch) {
    for (const source of picked) {
      await fetchSource(source);
    }
  }
  if (shouldAnalyze) {
    const analysis = await analyzeSources(picked);
    await writeAnalysis(analysis);
  }
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; Mere lab reference source review pipeline)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`${source.id} fetch failed: ${response.status}`);
  }

  const text = await response.text();
  const path = sourcePath(source);
  const metadataPath = sourceMetadataPath(source);
  await fs.writeFile(path, text);
  await fs.writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        ...source,
        fetchedAt: new Date().toISOString(),
        bytes: Buffer.byteLength(text),
        sha256: sha256(text),
        contentType: response.headers.get('content-type'),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Fetched ${source.id} -> ${path}`);
}

async function analyzeSources(picked) {
  const analysis = {
    generatedAt: new Date().toISOString(),
    purpose:
      'Review candidates extracted from lab reference sources. Outputs are not promoted into app reference standards automatically.',
    sources: [],
    candidates: {},
  };

  for (const source of picked) {
    const html = await ensureSourceHtml(source);
    const text = htmlToText(html);
    const profile = {
      ...source,
      bytes: Buffer.byteLength(html),
      sha256: sha256(html),
      title: extractTitle(html),
      textBytes: Buffer.byteLength(text),
    };

    const parsed = parseSource(source, text);
    analysis.sources.push({
      ...profile,
      parserStatus: parsed.status,
      definitionCount: parsed.definitions.length,
      notes: parsed.notes,
    });

    if (parsed.definitions.length > 0 && source.country && source.category) {
      const key = `${source.country}/${source.category}`;
      analysis.candidates[key] = [
        ...(analysis.candidates[key] || []),
        ...parsed.definitions,
      ];
    }
  }

  return analysis;
}

async function ensureSourceHtml(source) {
  const path = sourcePath(source);
  try {
    return await fs.readFile(path, 'utf8');
  } catch {
    await fetchSource(source);
    return fs.readFile(path, 'utf8');
  }
}

function parseSource(source, text) {
  if (source.parser === 'rcpaChemistry') return parseRcpaChemistry(text);
  if (source.parser === 'ukWorcsFbc') return parseUkWorcsFbc(text);
  if (source.parser === 'ukGlosChemistry') {
    return parseUkGlosChemistry(source.id, text);
  }
  return {
    status: 'profile-only',
    definitions: [],
    notes: [`${source.kind} source is intentionally not converted to ranges.`],
  };
}

async function writeAnalysis(analysis) {
  await fs.rm(join(outputDir, 'referenceStandards'), {
    force: true,
    recursive: true,
  });

  await fs.writeFile(
    join(outputDir, 'source-analysis.json'),
    `${JSON.stringify(analysis, null, 2)}\n`,
  );

  for (const [key, definitions] of Object.entries(analysis.candidates)) {
    const [country, category] = key.split('/');
    const dir = join(outputDir, 'referenceStandards', country);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      join(dir, `${category}.candidates.json`),
      `${JSON.stringify(sortDefinitions(dedupeDefinitions(definitions)), null, 2)}\n`,
    );
  }

  console.log(`Wrote lab reference import review to ${outputDir}`);
}

function parseRcpaChemistry(text) {
  const analytes = [
    {
      testIds: ['sodium'],
      name: 'Sodium',
      header: 'Sodium',
      citationId: 'AUS-RCPA-CHEM-HRI',
      specimen: 'serum/plasma',
    },
    {
      testIds: ['potassium'],
      name: 'Potassium',
      header: 'Potassium',
      citationId: 'AUS-RCPA-CHEM-HRI',
      specimen: 'serum',
    },
    {
      testIds: ['potassium'],
      name: 'Potassium plasma',
      header: 'Potassium',
      occurrence: 2,
      citationId: 'AUS-RCPA-CHEM-HRI',
      specimen: 'plasma',
    },
    {
      testIds: ['chloride'],
      name: 'Chloride',
      header: 'Chloride',
      citationId: 'AUS-RCPA-CHEM-HRI',
    },
    {
      testIds: ['bicarbonate'],
      name: 'Bicarbonate',
      header: 'Bicarbonate',
      citationId: 'AUS-RCPA-CHEM-HRI',
    },
    {
      testIds: ['creatinine'],
      name: 'Creatinine',
      header: 'Creatinine',
      citationId: 'AUS-RCPA-CHEM-HRI',
      method: 'Vitros enzymatic assay',
    },
    {
      testIds: ['calcium'],
      name: 'Calcium',
      header: 'Calcium',
      citationId: 'AUS-RCPA-CHEM-HRI',
    },
    {
      testIds: ['calcium-corrected'],
      name: 'Calcium corrected for albumin',
      header: 'Calcium corrected for albumin',
      citationId: 'AUS-RCPA-CHEM-HRI',
    },
    {
      testIds: ['phosphate'],
      name: 'Phosphate',
      header: 'Phosphate',
      citationId: 'AUS-RCPA-CHEM-HRI',
    },
    {
      testIds: ['magnesium'],
      name: 'Magnesium',
      header: 'Magnesium',
      citationId: 'AUS-RCPA-CHEM-HRI',
    },
    {
      testIds: ['alkaline-phosphatase'],
      name: 'Alkaline phosphatase',
      header: 'Alkaline phosphatase',
      citationId: 'AUS-RCPA-CHEM-HRI',
    },
    {
      testIds: ['alt'],
      name: 'Alanine aminotransferase',
      header: 'Alanine aminotransferase',
      citationId: 'AUS-RCPA-CHEM-HRI',
      method: 'No pyridoxal 5-phosphate',
    },
    {
      testIds: ['ast'],
      name: 'Aspartate aminotransferase',
      header: 'Aspartate aminotransferase',
      citationId: 'AUS-RCPA-CHEM-HRI',
      method: 'No pyridoxal 5-phosphate',
    },
    {
      testIds: ['ggt'],
      name: 'Gamma glutamyltransferase',
      header: 'Gamma glutamyltransferase',
      citationId: 'AUS-RCPA-CHEM-HRI',
    },
    {
      testIds: ['lipase'],
      name: 'Lipase',
      header: 'Lipase',
      citationId: 'AUS-RCPA-CHEM-HRI',
      note: 'Adult serum lipase interval excludes Siemens Dimension and Ortho Clinical Vitros assays.',
    },
  ];

  const definitions = [];
  for (const analyte of analytes) {
    const segment = extractAnalyteSegment(text, analyte.header, analytes, {
      occurrence: analyte.occurrence || 1,
    });
    if (!segment) continue;
    const bands = parseRcpaBands(segment, analyte);
    if (bands.length === 0) continue;
    definitions.push({
      testIds: analyte.testIds,
      name: analyte.name,
      bands,
      sourceReview: {
        status: 'candidate',
        parser: 'rcpaChemistry',
        requiresReview: true,
      },
    });
  }

  return {
    status: definitions.length > 0 ? 'candidate-json' : 'no-ranges-found',
    definitions,
    notes: [
      'RCPA HTML is parseable, but output is review-only because licensing and table parsing need manual QA.',
      'LN-RCPA/LOINC identifiers should be added to alias metadata separately.',
    ],
  };
}

function parseRcpaBands(segment, analyte) {
  const bands = [];
  let currentSex;
  const tokenRegex =
    /\b(Male|Female)\b|(\d+(?:\.\d+)?)([dwy])\s+to\s+<\s*(\d+(?:\.\d+)?)([dwy])\s+([<>]?\d+(?:\.\d+)?)\s*-\s*([<>]?\d+(?:\.\d+)?)\s*(mmol\/L|umol\/L|U\/L|g\/L)/gi;
  for (const match of segment.matchAll(tokenRegex)) {
    if (match[1]) {
      currentSex = match[1].toLowerCase();
      continue;
    }

    const low = Number(match[6].replace(/[<>]/g, ''));
    const high = Number(match[7].replace(/[<>]/g, ''));
    if (!Number.isFinite(low) || !Number.isFinite(high)) continue;

    const ageMin = ageField(Number(match[2]), match[3]);
    const ageMax = ageField(Number(match[4]), match[5]);
    const unit = normalizeUnit(match[8]);

    bands.push({
      label: labelForAgeBand(ageMin, ageMax, currentSex),
      kind: 'range',
      display: `${low}-${high}`,
      unit,
      low,
      high,
      citationId: analyte.citationId,
      ...(currentSex ? { sex: currentSex } : {}),
      ...ageMin.min,
      ...ageMax.max,
      ...(analyte.specimen ? { specimen: analyte.specimen } : {}),
      ...(analyte.method ? { method: analyte.method } : {}),
      ...(analyte.note ? { note: analyte.note } : {}),
    });
  }
  return bands;
}

function parseUkWorcsFbc(text) {
  const requiredTerms = ['Haemoglobin', 'Red Blood Cell Count', 'Platelets'];
  const found = requiredTerms.filter((term) => text.includes(term));
  return {
    status:
      found.length >= 2 ? 'curated-candidate-json' : 'source-shape-changed',
    definitions: ukWorcsFbcDefinitions,
    notes: [
      `Found ${found.length}/${requiredTerms.length} expected Worcestershire FBC terms.`,
      'Definitions are curated from the source page and must be reviewed before promotion.',
    ],
  };
}

function parseUkGlosChemistry(sourceId, text) {
  const definitions = ukGlosChemistryDefinitionsBySource[sourceId] || [];
  const expected = ukGlosExpectedTerms[sourceId] || [];
  const found = expected.filter((term) => text.toLowerCase().includes(term));
  return {
    status:
      definitions.length > 0 && found.length > 0
        ? 'curated-candidate-json'
        : 'source-shape-changed',
    definitions,
    notes: [
      `Found ${found.length}/${expected.length} expected Gloucestershire terms.`,
      'Definitions are curated from individual NHS test pages and must be reviewed before promotion.',
    ],
  };
}

function extractAnalyteSegment(
  text,
  header,
  analytes,
  { occurrence = 1 } = {},
) {
  const starts = [
    ...text.matchAll(new RegExp(`${escapeRegExp(header)} \\(`, 'g')),
  ].map((match) => match.index);
  const start = starts[occurrence - 1];
  if (start === undefined) return undefined;
  const nextStarts = analytes
    .flatMap((item) =>
      [...text.matchAll(new RegExp(`${escapeRegExp(item.header)} \\(`, 'g'))]
        .map((match) => match.index)
        .filter((index) => index > start),
    )
    .sort((a, b) => a - b);
  const end = nextStarts[0] || text.length;
  return text.slice(start, end);
}

function ageField(value, unit) {
  if (unit.toLowerCase() === 'd') {
    return {
      min: { ageMinDays: value },
      max: { ageMaxDays: value },
      label: `${value} day${value === 1 ? '' : 's'}`,
    };
  }
  if (unit.toLowerCase() === 'w') {
    return {
      min: { ageMinWeeks: value },
      max: { ageMaxWeeks: value },
      label: `${value} week${value === 1 ? '' : 's'}`,
    };
  }
  return {
    min: { ageMinYears: value },
    max: { ageMaxYears: value },
    label: `${value} year${value === 1 ? '' : 's'}`,
  };
}

function labelForAgeBand(ageMin, ageMax, sex) {
  const parts = [`${ageMin.label} up to ${ageMax.label}`];
  if (sex) parts.push(sex);
  return parts.join(', ');
}

function sourcePath(source) {
  return join(sourceDir, `${source.id}.html`);
}

function sourceMetadataPath(source) {
  return join(sourceDir, `${source.id}.metadata.json`);
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;|&#8211;|&mdash;|&#8212;/g, '-')
    .replace(/&micro;|µ/g, 'u')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? htmlToText(match[1]) : undefined;
}

function normalizeUnit(unit) {
  return unit.replace('µ', 'u');
}

function sortDefinitions(definitions) {
  return [...definitions].sort((a, b) => a.name.localeCompare(b.name));
}

function dedupeDefinitions(definitions) {
  const byKey = new Map();
  for (const definition of definitions) {
    const key = definition.testIds.join('|');
    if (!byKey.has(key)) {
      byKey.set(key, definition);
      continue;
    }
    const existing = byKey.get(key);
    existing.bands = [...existing.bands, ...definition.bands];
  }
  return [...byKey.values()];
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ukWorcsFbcDefinitions = [
  {
    testIds: ['wbc'],
    name: 'White blood cell count',
    sourceReview: { status: 'candidate', parser: 'ukWorcsFbc' },
    bands: [
      rangeBand(
        '7 days up to 1 month',
        '5.0-21.0',
        '10^9/L',
        5,
        21,
        'UK-WORCS-FBC',
        {
          ageMinDays: 7,
          ageMaxWeeks: 4,
        },
      ),
      rangeBand(
        '1 month up to 6 months',
        '5.0-19.5',
        '10^9/L',
        5,
        19.5,
        'UK-WORCS-FBC',
        {
          ageMinWeeks: 4,
          ageMaxWeeks: 26,
        },
      ),
      rangeBand(
        '6 months up to 4 years',
        '6.0-17.5',
        '10^9/L',
        6,
        17.5,
        'UK-WORCS-FBC',
        {
          ageMinWeeks: 26,
          ageMaxYears: 4,
        },
      ),
      rangeBand(
        '4 years up to 6 years',
        '5.5-15.5',
        '10^9/L',
        5.5,
        15.5,
        'UK-WORCS-FBC',
        {
          ageMinYears: 4,
          ageMaxYears: 6,
        },
      ),
      rangeBand(
        '6 years up to 10 years',
        '5.0-14.5',
        '10^9/L',
        5,
        14.5,
        'UK-WORCS-FBC',
        {
          ageMinYears: 6,
          ageMaxYears: 10,
        },
      ),
      rangeBand(
        '10 years up to 16 years',
        '4.5-13.5',
        '10^9/L',
        4.5,
        13.5,
        'UK-WORCS-FBC',
        {
          ageMinYears: 10,
          ageMaxYears: 16,
        },
      ),
      rangeBand(
        '16 years up to 18 years',
        '4.5-13.0',
        '10^9/L',
        4.5,
        13,
        'UK-WORCS-FBC',
        {
          ageMinYears: 16,
          ageMaxYears: 18,
        },
      ),
      rangeBand(
        '18 years up to 150 years',
        '4.0-11.0',
        '10^9/L',
        4,
        11,
        'UK-WORCS-FBC',
        {
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  },
  {
    testIds: ['hemoglobin'],
    name: 'Haemoglobin',
    sourceReview: { status: 'candidate', parser: 'ukWorcsFbc' },
    bands: [
      rangeBand(
        '18 years up to 150 years, male',
        '135-180',
        'g/L',
        135,
        180,
        'UK-WORCS-FBC',
        {
          sex: 'male',
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
      rangeBand(
        '18 years up to 150 years, female',
        '115-164',
        'g/L',
        115,
        164,
        'UK-WORCS-FBC',
        {
          sex: 'female',
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  },
  {
    testIds: ['rbc'],
    name: 'Red blood cells',
    sourceReview: { status: 'candidate', parser: 'ukWorcsFbc' },
    bands: [
      rangeBand(
        '18 years up to 150 years, male',
        '4.5-6.5',
        '10^12/L',
        4.5,
        6.5,
        'UK-WORCS-FBC',
        {
          sex: 'male',
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
      rangeBand(
        '18 years up to 150 years, female',
        '3.9-5.6',
        '10^12/L',
        3.9,
        5.6,
        'UK-WORCS-FBC',
        {
          sex: 'female',
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  },
  {
    testIds: ['hematocrit'],
    name: 'Haematocrit',
    sourceReview: { status: 'candidate', parser: 'ukWorcsFbc' },
    bands: [
      rangeBand(
        '18 years up to 150 years, male',
        '0.40-0.54',
        'L/L',
        0.4,
        0.54,
        'UK-WORCS-FBC',
        {
          sex: 'male',
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
      rangeBand(
        '18 years up to 150 years, female',
        '0.36-0.47',
        'L/L',
        0.36,
        0.47,
        'UK-WORCS-FBC',
        {
          sex: 'female',
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  },
  {
    testIds: ['mcv'],
    name: 'Mean cell volume',
    sourceReview: { status: 'candidate', parser: 'ukWorcsFbc' },
    bands: [
      rangeBand(
        '18 years up to 150 years',
        '78.0-96.0',
        'fL',
        78,
        96,
        'UK-WORCS-FBC',
        {
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  },
  {
    testIds: ['platelets'],
    name: 'Platelets',
    sourceReview: { status: 'candidate', parser: 'ukWorcsFbc' },
    bands: [
      rangeBand(
        '18 years up to 150 years',
        '150-400',
        '10^9/L',
        150,
        400,
        'UK-WORCS-FBC',
        {
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  },
];

const ukGlosExpectedTerms = {
  'uk-glos-sodium': ['sodium'],
  'uk-glos-potassium': ['potassium'],
  'uk-glos-albumin': ['albumin'],
  'uk-glos-creatinine-egfr': ['creatinine', 'egfr'],
  'uk-glos-thyroid': ['tsh', 'ft4', 'ft3'],
};

const ukGlosChemistryDefinitionsBySource = {
  'uk-glos-sodium': [
    chemistryDefinition('sodium', 'Sodium', [
      rangeBand('All ages', '133-146', 'mmol/L', 133, 146, 'UK-GLOS-SODIUM'),
    ]),
  ],
  'uk-glos-potassium': [
    chemistryDefinition('potassium', 'Potassium', [
      rangeBand('All ages', '3.5-5.3', 'mmol/L', 3.5, 5.3, 'UK-GLOS-POTASSIUM'),
    ]),
  ],
  'uk-glos-albumin': [
    chemistryDefinition('albumin', 'Albumin', [
      rangeBand(
        '0 years up to 1 year',
        '30-45',
        'g/L',
        30,
        45,
        'UK-GLOS-ALBUMIN',
        {
          ageMaxYears: 1,
        },
      ),
      rangeBand(
        '1 year up to 16 years',
        '30-50',
        'g/L',
        30,
        50,
        'UK-GLOS-ALBUMIN',
        {
          ageMinYears: 1,
          ageMaxYears: 16,
        },
      ),
      rangeBand(
        '16 years up to 150 years',
        '35-50',
        'g/L',
        35,
        50,
        'UK-GLOS-ALBUMIN',
        {
          ageMinYears: 16,
          ageMaxYears: 150,
        },
      ),
    ]),
  ],
  'uk-glos-creatinine-egfr': [
    chemistryDefinition('creatinine', 'Creatinine', [
      rangeBand(
        '0 days up to 14 days',
        '27-77',
        'umol/L',
        27,
        77,
        'UK-GLOS-CREATININE-EGFR',
        {
          ageMinDays: 0,
          ageMaxDays: 14,
        },
      ),
      rangeBand(
        '14 days up to 1 year',
        '14-34',
        'umol/L',
        14,
        34,
        'UK-GLOS-CREATININE-EGFR',
        {
          ageMinDays: 14,
          ageMaxYears: 1,
        },
      ),
      rangeBand(
        '15 years up to 150 years, male',
        '59-104',
        'umol/L',
        59,
        104,
        'UK-GLOS-CREATININE-EGFR',
        {
          sex: 'male',
          ageMinYears: 15,
          ageMaxYears: 150,
        },
      ),
      rangeBand(
        '15 years up to 150 years, female',
        '45-84',
        'umol/L',
        45,
        84,
        'UK-GLOS-CREATININE-EGFR',
        {
          sex: 'female',
          ageMinYears: 15,
          ageMaxYears: 150,
        },
      ),
    ]),
  ],
  'uk-glos-thyroid': [
    chemistryDefinition('tsh', 'TSH', [
      rangeBand(
        '0 days up to 7 days',
        '0.7-15.2',
        'mIU/L',
        0.7,
        15.2,
        'UK-GLOS-THYROID',
        {
          ageMinDays: 0,
          ageMaxDays: 7,
        },
      ),
      rangeBand(
        '7 days up to 15 days',
        '0.72-11.0',
        'mIU/L',
        0.72,
        11,
        'UK-GLOS-THYROID',
        {
          ageMinDays: 7,
          ageMaxDays: 15,
        },
      ),
      rangeBand(
        '15 days up to 150 years',
        '0.27-4.2',
        'mIU/L',
        0.27,
        4.2,
        'UK-GLOS-THYROID',
        {
          ageMinDays: 15,
          ageMaxYears: 150,
        },
      ),
    ]),
  ],
};

function chemistryDefinition(testId, name, bands) {
  return {
    testIds: [testId],
    name,
    sourceReview: { status: 'candidate', parser: 'ukGlosChemistry' },
    bands,
  };
}

function rangeBand(label, display, unit, low, high, citationId, extra = {}) {
  return {
    label,
    kind: 'range',
    display,
    unit,
    low,
    high,
    citationId,
    ...extra,
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
