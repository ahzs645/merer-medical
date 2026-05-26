#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), '..');
const sourceDir = join(repoRoot, 'data', 'lab-reference-sources');
const outputDir = join(repoRoot, 'data', 'lab-reference-imports');
const appReferenceDir = join(
  repoRoot,
  'apps',
  'web',
  'src',
  'features',
  'labs',
  'enrichment',
  'referenceStandards',
);

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
    id: 'aacb-tate-2014-common-reference-intervals',
    kind: 'clinical-reference',
    parser: 'aacbTate2014Chemistry',
    country: 'australian',
    category: 'chemistry',
    licenseRisk: 'open-repository-review-before-runtime',
    fileType: 'pdf',
    url: 'https://openresearch-repository.anu.edu.au/bitstreams/d21c9162-1f8f-4605-bea3-9686fd4cc620/download',
  },
  {
    id: 'nz-chl-general-chemistry',
    kind: 'clinical-reference',
    parser: 'nzChlGeneralChemistry',
    country: 'australian',
    category: 'chemistry',
    licenseRisk: 'curated-citation',
    fileType: 'pdf',
    url: 'https://www.chl.co.nz/wp-content/uploads/2023/10/Laboratory-Reference-Intervals-General-Chemistry-1.pdf',
  },
  {
    id: 'nz-awanui-auckland-biochemistry',
    kind: 'clinical-reference',
    parser: 'nzAwanuiAucklandBiochemistry',
    country: 'australian',
    category: 'chemistry',
    licenseRisk: 'curated-citation',
    fileType: 'pdf',
    url: 'https://fl-healthscope-media.s3.amazonaws.com/lab-sites/uploads/sites/2/2025/09/Biochemistry-Reference-intervals-22092025.pdf',
  },
  {
    id: 'nz-awanui-auckland-haematology',
    kind: 'clinical-reference',
    parser: 'nzAwanuiAucklandHaematology',
    country: 'australian',
    category: 'hematology',
    licenseRisk: 'curated-citation',
    fileType: 'pdf',
    url: 'https://fl-healthscope-media.s3.amazonaws.com/lab-sites/uploads/sites/2/2025/03/Haem-Ref-Int-HAE-F012.pdf',
  },
  {
    id: 'aus-monash-reference-master-list',
    kind: 'clinical-reference',
    parser: 'ausMonashReferenceMasterList',
    country: 'australian',
    category: 'chemistry',
    licenseRisk: 'curated-citation',
    fileType: 'pdf',
    url: 'https://monashpathology.org/wp-content/uploads/2024/08/WIN-QS-19.pdf',
  },
  {
    id: 'aus-pathwest-blood-gas',
    kind: 'clinical-reference',
    parser: 'ausPathwestBloodGas',
    country: 'australian',
    category: 'chemistry',
    licenseRisk: 'curated-citation',
    fileType: 'pdf',
    url: 'https://pathwest.health.wa.gov.au/~/media/PathWest/Documents/Our-Services/Clinical-Services/Point-of-Care-Testing/Blood-Gas-Reference-Intervals.pdf',
  },
  {
    id: 'aus-pathwest-istat-poct',
    kind: 'clinical-reference',
    parser: 'profileOnly',
    country: 'australian',
    category: 'chemistry',
    licenseRisk: 'curated-citation-source-text-not-extractable',
    fileType: 'pdf',
    url: 'https://www.pathwest.health.wa.gov.au/~/media/PathWest/Documents/Our-Services/Clinical-Services/Point-of-Care-Testing/i-STAT-Point-of-Care-Testing-Reference-Intervals.pdf',
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
    id: 'uk-synnovis-chemistry-reference-intervals',
    kind: 'clinical-reference',
    parser: 'ukSynnovisChemistry',
    country: 'uk',
    category: 'chemistry',
    licenseRisk: 'curated-citation',
    fileType: 'pdf',
    title: 'Synnovis Chemistry Reference Intervals',
    url: 'https://www.synnovis.co.uk/sites/default/files/upload/Quality/BSL-ALL-CHEM-INST3%20Chemistry%20Reference%20Intervals%20v5.pdf',
  },
  {
    id: 'uk-mft-blood-counts-reference-ranges',
    kind: 'clinical-reference',
    parser: 'ukMftBloodCounts',
    country: 'uk',
    category: 'hematology',
    licenseRisk: 'curated-citation',
    fileType: 'pdf',
    title:
      'Manchester University NHS Foundation Trust Blood Counts Reference Ranges',
    url: 'https://mft.nhs.uk/app/uploads/2024/07/Blood-counts-reference-ranges.pdf',
  },
  {
    id: 'uk-uhd-haematology-reference-ranges',
    kind: 'clinical-reference',
    parser: 'ukUhdHaematology',
    country: 'uk',
    category: 'hematology',
    licenseRisk: 'curated-citation',
    url: 'https://www.uhd.nhs.uk/directory/name/187-services/joint-service/pathology/haematology-medical-pathology/2389-test-repertoire-and-reference-ranges',
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
    id: 'ca-shared-health-manitoba-hba1c',
    kind: 'clinical-reference',
    parser: 'caSharedHealthHba1c',
    country: 'canadian',
    category: 'chemistry',
    licenseRisk: 'copyrighted-review-only',
    title: 'Shared Health Manitoba Hemoglobin A1c',
    url: 'https://apps.sbgh.mb.ca/labmanual/test/view?seedId=122',
  },
  {
    id: 'ca-shared-health-manitoba-hdl',
    kind: 'clinical-reference',
    parser: 'caSharedHealthHdl',
    country: 'canadian',
    category: 'lipids',
    licenseRisk: 'copyrighted-review-only',
    title: 'Shared Health Manitoba HDL Cholesterol',
    url: 'https://apps.sbgh.mb.ca/labmanual/test/view?seedId=1401',
  },
  {
    id: 'ca-lhsc-reference-ranges',
    kind: 'clinical-reference',
    parser: 'caLhscReferenceRanges',
    country: 'canadian',
    category: 'chemistry',
    licenseRisk: 'copyrighted-review-only',
    title: 'LHSC Reference Ranges',
    url: 'https://www.lhsc.on.ca/pathology-and-laboratory-medicine/reference-ranges',
  },
  {
    id: 'ca-northern-health-test-directory',
    kind: 'clinical-reference',
    parser: 'caNorthernHealthDirectory',
    country: 'canadian',
    category: 'chemistry',
    licenseRisk: 'copyrighted-review-only',
    fileType: 'pdf',
    title: 'Northern Health Laboratory Services Test Directory',
    url: 'https://physicians.northernhealth.ca/sites/physicians/files/physician-resources/laboratory-services/documents/nh-lab-services-test-directory.pdf',
  },
  {
    id: 'ca-northern-health-test-directory-hematology',
    kind: 'clinical-reference',
    parser: 'caNorthernHealthHematology',
    country: 'canadian',
    category: 'hematology',
    licenseRisk: 'copyrighted-review-only',
    fileType: 'pdf',
    title: 'Northern Health Laboratory Services Test Directory',
    url: 'https://physicians.northernhealth.ca/sites/physicians/files/physician-resources/laboratory-services/documents/nh-lab-services-test-directory.pdf',
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
  {
    id: 'loinc-2-82-downloads',
    kind: 'terminology-metadata',
    parser: 'profileOnly',
    licenseRisk: 'login-gated-reduce-before-runtime-use',
    url: 'https://cdn.loinc.org/downloads/',
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
  const shouldPromote = hasFlag('promote-reviewed') || hasFlag('promote');

  if (!shouldFetch && !shouldAnalyze && !shouldPromote) {
    console.error(
      'Usage: node tools/lab-reference-pipeline.mjs --list | --fetch | --analyze | --all | --promote-reviewed [--source id] [--country id] [--category id]',
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
  if (shouldPromote) {
    await promoteReviewedCandidates();
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

  const buffer = Buffer.from(await response.arrayBuffer());
  const path = sourcePath(source);
  const metadataPath = sourceMetadataPath(source);
  await fs.writeFile(path, buffer);
  await fs.writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        ...source,
        fetchedAt: new Date().toISOString(),
        bytes: buffer.byteLength,
        sha256: sha256(buffer),
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
    const sourceText = await ensureSourceText(source);
    const metadata = await readSourceMetadata(source);
    const text =
      source.fileType === 'pdf' ? sourceText : htmlToText(sourceText);
    const profile = {
      ...source,
      bytes: metadata?.bytes || Buffer.byteLength(sourceText),
      sha256: metadata?.sha256 || sha256(sourceText),
      title:
        source.fileType === 'pdf'
          ? source.title || source.id
          : extractTitle(sourceText),
      textBytes: Buffer.byteLength(text),
    };

    const parsed = parseSource(source, text);
    const definitions = addSourceReferences(parsed.definitions, profile);
    analysis.sources.push({
      ...profile,
      parserStatus: parsed.status,
      definitionCount: definitions.length,
      notes: parsed.notes,
    });

    if (definitions.length > 0 && source.country && source.category) {
      const key = `${source.country}/${source.category}`;
      analysis.candidates[key] = [
        ...(analysis.candidates[key] || []),
        ...definitions,
      ];
    }
  }

  return analysis;
}

async function ensureSourceText(source) {
  const path = sourcePath(source);
  try {
    if (source.fileType === 'pdf') return extractPdfText(path);
    return await fs.readFile(path, 'utf8');
  } catch {
    await fetchSource(source);
    if (source.fileType === 'pdf') return extractPdfText(path);
    return fs.readFile(path, 'utf8');
  }
}

async function readSourceMetadata(source) {
  try {
    return JSON.parse(await fs.readFile(sourceMetadataPath(source), 'utf8'));
  } catch {
    return undefined;
  }
}

function parseSource(source, text) {
  if (source.parser === 'rcpaChemistry') return parseRcpaChemistry(text);
  if (source.parser === 'aacbTate2014Chemistry') {
    return parseAacbTate2014Chemistry(text);
  }
  if (source.parser === 'nzChlGeneralChemistry') {
    return parseNzChlGeneralChemistry(text);
  }
  if (source.parser === 'nzAwanuiAucklandBiochemistry') {
    return parseNzAwanuiAucklandBiochemistry(text);
  }
  if (source.parser === 'nzAwanuiAucklandHaematology') {
    return parseNzAwanuiAucklandHaematology(text);
  }
  if (source.parser === 'ausMonashReferenceMasterList') {
    return parseAusMonashReferenceMasterList(text);
  }
  if (source.parser === 'ausPathwestBloodGas') {
    return parseAusPathwestBloodGas(text);
  }
  if (source.parser === 'ukWorcsFbc') return parseUkWorcsFbc(text);
  if (source.parser === 'ukSynnovisChemistry') {
    return parseCuratedSource({
      text,
      definitions: ukSynnovisChemistryDefinitions,
      expectedTerms: ['Albumin', 'Creatinine', 'Sodium', 'T4, Free'],
      parser: source.parser,
      sourceName: 'Synnovis chemistry',
    });
  }
  if (source.parser === 'ukMftBloodCounts') {
    return parseCuratedSource({
      text,
      definitions: ukMftBloodCountsDefinitions,
      expectedTerms: [
        'Blood Counts',
        'RBC',
        'Plats',
        'Erythrocyte Sedimentation Rate',
      ],
      parser: source.parser,
      sourceName: 'MFT blood counts',
    });
  }
  if (source.parser === 'ukUhdHaematology') {
    return parseCuratedSource({
      text,
      definitions: ukUhdHaematologyDefinitions,
      expectedTerms: [
        'Adult FBC Reference Ranges',
        'Paediatric Reference Ranges',
        'ESR Reference ranges',
      ],
      parser: source.parser,
      sourceName: 'UHD haematology',
    });
  }
  if (source.parser === 'ukGlosChemistry') {
    return parseUkGlosChemistry(source.id, text);
  }
  if (source.parser === 'caSharedHealthHba1c') {
    return parseCaSharedHealthHba1c(text);
  }
  if (source.parser === 'caSharedHealthHdl') {
    return parseCaSharedHealthHdl(text);
  }
  if (source.parser === 'caLhscReferenceRanges') {
    return parseCaLhscReferenceRanges(text);
  }
  if (source.parser === 'caNorthernHealthDirectory') {
    return parseCaNorthernHealthDirectory(text);
  }
  if (source.parser === 'caNorthernHealthHematology') {
    return parseCaNorthernHealthHematology(text);
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

async function promoteReviewedCandidates() {
  const candidateRoot = join(outputDir, 'referenceStandards');
  const selectedCountry = getArg('country');
  const selectedCategory = getArg('category');
  const promoted = [];

  for (const country of await safeReadDir(candidateRoot)) {
    if (selectedCountry && country !== selectedCountry) continue;
    const countryDir = join(candidateRoot, country);
    const entries = await safeReadDir(countryDir);
    for (const entry of entries) {
      if (!entry.endsWith('.candidates.json')) continue;

      const category = entry.replace(/\.candidates\.json$/, '');
      if (selectedCategory && category !== selectedCategory) continue;
      const candidatePath = join(countryDir, entry);
      const targetDir = join(appReferenceDir, country);
      const targetPath = join(targetDir, `${category}.json`);
      const definitions = sanitizePromotedDefinitions(
        JSON.parse(await fs.readFile(candidatePath, 'utf8')),
      );

      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(
        targetPath,
        `${JSON.stringify(definitions, null, 2)}\n`,
      );
      promoted.push({ country, category, definitions: definitions.length });
    }
  }

  await fs.writeFile(
    join(outputDir, 'promoted-reference-standards.json'),
    `${JSON.stringify(
      {
        promotedAt: new Date().toISOString(),
        targetDir: appReferenceDir,
        promoted,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `Promoted ${promoted.length} candidate files to ${appReferenceDir}`,
  );
}

async function safeReadDir(path) {
  try {
    return await fs.readdir(path);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function addSourceReferences(definitions, sourceProfile) {
  return definitions.map((definition) => ({
    ...definition,
    bands: definition.bands.map((band) => ({
      ...band,
      sourceId: sourceProfile.id,
      sourceUrl: sourceProfile.url,
      sourceTitle: sourceProfile.title,
      sourceSection:
        band.sourceSection || definition.sourceSection || definition.name,
      sourceSha256: sourceProfile.sha256,
    })),
  }));
}

function sanitizePromotedDefinitions(definitions) {
  return definitions
    .filter((definition) => definition.sourceReview?.promoteReviewed !== false)
    .map((definition) => ({
      ...definition,
      bands: definition.bands
        .filter((band) => band.promoteReviewed !== false)
        .map(({ promoteReviewed, ...band }) => band),
    }))
    .filter((definition) => definition.bands.length > 0);
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

function parseAacbTate2014Chemistry(text) {
  const expected = [
    'Australasian Harmonised Reference Intervals for Adults',
    'Sodium',
    'Potassium',
    'Creatinine',
  ];
  return parseCuratedSource({
    text,
    definitions: [
      auNzChemistryDefinition(
        'sodium',
        'Sodium',
        'aacbTate2014Chemistry',
        [
          rangeBand(
            '18 years up to 150 years',
            '135-145',
            'mmol/L',
            135,
            145,
            'AUS-AACB-TATE-2014',
            { ageMinYears: 18, ageMaxYears: 150, specimen: 'serum/plasma' },
          ),
          rangeBand(
            '0 weeks up to 1 week',
            '132-147',
            'mmol/L',
            132,
            147,
            'AUS-AACB-TATE-2014',
            { ageMinWeeks: 0, ageMaxWeeks: 1, specimen: 'serum/plasma' },
          ),
          rangeBand(
            '1 week up to 18 years',
            '133-144',
            'mmol/L',
            133,
            144,
            'AUS-AACB-TATE-2014',
            { ageMinWeeks: 1, ageMaxYears: 18, specimen: 'serum/plasma' },
          ),
        ],
        { promoteReviewed: false },
      ),
      auNzChemistryDefinition(
        'potassium',
        'Potassium',
        'aacbTate2014Chemistry',
        [
          rangeBand(
            '18 years up to 150 years',
            '3.5-5.2',
            'mmol/L',
            3.5,
            5.2,
            'AUS-AACB-TATE-2014',
            { ageMinYears: 18, ageMaxYears: 150, specimen: 'serum/plasma' },
          ),
          rangeBand(
            '0 weeks up to 1 week, plasma',
            '3.5-6.2',
            'mmol/L',
            3.5,
            6.2,
            'AUS-AACB-TATE-2014',
            { ageMinWeeks: 0, ageMaxWeeks: 1, specimen: 'plasma' },
          ),
          rangeBand(
            '1 week up to 26 weeks, plasma',
            '3.8-6.4',
            'mmol/L',
            3.8,
            6.4,
            'AUS-AACB-TATE-2014',
            { ageMinWeeks: 1, ageMaxWeeks: 26, specimen: 'plasma' },
          ),
          rangeBand(
            '26 weeks up to 2 years, plasma',
            '3.5-5.4',
            'mmol/L',
            3.5,
            5.4,
            'AUS-AACB-TATE-2014',
            { ageMinWeeks: 26, ageMaxYears: 2, specimen: 'plasma' },
          ),
          rangeBand(
            '2 years up to 18 years, plasma',
            '3.3-4.9',
            'mmol/L',
            3.3,
            4.9,
            'AUS-AACB-TATE-2014',
            { ageMinYears: 2, ageMaxYears: 18, specimen: 'plasma' },
          ),
        ],
        { promoteReviewed: false },
      ),
      auNzChemistryDefinition(
        'chloride',
        'Chloride',
        'aacbTate2014Chemistry',
        [
          rangeBand(
            '18 years up to 150 years',
            '95-110',
            'mmol/L',
            95,
            110,
            'AUS-AACB-TATE-2014',
            { ageMinYears: 18, ageMaxYears: 150 },
          ),
          rangeBand(
            '0 weeks up to 1 week',
            '98-115',
            'mmol/L',
            98,
            115,
            'AUS-AACB-TATE-2014',
            { ageMinWeeks: 0, ageMaxWeeks: 1 },
          ),
          rangeBand(
            '1 week up to 18 years',
            '97-110',
            'mmol/L',
            97,
            110,
            'AUS-AACB-TATE-2014',
            { ageMinWeeks: 1, ageMaxYears: 18 },
          ),
        ],
        { promoteReviewed: false },
      ),
      auNzChemistryDefinition(
        'bicarbonate',
        'Bicarbonate',
        'aacbTate2014Chemistry',
        [
          rangeBand(
            '18 years up to 150 years',
            '22-32',
            'mmol/L',
            22,
            32,
            'AUS-AACB-TATE-2014',
            { ageMinYears: 18, ageMaxYears: 150 },
          ),
          rangeBand(
            '0 weeks up to 1 week',
            '15-28',
            'mmol/L',
            15,
            28,
            'AUS-AACB-TATE-2014',
            { ageMinWeeks: 0, ageMaxWeeks: 1 },
          ),
          rangeBand(
            '1 week up to 2 years',
            '16-29',
            'mmol/L',
            16,
            29,
            'AUS-AACB-TATE-2014',
            { ageMinWeeks: 1, ageMaxYears: 2 },
          ),
          rangeBand(
            '2 years up to 10 years',
            '17-30',
            'mmol/L',
            17,
            30,
            'AUS-AACB-TATE-2014',
            { ageMinYears: 2, ageMaxYears: 10 },
          ),
          rangeBand(
            '10 years up to 18 years',
            '20-32',
            'mmol/L',
            20,
            32,
            'AUS-AACB-TATE-2014',
            { ageMinYears: 10, ageMaxYears: 18 },
          ),
        ],
        { promoteReviewed: false },
      ),
      auNzChemistryDefinition(
        'creatinine',
        'Creatinine',
        'aacbTate2014Chemistry',
        [
          rangeBand(
            '18 years up to 60 years, male',
            '60-110',
            'umol/L',
            60,
            110,
            'AUS-AACB-TATE-2014',
            { sex: 'male', ageMinYears: 18, ageMaxYears: 60 },
          ),
          rangeBand(
            '18 years up to 60 years, female',
            '45-90',
            'umol/L',
            45,
            90,
            'AUS-AACB-TATE-2014',
            { sex: 'female', ageMinYears: 18, ageMaxYears: 60 },
          ),
        ],
        { promoteReviewed: false },
      ),
      auNzChemistryDefinition(
        'total-protein',
        'Total protein',
        'aacbTate2014Chemistry',
        [
          rangeBand(
            '18 years up to 150 years',
            '60-80',
            'g/L',
            60,
            80,
            'AUS-AACB-TATE-2014',
            { ageMinYears: 18, ageMaxYears: 150 },
          ),
        ],
        { promoteReviewed: false },
      ),
    ],
    expectedTerms: expected,
    parser: 'aacbTate2014Chemistry',
    sourceName: 'AACB/Tate 2014 common reference intervals',
  });
}

function parseNzChlGeneralChemistry(text) {
  return parseCuratedSource({
    text,
    definitions: [
      auNzChemistryDefinition(
        'alt',
        'Alanine aminotransferase',
        'nzChlGeneralChemistry',
        [
          rangeBand('All ages, male', '0-40', 'U/L', 0, 40, 'NZ-CHL-GEN-CHEM', {
            sex: 'male',
          }),
          rangeBand(
            'All ages, female',
            '0-30',
            'U/L',
            0,
            30,
            'NZ-CHL-GEN-CHEM',
            { sex: 'female' },
          ),
        ],
      ),
      auNzChemistryDefinition('albumin', 'Albumin', 'nzChlGeneralChemistry', [
        rangeBand(
          '0 days up to 14 days',
          '28-41',
          'g/L',
          28,
          41,
          'NZ-CHL-GEN-CHEM',
          { ageMinDays: 0, ageMaxDays: 14 },
        ),
        rangeBand(
          '14 days up to 1 year',
          '28-45',
          'g/L',
          28,
          45,
          'NZ-CHL-GEN-CHEM',
          { ageMinDays: 14, ageMaxYears: 1 },
        ),
        rangeBand(
          '1 year up to 8 years',
          '35-45',
          'g/L',
          35,
          45,
          'NZ-CHL-GEN-CHEM',
          { ageMinYears: 1, ageMaxYears: 8 },
        ),
        rangeBand(
          '8 years up to 15 years',
          '37-47',
          'g/L',
          37,
          47,
          'NZ-CHL-GEN-CHEM',
          { ageMinYears: 8, ageMaxYears: 15 },
        ),
        rangeBand(
          '16 years up to 150 years',
          '32-48',
          'g/L',
          32,
          48,
          'NZ-CHL-GEN-CHEM',
          { ageMinYears: 16, ageMaxYears: 150 },
        ),
      ]),
      auNzChemistryDefinition(
        'bicarbonate',
        'Bicarbonate',
        'nzChlGeneralChemistry',
        [
          rangeBand(
            '0 years up to 2 years',
            '19-24',
            'mmol/L',
            19,
            24,
            'NZ-CHL-GEN-CHEM',
            { ageMinYears: 0, ageMaxYears: 2 },
          ),
          rangeBand(
            '2 years up to 150 years',
            '22-32',
            'mmol/L',
            22,
            32,
            'NZ-CHL-GEN-CHEM',
            { ageMinYears: 2, ageMaxYears: 150 },
          ),
        ],
      ),
      auNzChemistryDefinition('calcium', 'Calcium', 'nzChlGeneralChemistry', [
        rangeBand(
          '0 days up to 1 week',
          '1.9-2.8',
          'mmol/L',
          1.9,
          2.8,
          'NZ-CHL-GEN-CHEM',
          { ageMinDays: 0, ageMaxWeeks: 1 },
        ),
        rangeBand(
          '1 week up to 26 weeks',
          '2.2-2.8',
          'mmol/L',
          2.2,
          2.8,
          'NZ-CHL-GEN-CHEM',
          { ageMinWeeks: 1, ageMaxWeeks: 26 },
        ),
        rangeBand(
          '26 weeks up to 18 years',
          '2.2-2.7',
          'mmol/L',
          2.2,
          2.7,
          'NZ-CHL-GEN-CHEM',
          { ageMinWeeks: 26, ageMaxYears: 18 },
        ),
        rangeBand(
          '18 years up to 150 years',
          '2.2-2.6',
          'mmol/L',
          2.2,
          2.6,
          'NZ-CHL-GEN-CHEM',
          { ageMinYears: 18, ageMaxYears: 150 },
        ),
      ]),
      auNzChemistryDefinition('chloride', 'Chloride', 'nzChlGeneralChemistry', [
        rangeBand('All ages', '95-110', 'mmol/L', 95, 110, 'NZ-CHL-GEN-CHEM'),
      ]),
    ],
    expectedTerms: [
      'Alanine aminotransferase',
      'Albumin',
      'Bicarbonate',
      'Chloride',
    ],
    parser: 'nzChlGeneralChemistry',
    sourceName: 'Canterbury Health Laboratories general chemistry',
  });
}

function parseNzAwanuiAucklandBiochemistry(text) {
  return parseCuratedSource({
    text,
    definitions: [
      auNzChemistryDefinition(
        'glucose',
        'Glucose',
        'nzAwanuiAucklandBiochemistry',
        [
          rangeBand(
            'Fasting',
            '3.5-5.4',
            'mmol/L',
            3.5,
            5.4,
            'NZ-AWANUI-AKL-BIOCHEM',
            { method: 'fasting' },
          ),
          rangeBand(
            'Non-fasting',
            '3.5-7.7',
            'mmol/L',
            3.5,
            7.7,
            'NZ-AWANUI-AKL-BIOCHEM',
            { method: 'non-fasting' },
          ),
        ],
      ),
      auNzChemistryDefinition(
        'hba1c',
        'HbA1c',
        'nzAwanuiAucklandBiochemistry',
        [
          thresholdBand(
            'All ages',
            '<41',
            'mmol/mol',
            41,
            'lt',
            'NZ-AWANUI-AKL-BIOCHEM',
          ),
        ],
      ),
      auNzChemistryDefinition(
        'albumin',
        'Albumin',
        'nzAwanuiAucklandBiochemistry',
        [
          rangeBand(
            '0 months up to 3 months',
            '25-40',
            'g/L',
            25,
            40,
            'NZ-AWANUI-AKL-BIOCHEM',
            { ageMinDays: 0, ageMaxDays: 90 },
          ),
          rangeBand(
            '3 months up to 1 year',
            '32-45',
            'g/L',
            32,
            45,
            'NZ-AWANUI-AKL-BIOCHEM',
            { ageMinDays: 90, ageMaxYears: 1 },
          ),
          rangeBand(
            '1 year up to 150 years',
            '32-48',
            'g/L',
            32,
            48,
            'NZ-AWANUI-AKL-BIOCHEM',
            { ageMinYears: 1, ageMaxYears: 150 },
          ),
        ],
      ),
      auNzChemistryDefinition(
        'calcium',
        'Calcium',
        'nzAwanuiAucklandBiochemistry',
        [
          rangeBand(
            '1 day up to 3 days',
            '1.80-2.80',
            'mmol/L',
            1.8,
            2.8,
            'NZ-AWANUI-AKL-BIOCHEM',
            { ageMinDays: 1, ageMaxDays: 3 },
          ),
          rangeBand(
            '4 days up to 1 year',
            '2.10-2.80',
            'mmol/L',
            2.1,
            2.8,
            'NZ-AWANUI-AKL-BIOCHEM',
            { ageMinDays: 4, ageMaxYears: 1 },
          ),
          rangeBand(
            '1 year up to 150 years',
            '2.10-2.55',
            'mmol/L',
            2.1,
            2.55,
            'NZ-AWANUI-AKL-BIOCHEM',
            { ageMinYears: 1, ageMaxYears: 150 },
          ),
        ],
      ),
      auNzChemistryDefinition(
        'phosphate',
        'Phosphate',
        'nzAwanuiAucklandBiochemistry',
        [
          rangeBand(
            '1 year up to 4 years',
            '1.10-2.20',
            'mmol/L',
            1.1,
            2.2,
            'NZ-AWANUI-AKL-BIOCHEM',
            { ageMinYears: 1, ageMaxYears: 4 },
          ),
          rangeBand(
            '4 years up to 15 years',
            '0.90-2.00',
            'mmol/L',
            0.9,
            2,
            'NZ-AWANUI-AKL-BIOCHEM',
            { ageMinYears: 4, ageMaxYears: 15 },
          ),
          rangeBand(
            '15 years up to 18 years',
            '0.80-1.85',
            'mmol/L',
            0.8,
            1.85,
            'NZ-AWANUI-AKL-BIOCHEM',
            { ageMinYears: 15, ageMaxYears: 18 },
          ),
          rangeBand(
            '18 years up to 150 years',
            '0.75-1.50',
            'mmol/L',
            0.75,
            1.5,
            'NZ-AWANUI-AKL-BIOCHEM',
            { ageMinYears: 18, ageMaxYears: 150 },
          ),
        ],
      ),
      auNzChemistryDefinition(
        'magnesium',
        'Magnesium',
        'nzAwanuiAucklandBiochemistry',
        [
          rangeBand(
            'All ages',
            '0.70-1.0',
            'mmol/L',
            0.7,
            1,
            'NZ-AWANUI-AKL-BIOCHEM',
          ),
        ],
      ),
      auNzChemistryDefinition(
        'lipase',
        'Lipase',
        'nzAwanuiAucklandBiochemistry',
        [
          rangeBand('Serum', '10-60', 'U/L', 10, 60, 'NZ-AWANUI-AKL-BIOCHEM', {
            specimen: 'serum',
          }),
        ],
      ),
    ],
    expectedTerms: [
      'REFERENCE INTERVALS - CLINICAL CHEMISTRY',
      'Glucose',
      'Albumin',
      'Lipase',
    ],
    parser: 'nzAwanuiAucklandBiochemistry',
    sourceName: 'Awanui Auckland biochemistry',
  });
}

function parseNzAwanuiAucklandHaematology(text) {
  return parseCuratedSource({
    text,
    definitions: [
      auNzHematologyDefinition(
        'rbc',
        'Red blood count',
        'nzAwanuiAucklandHaematology',
        [
          rangeBand(
            'Adult male',
            '4.3-6.0',
            '10^12/L',
            4.3,
            6,
            'NZ-AWANUI-AKL-HAEM',
            { sex: 'male', ageMinYears: 18, ageMaxYears: 150 },
          ),
          rangeBand(
            'Adult female',
            '3.6-5.6',
            '10^12/L',
            3.6,
            5.6,
            'NZ-AWANUI-AKL-HAEM',
            { sex: 'female', ageMinYears: 18, ageMaxYears: 150 },
          ),
        ],
      ),
      auNzHematologyDefinition(
        'hemoglobin',
        'Haemoglobin',
        'nzAwanuiAucklandHaematology',
        [
          rangeBand(
            'Adult male',
            '130-175',
            'g/L',
            130,
            175,
            'NZ-AWANUI-AKL-HAEM',
            { sex: 'male', ageMinYears: 18, ageMaxYears: 150 },
          ),
          rangeBand(
            'Adult female',
            '115-155',
            'g/L',
            115,
            155,
            'NZ-AWANUI-AKL-HAEM',
            { sex: 'female', ageMinYears: 18, ageMaxYears: 150 },
          ),
        ],
      ),
      auNzHematologyDefinition(
        'hematocrit',
        'HCT',
        'nzAwanuiAucklandHaematology',
        [
          rangeBand(
            'Adult male',
            '0.40-0.52',
            'L/L',
            0.4,
            0.52,
            'NZ-AWANUI-AKL-HAEM',
            { sex: 'male', ageMinYears: 18, ageMaxYears: 150 },
          ),
          rangeBand(
            'Adult female',
            '0.35-0.46',
            'L/L',
            0.35,
            0.46,
            'NZ-AWANUI-AKL-HAEM',
            { sex: 'female', ageMinYears: 18, ageMaxYears: 150 },
          ),
        ],
      ),
      auNzHematologyDefinition(
        'wbc',
        'White blood count',
        'nzAwanuiAucklandHaematology',
        [
          rangeBand(
            'Adult male',
            '4.0-11.0',
            '10^9/L',
            4,
            11,
            'NZ-AWANUI-AKL-HAEM',
            { sex: 'male', ageMinYears: 18, ageMaxYears: 150 },
          ),
          rangeBand(
            'Adult female',
            '4.0-11.0',
            '10^9/L',
            4,
            11,
            'NZ-AWANUI-AKL-HAEM',
            { sex: 'female', ageMinYears: 18, ageMaxYears: 150 },
          ),
        ],
      ),
      auNzHematologyDefinition(
        'platelets',
        'Platelet count',
        'nzAwanuiAucklandHaematology',
        [
          rangeBand(
            'Adult male',
            '150-400',
            '10^9/L',
            150,
            400,
            'NZ-AWANUI-AKL-HAEM',
            { sex: 'male', ageMinYears: 18, ageMaxYears: 150 },
          ),
          rangeBand(
            'Adult female',
            '150-400',
            '10^9/L',
            150,
            400,
            'NZ-AWANUI-AKL-HAEM',
            { sex: 'female', ageMinYears: 18, ageMaxYears: 150 },
          ),
        ],
      ),
    ],
    expectedTerms: [
      'REFERENCE INTERVALS - HAEMATOLOGY',
      'Red Blood Count',
      'Platelet Count',
    ],
    parser: 'nzAwanuiAucklandHaematology',
    sourceName: 'Awanui Auckland haematology',
  });
}

function parseAusMonashReferenceMasterList(text) {
  return parseCuratedSource({
    text,
    definitions: [
      auNzChemistryDefinition(
        'sodium',
        'Sodium blood gas',
        'ausMonashReferenceMasterList',
        [
          rangeBand(
            'Blood gas arterial/capillary adult',
            '135-145',
            'mmol/L',
            135,
            145,
            'AUS-MONASH-REF-MASTER',
            {
              method: 'blood gas Radiometer',
              specimen: 'arterial/capillary',
              ageMinYears: 18,
              ageMaxYears: 150,
            },
          ),
          rangeBand(
            'Blood gas venous adult',
            '135-145',
            'mmol/L',
            135,
            145,
            'AUS-MONASH-REF-MASTER',
            {
              method: 'blood gas Radiometer',
              specimen: 'venous',
              ageMinYears: 18,
              ageMaxYears: 150,
            },
          ),
        ],
        { promoteReviewed: false },
      ),
      auNzChemistryDefinition(
        'potassium',
        'Potassium blood gas',
        'ausMonashReferenceMasterList',
        [
          rangeBand(
            'Blood gas arterial/capillary adult',
            '3.5-5.2',
            'mmol/L',
            3.5,
            5.2,
            'AUS-MONASH-REF-MASTER',
            {
              method: 'blood gas Radiometer',
              specimen: 'arterial/capillary',
              ageMinYears: 18,
              ageMaxYears: 150,
            },
          ),
          rangeBand(
            'Blood gas venous adult',
            '3.5-5.2',
            'mmol/L',
            3.5,
            5.2,
            'AUS-MONASH-REF-MASTER',
            {
              method: 'blood gas Radiometer',
              specimen: 'venous',
              ageMinYears: 18,
              ageMaxYears: 150,
            },
          ),
        ],
        { promoteReviewed: false },
      ),
      auNzChemistryDefinition(
        'chloride',
        'Chloride blood gas',
        'ausMonashReferenceMasterList',
        [
          rangeBand(
            'Blood gas adult',
            '95-110',
            'mmol/L',
            95,
            110,
            'AUS-MONASH-REF-MASTER',
            {
              method: 'blood gas Radiometer',
              ageMinYears: 18,
              ageMaxYears: 150,
            },
          ),
        ],
        { promoteReviewed: false },
      ),
    ],
    expectedTerms: [
      'PATHOLOGY REFERENCE INTERVAL',
      'Reference intervals for blood gas analysis',
      'Sodium',
    ],
    parser: 'ausMonashReferenceMasterList',
    sourceName: 'Monash Health Pathology master list',
  });
}

function parseAusPathwestBloodGas(text) {
  return parseCuratedSource({
    text,
    definitions: [
      auNzChemistryDefinition(
        'sodium',
        'Sodium i-STAT CHEM8',
        'ausPathwestBloodGas',
        [
          rangeBand(
            '0 days up to 1 week',
            '132-147',
            'mmol/L',
            132,
            147,
            'AUS-PATHWEST-BLOOD-GAS',
            { ageMinDays: 0, ageMaxWeeks: 1, method: 'i-STAT CHEM8' },
          ),
          rangeBand(
            '1 week up to 18 years',
            '133-144',
            'mmol/L',
            133,
            144,
            'AUS-PATHWEST-BLOOD-GAS',
            { ageMinWeeks: 1, ageMaxYears: 18, method: 'i-STAT CHEM8' },
          ),
          rangeBand(
            '18 years up to 120 years',
            '135-145',
            'mmol/L',
            135,
            145,
            'AUS-PATHWEST-BLOOD-GAS',
            { ageMinYears: 18, ageMaxYears: 120, method: 'i-STAT CHEM8' },
          ),
        ],
      ),
      auNzChemistryDefinition(
        'potassium',
        'Potassium i-STAT CHEM8',
        'ausPathwestBloodGas',
        [
          rangeBand(
            '0 days up to 1 week',
            '3.5-6.2',
            'mmol/L',
            3.5,
            6.2,
            'AUS-PATHWEST-BLOOD-GAS',
            { ageMinDays: 0, ageMaxWeeks: 1, method: 'i-STAT CHEM8' },
          ),
          rangeBand(
            '1 week up to 26 weeks',
            '3.8-6.4',
            'mmol/L',
            3.8,
            6.4,
            'AUS-PATHWEST-BLOOD-GAS',
            { ageMinWeeks: 1, ageMaxWeeks: 26, method: 'i-STAT CHEM8' },
          ),
          rangeBand(
            '26 weeks up to 1 year',
            '3.5-5.4',
            'mmol/L',
            3.5,
            5.4,
            'AUS-PATHWEST-BLOOD-GAS',
            { ageMinWeeks: 26, ageMaxYears: 1, method: 'i-STAT CHEM8' },
          ),
          rangeBand(
            '2 years up to 18 years',
            '3.3-4.9',
            'mmol/L',
            3.3,
            4.9,
            'AUS-PATHWEST-BLOOD-GAS',
            { ageMinYears: 2, ageMaxYears: 18, method: 'i-STAT CHEM8' },
          ),
          rangeBand(
            '18 years up to 120 years',
            '3.5-5.2',
            'mmol/L',
            3.5,
            5.2,
            'AUS-PATHWEST-BLOOD-GAS',
            { ageMinYears: 18, ageMaxYears: 120, method: 'i-STAT CHEM8' },
          ),
        ],
      ),
      auNzChemistryDefinition(
        'chloride',
        'Chloride i-STAT CHEM8',
        'ausPathwestBloodGas',
        [
          rangeBand(
            '0 days up to 1 week',
            '98-115',
            'mmol/L',
            98,
            115,
            'AUS-PATHWEST-BLOOD-GAS',
            { ageMinDays: 0, ageMaxWeeks: 1, method: 'i-STAT CHEM8' },
          ),
          rangeBand(
            '1 week up to 18 years',
            '97-110',
            'mmol/L',
            97,
            110,
            'AUS-PATHWEST-BLOOD-GAS',
            { ageMinWeeks: 1, ageMaxYears: 18, method: 'i-STAT CHEM8' },
          ),
          rangeBand(
            '18 years up to 120 years',
            '95-110',
            'mmol/L',
            95,
            110,
            'AUS-PATHWEST-BLOOD-GAS',
            { ageMinYears: 18, ageMaxYears: 120, method: 'i-STAT CHEM8' },
          ),
        ],
      ),
      auNzChemistryDefinition(
        'glucose',
        'Glucose i-STAT CHEM8',
        'ausPathwestBloodGas',
        [
          rangeBand(
            '0 hours up to 3 days',
            '2.6-5.4',
            'mmol/L',
            2.6,
            5.4,
            'AUS-PATHWEST-BLOOD-GAS',
            { ageMinDays: 0, ageMaxDays: 3, method: 'i-STAT CHEM8' },
          ),
          rangeBand(
            '3 days up to 120 years',
            '3.0-5.4',
            'mmol/L',
            3,
            5.4,
            'AUS-PATHWEST-BLOOD-GAS',
            { ageMinDays: 3, ageMaxYears: 120, method: 'i-STAT CHEM8' },
          ),
        ],
      ),
      auNzChemistryDefinition(
        'creatinine',
        'Creatinine i-STAT CHEM8',
        'ausPathwestBloodGas',
        [
          rangeBand(
            '19 years up to 120 years, male',
            '60-110',
            'umol/L',
            60,
            110,
            'AUS-PATHWEST-BLOOD-GAS',
            {
              sex: 'male',
              ageMinYears: 19,
              ageMaxYears: 120,
              method: 'i-STAT CHEM8',
            },
          ),
          rangeBand(
            '19 years up to 120 years, female',
            '45-90',
            'umol/L',
            45,
            90,
            'AUS-PATHWEST-BLOOD-GAS',
            {
              sex: 'female',
              ageMinYears: 19,
              ageMaxYears: 120,
              method: 'i-STAT CHEM8',
            },
          ),
        ],
      ),
    ],
    expectedTerms: ['ISTAT CHEM8 REFERENCE INTERVALS', 'Sodium', 'Haemoglobin'],
    parser: 'ausPathwestBloodGas',
    sourceName: 'PathWest blood gas and i-STAT CHEM8',
  });
}

function auNzChemistryDefinition(testId, name, parser, bands, options = {}) {
  return auNzDefinition(testId, name, parser, bands, options);
}

function auNzHematologyDefinition(testId, name, parser, bands, options = {}) {
  return auNzDefinition(testId, name, parser, bands, options);
}

function auNzDefinition(
  testId,
  name,
  parser,
  bands,
  { promoteReviewed = true } = {},
) {
  return {
    testIds: [testId],
    name,
    sourceReview: { status: 'candidate', parser, promoteReviewed },
    bands: bands.map((band) =>
      promoteReviewed ? band : { ...band, promoteReviewed: false },
    ),
  };
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

function parseCaSharedHealthHba1c(text) {
  const found = ['HEMOGLOBIN A1C', 'Reference Values:', '4.0 - 6.0 %'].filter(
    (term) => text.includes(term),
  );
  return {
    status:
      found.length === 3 ? 'curated-candidate-json' : 'source-shape-changed',
    definitions: caSharedHealthHba1cDefinitions,
    notes: [
      `Found ${found.length}/3 expected Shared Health Manitoba HbA1c markers.`,
      'Output is review-only because the Lab Information Manual states all rights reserved and use is subject to license terms.',
    ],
  };
}

function parseCaSharedHealthHdl(text) {
  const found = [
    'HDL CHOLESTEROL',
    'Reference Values:',
    '>=20 y Female',
  ].filter((term) => text.includes(term));
  return {
    status:
      found.length === 3 ? 'curated-candidate-json' : 'source-shape-changed',
    definitions: caSharedHealthHdlDefinitions,
    notes: [
      `Found ${found.length}/3 expected Shared Health Manitoba HDL markers.`,
      'HDL values are decision limits, not classic central 95% reference intervals; keep them as candidate lipid flagging logic unless reviewed.',
      'Output is review-only because the Lab Information Manual states all rights reserved and use is subject to license terms.',
    ],
  };
}

function parseCaLhscReferenceRanges(text) {
  const found = [
    'Whole Blood Reference Range',
    'Plasma Reference Range',
    'Random Urine Reference Range',
  ].filter((term) => text.includes(term));
  return {
    status:
      found.length >= 2 ? 'curated-candidate-json' : 'source-shape-changed',
    definitions: caLhscTraceElementDefinitions,
    notes: [
      `Found ${found.length}/3 expected LHSC reference-range sections.`,
      'Definitions are curated from SI-unit columns on the LHSC page and kept review-only pending licensing and analyte mapping QA.',
    ],
  };
}

function parseCaNorthernHealthDirectory(text) {
  const found = [
    'NH Lab Services – Chemistry Reference Intervals',
    'Albumin',
    'Bilirubin Total',
  ].filter((term) => text.includes(term));
  return {
    status:
      found.length >= 2 ? 'curated-candidate-json' : 'source-shape-changed',
    definitions: caNorthernHealthChemistryDefinitions,
    notes: [
      `Found ${found.length}/3 expected Northern Health chemistry markers.`,
      'Definitions are curated from the PDF chemistry appendix and kept review-only because the directory is an institutional document with unclear reuse rights.',
    ],
  };
}

function parseCaNorthernHealthHematology(text) {
  const found = [
    'NH Lab Services - Hematology Reference Intervals',
    'Automated Complete Blood Count',
    'ADULT',
  ].filter((term) => text.includes(term));
  return {
    status:
      found.length === 3 ? 'curated-candidate-json' : 'source-shape-changed',
    definitions: caNorthernHealthHematologyDefinitions,
    notes: [
      `Found ${found.length}/3 expected Northern Health hematology markers.`,
      'Definitions are curated from the PDF CBC adult row and kept review-only because the directory is an institutional document with unclear reuse rights.',
    ],
  };
}

function parseCuratedSource({
  text,
  definitions,
  expectedTerms,
  parser,
  sourceName,
}) {
  const normalizedText = text.toLowerCase();
  const found = expectedTerms.filter((term) =>
    normalizedText.includes(term.toLowerCase()),
  );
  return {
    status:
      definitions.length > 0 &&
      found.length >= Math.min(2, expectedTerms.length)
        ? 'curated-candidate-json'
        : 'source-shape-changed',
    definitions,
    notes: [
      `Found ${found.length}/${expectedTerms.length} expected ${sourceName} terms.`,
      `${sourceName} definitions are curated from the source document and must be reviewed before promotion.`,
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
  return join(sourceDir, `${source.id}.${source.fileType || 'html'}`);
}

function sourceMetadataPath(source) {
  return join(sourceDir, `${source.id}.metadata.json`);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function extractPdfText(path) {
  const dir = await fs.mkdtemp(join(tmpdir(), 'mere-lab-pdf-'));
  const output = join(dir, 'source.txt');
  try {
    await execFileAsync('pdftotext', [path, output], {
      maxBuffer: 25 * 1024 * 1024,
    });
    return await fs.readFile(output, 'utf8');
  } finally {
    await fs.rm(dir, { force: true, recursive: true });
  }
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
    .replace(/&ge;|&#8805;/g, '>=')
    .replace(/&le;|&#8804;/g, '<=')
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

const ukSynnovisChemistryDefinitions = [
  referenceDefinition(['albumin'], 'Albumin', 'ukSynnovisChemistry', [
    rangeBand(
      '0 days up to 14 days',
      '28-41',
      'g/L',
      28,
      41,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinDays: 0,
        ageMaxDays: 14,
      },
    ),
    rangeBand(
      '15 days up to 1 year',
      '25-46',
      'g/L',
      25,
      46,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinDays: 15,
        ageMaxYears: 1,
      },
    ),
    rangeBand(
      '1 year up to 7 years',
      '35-45',
      'g/L',
      35,
      45,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinYears: 1,
        ageMaxYears: 7,
      },
    ),
    rangeBand(
      '8 years up to 14 years',
      '37-47',
      'g/L',
      37,
      47,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinYears: 8,
        ageMaxYears: 14,
      },
    ),
    rangeBand(
      '15 years up to 18 years, male',
      '38-50',
      'g/L',
      38,
      50,
      'UK-SYNNOVIS-CHEM',
      {
        sex: 'male',
        ageMinYears: 15,
        ageMaxYears: 18,
      },
    ),
    rangeBand(
      '15 years up to 18 years, female',
      '35-49',
      'g/L',
      35,
      49,
      'UK-SYNNOVIS-CHEM',
      {
        sex: 'female',
        ageMinYears: 15,
        ageMaxYears: 18,
      },
    ),
    rangeBand(
      '19 years up to 150 years',
      '31-45',
      'g/L',
      31,
      45,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(
    ['alkaline-phosphatase'],
    'Alkaline phosphatase',
    'ukSynnovisChemistry',
    [
      rangeBand(
        '0 days up to 28 days',
        '70-380',
        'U/L',
        70,
        380,
        'UK-SYNNOVIS-CHEM',
        {
          ageMinDays: 0,
          ageMaxDays: 28,
        },
      ),
      rangeBand(
        '28 days up to 15 years',
        '60-425',
        'U/L',
        60,
        425,
        'UK-SYNNOVIS-CHEM',
        {
          ageMinDays: 28,
          ageMaxYears: 15,
        },
      ),
      rangeBand(
        '16 years up to 150 years',
        '30-130',
        'U/L',
        30,
        130,
        'UK-SYNNOVIS-CHEM',
        {
          ageMinYears: 16,
          ageMaxYears: 150,
        },
      ),
    ],
  ),
  referenceDefinition(
    ['alt'],
    'Alanine aminotransferase',
    'ukSynnovisChemistry',
    [
      rangeBand(
        '0 years up to 1 year',
        '5-51',
        'U/L',
        5,
        51,
        'UK-SYNNOVIS-CHEM',
        {
          ageMinYears: 0,
          ageMaxYears: 1,
        },
      ),
      rangeBand(
        '1 year up to 12 years',
        '11-30',
        'U/L',
        11,
        30,
        'UK-SYNNOVIS-CHEM',
        {
          ageMinYears: 1,
          ageMaxYears: 12,
        },
      ),
      rangeBand(
        '13 years up to 18 years, male',
        '10-33',
        'U/L',
        10,
        33,
        'UK-SYNNOVIS-CHEM',
        {
          sex: 'male',
          ageMinYears: 13,
          ageMaxYears: 18,
        },
      ),
      rangeBand(
        '13 years up to 18 years, female',
        '8-24',
        'U/L',
        8,
        24,
        'UK-SYNNOVIS-CHEM',
        {
          sex: 'female',
          ageMinYears: 13,
          ageMaxYears: 18,
        },
      ),
      rangeBand(
        '19 years up to 150 years, male',
        '<45',
        'U/L',
        0,
        45,
        'UK-SYNNOVIS-CHEM',
        {
          sex: 'male',
          ageMinYears: 19,
          ageMaxYears: 150,
        },
      ),
      rangeBand(
        '19 years up to 150 years, female',
        '<34',
        'U/L',
        0,
        34,
        'UK-SYNNOVIS-CHEM',
        {
          sex: 'female',
          ageMinYears: 19,
          ageMaxYears: 150,
        },
      ),
    ],
  ),
  referenceDefinition(
    ['ast'],
    'Aspartate aminotransferase',
    'ukSynnovisChemistry',
    [
      rangeBand(
        '0 days up to 14 days',
        '23-186',
        'U/L',
        23,
        186,
        'UK-SYNNOVIS-CHEM',
        {
          ageMinDays: 0,
          ageMaxDays: 14,
        },
      ),
      rangeBand(
        '15 days up to 1 year',
        '23-83',
        'U/L',
        23,
        83,
        'UK-SYNNOVIS-CHEM',
        {
          ageMinDays: 15,
          ageMaxYears: 1,
        },
      ),
      rangeBand(
        '1 year up to 6 years',
        '26-55',
        'U/L',
        26,
        55,
        'UK-SYNNOVIS-CHEM',
        {
          ageMinYears: 1,
          ageMaxYears: 6,
        },
      ),
      rangeBand(
        '7 years up to 11 years',
        '22-41',
        'U/L',
        22,
        41,
        'UK-SYNNOVIS-CHEM',
        {
          ageMinYears: 7,
          ageMaxYears: 11,
        },
      ),
      rangeBand(
        '12 years up to 18 years, male',
        '18-40',
        'U/L',
        18,
        40,
        'UK-SYNNOVIS-CHEM',
        {
          sex: 'male',
          ageMinYears: 12,
          ageMaxYears: 18,
        },
      ),
      rangeBand(
        '12 years up to 18 years, female',
        '17-33',
        'U/L',
        17,
        33,
        'UK-SYNNOVIS-CHEM',
        {
          sex: 'female',
          ageMinYears: 12,
          ageMaxYears: 18,
        },
      ),
      rangeBand(
        '19 years up to 150 years, male',
        '5-34',
        'U/L',
        5,
        34,
        'UK-SYNNOVIS-CHEM',
        {
          sex: 'male',
          ageMinYears: 19,
          ageMaxYears: 150,
        },
      ),
      rangeBand(
        '19 years up to 150 years, female',
        '5-31',
        'U/L',
        5,
        31,
        'UK-SYNNOVIS-CHEM',
        {
          sex: 'female',
          ageMinYears: 19,
          ageMaxYears: 150,
        },
      ),
    ],
  ),
  referenceDefinition(['bicarbonate'], 'Bicarbonate', 'ukSynnovisChemistry', [
    rangeBand(
      '0 years up to 15 years',
      '19-28',
      'mmol/L',
      19,
      28,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinYears: 0,
        ageMaxYears: 15,
      },
    ),
    rangeBand(
      '16 years up to 150 years',
      '22-29',
      'mmol/L',
      22,
      29,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinYears: 16,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(
    ['bilirubin-total'],
    'Bilirubin total',
    'ukSynnovisChemistry',
    [rangeBand('All ages', '<21', 'umol/L', 0, 21, 'UK-SYNNOVIS-CHEM')],
  ),
  referenceDefinition(['chloride'], 'Chloride', 'ukSynnovisChemistry', [
    rangeBand('All ages', '95-108', 'mmol/L', 95, 108, 'UK-SYNNOVIS-CHEM'),
  ]),
  referenceDefinition(['creatinine'], 'Creatinine', 'ukSynnovisChemistry', [
    rangeBand(
      '0 days up to 15 days',
      '29-82',
      'umol/L',
      29,
      82,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinDays: 0,
        ageMaxDays: 15,
      },
    ),
    rangeBand(
      '15 days up to 1 year',
      '15-37',
      'umol/L',
      15,
      37,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinDays: 15,
        ageMaxYears: 1,
      },
    ),
    rangeBand(
      '1 year up to 12 years',
      '22-53',
      'umol/L',
      22,
      53,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinYears: 1,
        ageMaxYears: 12,
      },
    ),
    rangeBand(
      '13 years up to 18 years, male',
      '41-105',
      'umol/L',
      41,
      105,
      'UK-SYNNOVIS-CHEM',
      {
        sex: 'male',
        ageMinYears: 13,
        ageMaxYears: 18,
      },
    ),
    rangeBand(
      '13 years up to 18 years, female',
      '38-74',
      'umol/L',
      38,
      74,
      'UK-SYNNOVIS-CHEM',
      {
        sex: 'female',
        ageMinYears: 13,
        ageMaxYears: 18,
      },
    ),
    rangeBand(
      '19 years up to 150 years, male',
      '59-104',
      'umol/L',
      59,
      104,
      'UK-SYNNOVIS-CHEM',
      {
        sex: 'male',
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
    rangeBand(
      '19 years up to 150 years, female',
      '45-84',
      'umol/L',
      45,
      84,
      'UK-SYNNOVIS-CHEM',
      {
        sex: 'female',
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['crp'], 'C-reactive protein', 'ukSynnovisChemistry', [
    rangeBand('All ages', '<5', 'mg/L', 0, 5, 'UK-SYNNOVIS-CHEM'),
  ]),
  referenceDefinition(
    ['ggt'],
    'Gamma glutamyltransferase',
    'ukSynnovisChemistry',
    [
      rangeBand('All ages, male', '<55', 'U/L', 0, 55, 'UK-SYNNOVIS-CHEM', {
        sex: 'male',
      }),
      rangeBand('All ages, female', '<38', 'U/L', 0, 38, 'UK-SYNNOVIS-CHEM', {
        sex: 'female',
      }),
    ],
  ),
  referenceDefinition(['glucose'], 'Glucose fasting', 'ukSynnovisChemistry', [
    rangeBand('All ages', '4.0-6.0', 'mmol/L', 4, 6, 'UK-SYNNOVIS-CHEM', {
      specimen: 'fasting serum/plasma',
    }),
  ]),
  referenceDefinition(['magnesium'], 'Magnesium', 'ukSynnovisChemistry', [
    rangeBand(
      '0 days up to 4 weeks',
      '0.60-1.00',
      'mmol/L',
      0.6,
      1,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinDays: 0,
        ageMaxWeeks: 4,
      },
    ),
    rangeBand(
      '4 weeks up to 150 years',
      '0.70-1.00',
      'mmol/L',
      0.7,
      1,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinWeeks: 4,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['phosphate'], 'Phosphate', 'ukSynnovisChemistry', [
    rangeBand(
      '0 days up to 4 weeks',
      '1.30-2.60',
      'mmol/L',
      1.3,
      2.6,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinDays: 0,
        ageMaxWeeks: 4,
      },
    ),
    rangeBand(
      '4 weeks up to 1 year',
      '1.50-2.40',
      'mmol/L',
      1.5,
      2.4,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinWeeks: 4,
        ageMaxYears: 1,
      },
    ),
    rangeBand(
      '1 year up to 5 years',
      '1.30-2.10',
      'mmol/L',
      1.3,
      2.1,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinYears: 1,
        ageMaxYears: 5,
      },
    ),
    rangeBand(
      '6 years up to 12 years',
      '1.00-1.80',
      'mmol/L',
      1,
      1.8,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinYears: 6,
        ageMaxYears: 12,
      },
    ),
    rangeBand(
      '13 years up to 18 years',
      '0.90-1.50',
      'mmol/L',
      0.9,
      1.5,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinYears: 13,
        ageMaxYears: 18,
      },
    ),
    rangeBand(
      '19 years up to 150 years',
      '0.80-1.50',
      'mmol/L',
      0.8,
      1.5,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['potassium'], 'Potassium', 'ukSynnovisChemistry', [
    rangeBand(
      '0 days up to 4 weeks',
      '3.4-6.0',
      'mmol/L',
      3.4,
      6,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinDays: 0,
        ageMaxWeeks: 4,
      },
    ),
    rangeBand(
      '4 weeks up to 150 years',
      '3.5-5.3',
      'mmol/L',
      3.5,
      5.3,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinWeeks: 4,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['sodium'], 'Sodium', 'ukSynnovisChemistry', [
    rangeBand('All ages', '133-146', 'mmol/L', 133, 146, 'UK-SYNNOVIS-CHEM'),
  ]),
  referenceDefinition(['ft3'], 'T3 free', 'ukSynnovisChemistry', [
    rangeBand('All ages', '2.4-6.0', 'pmol/L', 2.4, 6, 'UK-SYNNOVIS-CHEM'),
  ]),
  referenceDefinition(['ft4'], 'T4 free', 'ukSynnovisChemistry', [
    rangeBand('All ages', '9.0-19.1', 'pmol/L', 9, 19.1, 'UK-SYNNOVIS-CHEM'),
  ]),
  referenceDefinition(['urea'], 'Urea', 'ukSynnovisChemistry', [
    rangeBand(
      '0 days up to 4 weeks',
      '0.8-5.5',
      'mmol/L',
      0.8,
      5.5,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinDays: 0,
        ageMaxWeeks: 4,
      },
    ),
    rangeBand(
      '4 weeks up to 150 years',
      '2.5-7.8',
      'mmol/L',
      2.5,
      7.8,
      'UK-SYNNOVIS-CHEM',
      {
        ageMinWeeks: 4,
        ageMaxYears: 150,
      },
    ),
  ]),
];

const ukMftBloodCountsDefinitions = [
  referenceDefinition(['rbc'], 'Red blood cells', 'ukMftBloodCounts', [
    rangeBand(
      '18 years up to 150 years, female',
      '3.8-5.5',
      '10^12/L',
      3.8,
      5.5,
      'UK-MFT-BLOOD-COUNTS',
      {
        sex: 'female',
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
    rangeBand(
      '18 years up to 150 years, male',
      '4.5-6.0',
      '10^12/L',
      4.5,
      6,
      'UK-MFT-BLOOD-COUNTS',
      {
        sex: 'male',
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['hemoglobin'], 'Haemoglobin', 'ukMftBloodCounts', [
    rangeBand(
      '18 years up to 150 years, female',
      '115-165',
      'g/L',
      115,
      165,
      'UK-MFT-BLOOD-COUNTS',
      {
        sex: 'female',
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
    rangeBand(
      '18 years up to 150 years, male',
      '130-180',
      'g/L',
      130,
      180,
      'UK-MFT-BLOOD-COUNTS',
      {
        sex: 'male',
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['hematocrit'], 'Haematocrit', 'ukMftBloodCounts', [
    rangeBand(
      '18 years up to 150 years, female',
      '0.37-0.47',
      'L/L',
      0.37,
      0.47,
      'UK-MFT-BLOOD-COUNTS',
      {
        sex: 'female',
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
    rangeBand(
      '18 years up to 150 years, male',
      '0.40-0.52',
      'L/L',
      0.4,
      0.52,
      'UK-MFT-BLOOD-COUNTS',
      {
        sex: 'male',
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['mcv'], 'Mean cell volume', 'ukMftBloodCounts', [
    rangeBand(
      '18 years up to 150 years',
      '80-98',
      'fL',
      80,
      98,
      'UK-MFT-BLOOD-COUNTS',
      {
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['mch'], 'MCH', 'ukMftBloodCounts', [
    rangeBand(
      '18 years up to 150 years',
      '27.0-33.0',
      'pg',
      27,
      33,
      'UK-MFT-BLOOD-COUNTS',
      {
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['mchc'], 'MCHC', 'ukMftBloodCounts', [
    rangeBand(
      '18 years up to 150 years',
      '320-365',
      'g/L',
      320,
      365,
      'UK-MFT-BLOOD-COUNTS',
      {
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['wbc'], 'White blood cell count', 'ukMftBloodCounts', [
    rangeBand(
      '18 years up to 150 years',
      '4.0-11.0',
      '10^9/L',
      4,
      11,
      'UK-MFT-BLOOD-COUNTS',
      {
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(
    ['neutrophils-absolute'],
    'Neutrophils absolute',
    'ukMftBloodCounts',
    [
      rangeBand(
        '18 years up to 150 years',
        '1.8-7.5',
        '10^9/L',
        1.8,
        7.5,
        'UK-MFT-BLOOD-COUNTS',
        {
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  ),
  referenceDefinition(
    ['lymphocytes-absolute'],
    'Lymphocytes absolute',
    'ukMftBloodCounts',
    [
      rangeBand(
        '18 years up to 150 years',
        '1.0-4.0',
        '10^9/L',
        1,
        4,
        'UK-MFT-BLOOD-COUNTS',
        {
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  ),
  referenceDefinition(
    ['monocytes-absolute'],
    'Monocytes absolute',
    'ukMftBloodCounts',
    [
      rangeBand(
        '18 years up to 150 years',
        '0.2-1.0',
        '10^9/L',
        0.2,
        1,
        'UK-MFT-BLOOD-COUNTS',
        {
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  ),
  referenceDefinition(
    ['eosinophils-absolute'],
    'Eosinophils absolute',
    'ukMftBloodCounts',
    [
      rangeBand(
        '18 years up to 150 years',
        '0.0-0.4',
        '10^9/L',
        0,
        0.4,
        'UK-MFT-BLOOD-COUNTS',
        {
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  ),
  referenceDefinition(
    ['basophils-absolute'],
    'Basophils absolute',
    'ukMftBloodCounts',
    [
      rangeBand(
        '18 years up to 150 years',
        '0.0-0.1',
        '10^9/L',
        0,
        0.1,
        'UK-MFT-BLOOD-COUNTS',
        {
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  ),
  referenceDefinition(['platelets'], 'Platelets', 'ukMftBloodCounts', [
    rangeBand(
      '18 years up to 150 years',
      '150-400',
      '10^9/L',
      150,
      400,
      'UK-MFT-BLOOD-COUNTS',
      {
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(
    ['esr'],
    'Erythrocyte sedimentation rate',
    'ukMftBloodCounts',
    [
      rangeBand(
        '0 years up to 16 years',
        '4-10',
        'mm/hr',
        4,
        10,
        'UK-MFT-BLOOD-COUNTS',
        {
          ageMinYears: 0,
          ageMaxYears: 16,
        },
      ),
      rangeBand(
        '16 years up to 150 years, female',
        '0-7',
        'mm/hr',
        0,
        7,
        'UK-MFT-BLOOD-COUNTS',
        {
          sex: 'female',
          ageMinYears: 16,
          ageMaxYears: 150,
        },
      ),
      rangeBand(
        '16 years up to 150 years, male',
        '0-5',
        'mm/hr',
        0,
        5,
        'UK-MFT-BLOOD-COUNTS',
        {
          sex: 'male',
          ageMinYears: 16,
          ageMaxYears: 150,
        },
      ),
    ],
  ),
];

const ukUhdHaematologyDefinitions = [
  referenceDefinition(['rbc'], 'Red blood cells', 'ukUhdHaematology', [
    rangeBand(
      '18 years up to 150 years, male',
      '4.5-5.5',
      '10^12/L',
      4.5,
      5.5,
      'UK-UHD-HAEMATOLOGY',
      {
        sex: 'male',
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
    rangeBand(
      '18 years up to 150 years, female',
      '3.8-4.8',
      '10^12/L',
      3.8,
      4.8,
      'UK-UHD-HAEMATOLOGY',
      {
        sex: 'female',
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['hemoglobin'], 'Haemoglobin', 'ukUhdHaematology', [
    rangeBand(
      '18 years up to 150 years, male',
      '130-170',
      'g/L',
      130,
      170,
      'UK-UHD-HAEMATOLOGY',
      {
        sex: 'male',
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
    rangeBand(
      '18 years up to 150 years, female',
      '120-150',
      'g/L',
      120,
      150,
      'UK-UHD-HAEMATOLOGY',
      {
        sex: 'female',
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['hematocrit'], 'Haematocrit', 'ukUhdHaematology', [
    rangeBand(
      '18 years up to 150 years, male',
      '0.40-0.50',
      'L/L',
      0.4,
      0.5,
      'UK-UHD-HAEMATOLOGY',
      {
        sex: 'male',
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
    rangeBand(
      '18 years up to 150 years, female',
      '0.36-0.46',
      'L/L',
      0.36,
      0.46,
      'UK-UHD-HAEMATOLOGY',
      {
        sex: 'female',
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['mcv'], 'Mean cell volume', 'ukUhdHaematology', [
    rangeBand(
      '18 years up to 150 years',
      '83-101',
      'fL',
      83,
      101,
      'UK-UHD-HAEMATOLOGY',
      {
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['mch'], 'MCH', 'ukUhdHaematology', [
    rangeBand(
      '18 years up to 150 years',
      '27-32',
      'pg',
      27,
      32,
      'UK-UHD-HAEMATOLOGY',
      {
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['mchc'], 'MCHC', 'ukUhdHaematology', [
    rangeBand(
      '18 years up to 150 years',
      '315-345',
      'g/L',
      315,
      345,
      'UK-UHD-HAEMATOLOGY',
      {
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['platelets'], 'Platelets', 'ukUhdHaematology', [
    rangeBand(
      '18 years up to 150 years',
      '150-410',
      '10^9/L',
      150,
      410,
      'UK-UHD-HAEMATOLOGY',
      {
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(['wbc'], 'White blood cell count', 'ukUhdHaematology', [
    rangeBand(
      '18 years up to 150 years',
      '4.0-10.0',
      '10^9/L',
      4,
      10,
      'UK-UHD-HAEMATOLOGY',
      {
        ageMinYears: 18,
        ageMaxYears: 150,
      },
    ),
  ]),
  referenceDefinition(
    ['neutrophils-absolute'],
    'Neutrophils absolute',
    'ukUhdHaematology',
    [
      rangeBand(
        '18 years up to 150 years',
        '2.0-7.0',
        '10^9/L',
        2,
        7,
        'UK-UHD-HAEMATOLOGY',
        {
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  ),
  referenceDefinition(
    ['lymphocytes-absolute'],
    'Lymphocytes absolute',
    'ukUhdHaematology',
    [
      rangeBand(
        '18 years up to 150 years',
        '1.0-3.0',
        '10^9/L',
        1,
        3,
        'UK-UHD-HAEMATOLOGY',
        {
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  ),
  referenceDefinition(
    ['monocytes-absolute'],
    'Monocytes absolute',
    'ukUhdHaematology',
    [
      rangeBand(
        '18 years up to 150 years',
        '0.2-1.0',
        '10^9/L',
        0.2,
        1,
        'UK-UHD-HAEMATOLOGY',
        {
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  ),
  referenceDefinition(
    ['eosinophils-absolute'],
    'Eosinophils absolute',
    'ukUhdHaematology',
    [
      rangeBand(
        '18 years up to 150 years',
        '0.02-0.5',
        '10^9/L',
        0.02,
        0.5,
        'UK-UHD-HAEMATOLOGY',
        {
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  ),
  referenceDefinition(
    ['basophils-absolute'],
    'Basophils absolute',
    'ukUhdHaematology',
    [
      rangeBand(
        '18 years up to 150 years',
        '0.02-0.1',
        '10^9/L',
        0.02,
        0.1,
        'UK-UHD-HAEMATOLOGY',
        {
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  ),
  referenceDefinition(
    ['esr'],
    'Erythrocyte sedimentation rate',
    'ukUhdHaematology',
    [
      rangeBand(
        '0 years up to 50 years, male',
        '1-10',
        'mm/hr',
        1,
        10,
        'UK-UHD-HAEMATOLOGY',
        {
          sex: 'male',
          ageMinYears: 0,
          ageMaxYears: 50,
          method: 'Starrsed EDTA',
        },
      ),
      rangeBand(
        '0 years up to 50 years, female',
        '1-12',
        'mm/hr',
        1,
        12,
        'UK-UHD-HAEMATOLOGY',
        {
          sex: 'female',
          ageMinYears: 0,
          ageMaxYears: 50,
          method: 'Starrsed EDTA',
        },
      ),
      rangeBand(
        '51 years up to 60 years, male',
        '1-12',
        'mm/hr',
        1,
        12,
        'UK-UHD-HAEMATOLOGY',
        {
          sex: 'male',
          ageMinYears: 51,
          ageMaxYears: 60,
          method: 'Starrsed EDTA',
        },
      ),
      rangeBand(
        '51 years up to 60 years, female',
        '1-19',
        'mm/hr',
        1,
        19,
        'UK-UHD-HAEMATOLOGY',
        {
          sex: 'female',
          ageMinYears: 51,
          ageMaxYears: 60,
          method: 'Starrsed EDTA',
        },
      ),
      rangeBand(
        '61 years up to 70 years, male',
        '1-14',
        'mm/hr',
        1,
        14,
        'UK-UHD-HAEMATOLOGY',
        {
          sex: 'male',
          ageMinYears: 61,
          ageMaxYears: 70,
          method: 'Starrsed EDTA',
        },
      ),
      rangeBand(
        '61 years up to 70 years, female',
        '1-20',
        'mm/hr',
        1,
        20,
        'UK-UHD-HAEMATOLOGY',
        {
          sex: 'female',
          ageMinYears: 61,
          ageMaxYears: 70,
          method: 'Starrsed EDTA',
        },
      ),
      rangeBand(
        '70 years up to 150 years, male',
        '1-30',
        'mm/hr',
        1,
        30,
        'UK-UHD-HAEMATOLOGY',
        {
          sex: 'male',
          ageMinYears: 70,
          ageMaxYears: 150,
          method: 'Starrsed EDTA',
        },
      ),
      rangeBand(
        '70 years up to 150 years, female',
        '1-35',
        'mm/hr',
        1,
        35,
        'UK-UHD-HAEMATOLOGY',
        {
          sex: 'female',
          ageMinYears: 70,
          ageMaxYears: 150,
          method: 'Starrsed EDTA',
        },
      ),
    ],
  ),
];

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
  {
    testIds: ['mch'],
    name: 'MCH',
    sourceReview: { status: 'candidate', parser: 'ukWorcsFbc' },
    bands: [
      rangeBand(
        '18 years up to 150 years',
        '28.0-32.0',
        'pg',
        28,
        32,
        'UK-WORCS-FBC',
        {
          ageMinYears: 18,
          ageMaxYears: 150,
        },
      ),
    ],
  },
  {
    testIds: ['mchc'],
    name: 'MCHC',
    sourceReview: { status: 'candidate', parser: 'ukWorcsFbc' },
    bands: [rangeBand('All ages', '320-360', 'g/L', 320, 360, 'UK-WORCS-FBC')],
  },
  {
    testIds: [
      'neutrophils-pct',
      'eosinophils-pct',
      'basophils-pct',
      'lymphocytes-pct',
      'monocytes-pct',
    ],
    name: 'Differential percentage',
    sourceReview: { status: 'candidate', parser: 'ukWorcsFbc' },
    bands: [
      {
        label: 'All ages',
        kind: 'note',
        display: 'Use absolute count',
        citationId: 'UK-WORCS-FBC',
        note: 'UK FBC differential intervals are represented as absolute counts in this source set.',
      },
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

const caSharedHealthHba1cDefinitions = [
  chemistryDefinition('hba1c-percent', 'Hemoglobin A1c', [
    rangeBand('All ages', '4.0-6.0', '%', 4, 6, 'CA-SHARED-HEALTH-HBA1C', {
      specimen: 'whole blood',
      method: 'NGSP/DCCT standardized assay',
    }),
  ]),
];

const caSharedHealthHdlDefinitions = [
  {
    testIds: ['hdl'],
    name: 'HDL cholesterol',
    sourceReview: { status: 'candidate', parser: 'caSharedHealthHdl' },
    bands: [
      thresholdBand(
        '0 years up to 20 years',
        '>=1.00',
        'mmol/L',
        1,
        'gte',
        'CA-SHARED-HEALTH-HDL',
        {
          ageMinYears: 0,
          ageMaxYears: 20,
          specimen: 'plasma/serum',
          note: 'Pediatric desired HDL-C decision limit; source also lists borderline and increased-risk categories.',
        },
      ),
      thresholdBand(
        '20 years up to 150 years, male',
        '>=1.00',
        'mmol/L',
        1,
        'gte',
        'CA-SHARED-HEALTH-HDL',
        {
          sex: 'male',
          ageMinYears: 20,
          ageMaxYears: 150,
          specimen: 'plasma/serum',
          note: 'Adult male metabolic-syndrome risk decision limit.',
        },
      ),
      thresholdBand(
        '20 years up to 150 years, female',
        '>=1.30',
        'mmol/L',
        1.3,
        'gte',
        'CA-SHARED-HEALTH-HDL',
        {
          sex: 'female',
          ageMinYears: 20,
          ageMaxYears: 150,
          specimen: 'plasma/serum',
          note: 'Adult female metabolic-syndrome risk decision limit.',
        },
      ),
    ],
  },
];

const caLhscTraceElementDefinitions = [
  traceElementDefinition(
    'calcium-whole-blood',
    'Calcium, whole blood',
    '1.06-1.29',
    'mmol/L',
    1.06,
    1.29,
  ),
  traceElementDefinition(
    'chromium-whole-blood',
    'Chromium, whole blood',
    '0.00-23.1',
    'nmol/L',
    0,
    23.1,
  ),
  traceElementDefinition(
    'cobalt-whole-blood',
    'Cobalt, whole blood',
    '0.00-8.5',
    'nmol/L',
    0,
    8.5,
  ),
  traceElementDefinition(
    'copper-whole-blood',
    'Copper, whole blood',
    '10.8-16.3 male',
    'umol/L',
    10.8,
    16.3,
    {
      sex: 'male',
    },
  ),
  traceElementDefinition(
    'copper-whole-blood',
    'Copper, whole blood',
    '11.8-24.6 female',
    'umol/L',
    11.8,
    24.6,
    {
      sex: 'female',
    },
  ),
  traceElementDefinition(
    'magnesium-whole-blood',
    'Magnesium, whole blood',
    '1.04-1.49',
    'mmol/L',
    1.04,
    1.49,
  ),
  traceElementDefinition(
    'manganese-whole-blood',
    'Manganese, whole blood',
    '98-355',
    'nmol/L',
    98,
    355,
  ),
  traceElementDefinition(
    'molybdenum-whole-blood',
    'Molybdenum, whole blood',
    '0.00-16.7',
    'nmol/L',
    0,
    16.7,
  ),
  traceElementDefinition(
    'selenium-whole-blood',
    'Selenium, whole blood',
    '1.48-2.24',
    'umol/L',
    1.48,
    2.24,
  ),
  traceElementDefinition(
    'vanadium-whole-blood',
    'Vanadium, whole blood',
    '0.00-4.9',
    'nmol/L',
    0,
    4.9,
  ),
  traceElementDefinition(
    'zinc-whole-blood',
    'Zinc, whole blood',
    '63-92',
    'umol/L',
    63,
    92,
  ),
  traceElementDefinition(
    'chromium-plasma',
    'Chromium, plasma',
    '0.00-9.6',
    'nmol/L',
    0,
    9.6,
    {
      specimen: 'plasma',
    },
  ),
  traceElementDefinition(
    'cobalt-plasma',
    'Cobalt, plasma',
    '0.00-11.0',
    'nmol/L',
    0,
    11,
    {
      specimen: 'plasma',
    },
  ),
  traceElementDefinition(
    'copper-plasma',
    'Copper, plasma',
    '11.2-20.6 male',
    'umol/L',
    11.2,
    20.6,
    {
      sex: 'male',
      specimen: 'plasma',
      ageMinYears: 14,
      ageMaxYears: 150,
    },
  ),
  traceElementDefinition(
    'copper-plasma',
    'Copper, plasma',
    '13.5-36.5 female',
    'umol/L',
    13.5,
    36.5,
    {
      sex: 'female',
      specimen: 'plasma',
      ageMinYears: 14,
      ageMaxYears: 150,
    },
  ),
  traceElementDefinition(
    'selenium-plasma',
    'Selenium, plasma',
    '1.33-2.03',
    'umol/L',
    1.33,
    2.03,
    {
      specimen: 'plasma',
      ageMinYears: 10,
      ageMaxYears: 150,
    },
  ),
  traceElementDefinition(
    'zinc-plasma',
    'Zinc, plasma',
    '9.4-15.0',
    'umol/L',
    9.4,
    15,
    {
      specimen: 'plasma',
      ageMinYears: 13,
      ageMaxYears: 150,
    },
  ),
];

const caNorthernHealthChemistryDefinitions = [
  chemistryDefinition('albumin', 'Albumin', [
    rangeBand(
      '19 years up to 150 years',
      '35-52',
      'g/L',
      35,
      52,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  chemistryDefinition('alkaline-phosphatase', 'Alkaline phosphatase', [
    rangeBand(
      '19 years up to 150 years, male',
      '40-129',
      'U/L',
      40,
      129,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        sex: 'male',
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
    rangeBand(
      '19 years up to 150 years, female',
      '35-104',
      'U/L',
      35,
      104,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        sex: 'female',
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  chemistryDefinition('alt', 'ALT', [
    thresholdBand(
      '19 years up to 150 years, male',
      '<41',
      'U/L',
      41,
      'lt',
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        sex: 'male',
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
    thresholdBand(
      '19 years up to 150 years, female',
      '<33',
      'U/L',
      33,
      'lt',
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        sex: 'female',
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  chemistryDefinition('amylase', 'Amylase', [
    rangeBand(
      '19 years up to 150 years',
      '28-100',
      'U/L',
      28,
      100,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  chemistryDefinition('ast', 'AST', [
    thresholdBand(
      '19 years up to 150 years, male',
      '<51',
      'U/L',
      51,
      'lt',
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        sex: 'male',
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
    thresholdBand(
      '19 years up to 150 years, female',
      '<36',
      'U/L',
      36,
      'lt',
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        sex: 'female',
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  chemistryDefinition('bilirubin-direct', 'Bilirubin direct', [
    thresholdBand(
      '19 years up to 150 years',
      '<6',
      'umol/L',
      6,
      'lt',
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
];

const caNorthernHealthHematologyDefinitions = [
  hematologyDefinition('wbc', 'White blood cell count', [
    rangeBand(
      '19 years up to 150 years',
      '4.0-11.0',
      '10^9/L',
      4,
      11,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  hematologyDefinition('rbc', 'Red blood cells', [
    rangeBand(
      '19 years up to 150 years, female',
      '4.3-5.5',
      '10^12/L',
      4.3,
      5.5,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        sex: 'female',
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
    rangeBand(
      '19 years up to 150 years, male',
      '4.0-4.9',
      '10^12/L',
      4,
      4.9,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        sex: 'male',
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  hematologyDefinition('hemoglobin', 'Hemoglobin', [
    rangeBand(
      '19 years up to 150 years, female',
      '115-150',
      'g/L',
      115,
      150,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        sex: 'female',
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
    rangeBand(
      '19 years up to 150 years, male',
      '135-170',
      'g/L',
      135,
      170,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        sex: 'male',
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  hematologyDefinition('hematocrit', 'Hematocrit', [
    rangeBand(
      '19 years up to 150 years, female',
      '0.36-0.46',
      'L/L',
      0.36,
      0.46,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        sex: 'female',
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
    rangeBand(
      '19 years up to 150 years, male',
      '0.41-0.52',
      'L/L',
      0.41,
      0.52,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        sex: 'male',
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  hematologyDefinition('mcv', 'Mean cell volume', [
    rangeBand(
      '19 years up to 150 years',
      '80-100',
      'fL',
      80,
      100,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  hematologyDefinition('mch', 'MCH', [
    rangeBand(
      '19 years up to 150 years',
      '26-35',
      'pg',
      26,
      35,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  hematologyDefinition('mchc', 'MCHC', [
    rangeBand(
      '19 years up to 150 years',
      '320-360',
      'g/L',
      320,
      360,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
  hematologyDefinition('platelets', 'Platelets', [
    rangeBand(
      '19 years up to 150 years',
      '160-380',
      '10^9/L',
      160,
      380,
      'CA-NORTHERN-HEALTH-DIRECTORY',
      {
        ageMinYears: 19,
        ageMaxYears: 150,
      },
    ),
  ]),
];

function chemistryDefinition(testId, name, bands) {
  const firstCitationId = bands[0]?.citationId || '';
  const parser = firstCitationId.startsWith('CA-NORTHERN-HEALTH')
    ? 'caNorthernHealthDirectory'
    : firstCitationId.startsWith('CA-SHARED-HEALTH')
      ? 'caSharedHealthHba1c'
      : 'ukGlosChemistry';
  return {
    testIds: [testId],
    name,
    sourceReview: { status: 'candidate', parser },
    bands,
  };
}

function hematologyDefinition(testId, name, bands) {
  return {
    testIds: [testId],
    name,
    sourceReview: { status: 'candidate', parser: 'caNorthernHealthHematology' },
    bands,
  };
}

function referenceDefinition(testIds, name, parser, bands) {
  return {
    testIds,
    name,
    sourceReview: { status: 'candidate', parser },
    bands,
  };
}

function traceElementDefinition(
  testId,
  name,
  display,
  unit,
  low,
  high,
  extra = {},
) {
  return {
    testIds: [testId],
    name,
    sourceReview: { status: 'candidate', parser: 'caLhscReferenceRanges' },
    bands: [
      rangeBand(
        'All ages unless source row states otherwise',
        display,
        unit,
        low,
        high,
        'CA-LHSC-TRACE-ELEMENTS',
        {
          specimen: 'whole blood',
          ...extra,
        },
      ),
    ],
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

function thresholdBand(
  label,
  display,
  unit,
  value,
  kind,
  citationId,
  extra = {},
) {
  return {
    label,
    kind,
    display,
    unit,
    ...(kind === 'gte' ? { low: value } : { high: value }),
    citationId,
    ...extra,
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
