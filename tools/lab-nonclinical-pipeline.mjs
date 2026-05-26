#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, extname, join, resolve } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';

const execFileAsync = promisify(execFile);
const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), '..');
const sourceDir = join(repoRoot, 'data', 'lab-reference-sources');
const importDir = join(repoRoot, 'data', 'lab-reference-imports');
const plausibilityDir = join(importDir, 'plausibilityRanges');
const loincMetadataDir = join(importDir, 'loincMetadata');

const sources = [
  {
    id: 'ohdsi-dqd-cdm54-concept-level',
    lane: 'plausibilityRanges',
    parser: 'ohdsiDqdConceptLevel',
    url: 'https://raw.githubusercontent.com/OHDSI/DataQualityDashboard/main/inst/csv/OMOP_CDMv5.4_Concept_Level.csv',
    extension: 'csv',
    license: 'Apache-2.0',
    caveat:
      'Plausibility and data-quality thresholds only. Do not use as clinical reference intervals.',
  },
  {
    id: 'ahrq-appendix-o-lab-ranges',
    lane: 'plausibilityRanges',
    parser: 'ahrqAppendixO',
    url: 'https://hcup-us.ahrq.gov/datainnovations/clinicaldata/AppendixO_LabDataVariablesandRelevantRanges.pdf',
    extension: 'pdf',
    license: 'US government source; confirm downstream reuse terms before runtime packaging.',
    caveat:
      'Administrative database range checks and LOINC mappings, not patient-specific normal ranges.',
  },
  {
    id: 'loinc-fhir-codesystem',
    lane: 'loincMetadata',
    parser: 'loincFhirCodeSystem',
    url: 'https://raw.githubusercontent.com/loinc/loinc-fhir-codesystem/master/loinc.xml',
    extension: 'xml',
    license: 'LOINC license',
    caveat:
      'Lightweight CodeSystem metadata only. It does not include the full LOINC term release.',
  },
  {
    id: 'elapro-core-labs',
    lane: 'loincMetadata',
    parser: 'elaproCoreLabs',
    url: 'https://api.figshare.com/v2/articles/19767803',
    extension: 'zip',
    license: 'CC BY 4.0 / CC0 per source metadata; verify before app redistribution.',
    caveat:
      'LOINC-mapped eligibility-screening lab procedure metadata, not clinical normal ranges.',
  },
];

const sourceById = new Map(sources.map((source) => [source.id, source]));

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function getArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
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
      'Usage: node tools/lab-nonclinical-pipeline.mjs --list | --fetch | --analyze | --all [--source id]',
    );
    process.exit(1);
  }

  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(plausibilityDir, { recursive: true });
  await fs.mkdir(loincMetadataDir, { recursive: true });

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
  if (source.parser === 'elaproCoreLabs') {
    await fetchElapro(source);
    return;
  }

  const response = await fetch(source.url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; Mere lab nonclinical metadata pipeline)',
      Accept: '*/*',
    },
  });
  if (!response.ok) throw new Error(`${source.id} fetch failed: ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeSourceFiles(source, buffer, {
    contentType: response.headers.get('content-type'),
    fetchedUrl: response.url,
  });

  if (source.parser === 'ahrqAppendixO') {
    await writePdfTextSidecar(source);
  }
}

async function fetchElapro(source) {
  const articleResponse = await fetch(source.url, {
    headers: { Accept: 'application/json' },
  });
  if (!articleResponse.ok) {
    throw new Error(`${source.id} figshare API failed: ${articleResponse.status}`);
  }

  const article = await articleResponse.json();
  await fs.writeFile(
    join(sourceDir, `${source.id}.article.json`),
    `${JSON.stringify(article, null, 2)}\n`,
  );

  const file = article.files?.find((item) => item.download_url);
  if (!file) throw new Error(`${source.id} figshare article had no downloadable file`);

  const zipResponse = await fetch(file.download_url);
  if (!zipResponse.ok) {
    throw new Error(`${source.id} zip fetch failed: ${zipResponse.status}`);
  }
  const buffer = Buffer.from(await zipResponse.arrayBuffer());
  await writeSourceFiles(source, buffer, {
    articleUrl: source.url,
    contentType: zipResponse.headers.get('content-type'),
    fetchedUrl: zipResponse.url,
    figshareFile: file,
  });
}

async function writeSourceFiles(source, buffer, extraMetadata) {
  const path = sourcePath(source);
  await fs.writeFile(path, buffer);
  await fs.writeFile(
    sourceMetadataPath(source),
    `${JSON.stringify(
      {
        ...source,
        ...extraMetadata,
        fetchedAt: new Date().toISOString(),
        bytes: buffer.length,
        sha256: sha256(buffer),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Fetched ${source.id} -> ${path}`);
}

async function writePdfTextSidecar(source) {
  const pdfPath = sourcePath(source);
  const textPath = join(sourceDir, `${source.id}.txt`);
  const { stdout } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-'], {
    maxBuffer: 10 * 1024 * 1024,
  });
  await fs.writeFile(textPath, stdout);
}

async function analyzeSources(picked) {
  const analysis = {
    generatedAt: new Date().toISOString(),
    purpose:
      'Non-clinical lab support data. Plausibility checks and terminology metadata must stay separate from clinical reference intervals.',
    sources: [],
    outputs: [],
  };

  for (const source of picked) {
    const parsed = await parseSource(source);
    analysis.sources.push({
      id: source.id,
      lane: source.lane,
      parser: source.parser,
      url: source.url,
      license: source.license,
      caveat: source.caveat,
      status: parsed.status,
      counts: parsed.counts,
      notes: parsed.notes,
    });
    analysis.outputs.push(...parsed.outputs);
  }

  return analysis;
}

async function parseSource(source) {
  if (source.parser === 'ohdsiDqdConceptLevel') return parseOhdsi(source);
  if (source.parser === 'ahrqAppendixO') return parseAhrq(source);
  if (source.parser === 'loincFhirCodeSystem') return parseLoincFhir(source);
  if (source.parser === 'elaproCoreLabs') return parseElapro(source);
  throw new Error(`No parser for ${source.parser}`);
}

async function parseOhdsi(source) {
  const csv = await readSourceText(source);
  const rows = parseCsv(csv);
  const measurementRows = rows.filter(
    (row) =>
      row.cdmTableName === 'MEASUREMENT' &&
      (row.plausibleValueLow ||
        row.plausibleValueHigh ||
        row.plausibleUnitConceptIds ||
        row.plausibleGender),
  );

  const thresholds = measurementRows.map((row) => ({
    conceptId: numberOrString(row.conceptId),
    conceptName: row.conceptName,
    unitConceptId: numberOrString(row.unitConceptId),
    unitConceptName: row.unitConceptName || undefined,
    plausibleValueLow: numberOrUndefined(row.plausibleValueLow),
    plausibleValueLowThreshold: numberOrUndefined(row.plausibleValueLowThreshold),
    plausibleValueLowNotes: row.plausibleValueLowNotes || undefined,
    plausibleValueHigh: numberOrUndefined(row.plausibleValueHigh),
    plausibleValueHighThreshold: numberOrUndefined(row.plausibleValueHighThreshold),
    plausibleValueHighNotes: row.plausibleValueHighNotes || undefined,
    plausibleGender: row.plausibleGender || undefined,
    plausibleGenderThreshold: numberOrUndefined(row.plausibleGenderThreshold),
    plausibleUnitConceptIds: splitConceptIds(row.plausibleUnitConceptIds),
    plausibleUnitConceptIdsThreshold: splitConceptIds(
      row.plausibleUnitConceptIdsThreshold,
    ),
    source: sourceReference(source),
  }));

  const output = {
    generatedAt: new Date().toISOString(),
    kind: 'plausibilityRanges',
    source: sourceReference(source),
    caveat: source.caveat,
    thresholds,
  };
  const outputPath = join(plausibilityDir, 'ohdsi-dqd-cdm54.json');
  await writeJson(outputPath, output);

  return {
    status: 'parsed',
    counts: {
      rows: rows.length,
      measurementThresholds: thresholds.length,
      withValueLow: thresholds.filter((item) => item.plausibleValueLow !== undefined)
        .length,
      withValueHigh: thresholds.filter(
        (item) => item.plausibleValueHigh !== undefined,
      ).length,
      withUnitConstraints: thresholds.filter(
        (item) => item.plausibleUnitConceptIds.length > 0,
      ).length,
    },
    notes: ['Filtered to OMOP MEASUREMENT rows with plausibility constraints.'],
    outputs: [relativePath(outputPath)],
  };
}

async function parseAhrq(source) {
  await ensureSource(source);
  let text;
  try {
    text = await fs.readFile(join(sourceDir, `${source.id}.txt`), 'utf8');
  } catch {
    await writePdfTextSidecar(source);
    text = await fs.readFile(join(sourceDir, `${source.id}.txt`), 'utf8');
  }

  const loincMappings = parseAhrqLoincMappings(text).map((item) => ({
    ...item,
    source: sourceReference(source),
  }));
  const rangeChecks = parseAhrqRangeChecks(text).map((item) => ({
    ...item,
    source: sourceReference(source),
  }));

  const plausibilityOutput = {
    generatedAt: new Date().toISOString(),
    kind: 'plausibilityRanges',
    source: sourceReference(source),
    caveat: source.caveat,
    rangeChecks,
  };
  const metadataOutput = {
    generatedAt: new Date().toISOString(),
    kind: 'loincMetadata',
    source: sourceReference(source),
    caveat: source.caveat,
    loincMappings,
  };

  const plausibilityPath = join(plausibilityDir, 'ahrq-appendix-o-range-checks.json');
  const metadataPath = join(loincMetadataDir, 'ahrq-appendix-o-loinc-mappings.json');
  await writeJson(plausibilityPath, plausibilityOutput);
  await writeJson(metadataPath, metadataOutput);

  return {
    status: 'parsed',
    counts: {
      loincMappings: loincMappings.length,
      rangeChecks: rangeChecks.length,
    },
    notes: [
      'PDF text was extracted with pdftotext -layout.',
      'Range checks are administrative absolute/relative bounds, not clinical normals.',
    ],
    outputs: [relativePath(plausibilityPath), relativePath(metadataPath)],
  };
}

async function parseLoincFhir(source) {
  const xml = await readSourceText(source);
  const metadata = {
    generatedAt: new Date().toISOString(),
    kind: 'loincMetadata',
    source: sourceReference(source),
    caveat: source.caveat,
    codeSystem: {
      url: extractXmlValue(xml, 'url'),
      version: extractXmlValue(xml, 'version'),
      name: extractXmlValue(xml, 'name'),
      title: extractXmlValue(xml, 'title'),
      status: extractXmlValue(xml, 'status'),
      description: extractXmlText(xml, 'description'),
      content: extractXmlValue(xml, 'content'),
    },
    filters: extractXmlBlocks(xml, 'filter').map(parseCodeSystemBlock),
    properties: extractXmlBlocks(xml, 'property').map(parseCodeSystemBlock),
  };

  const outputPath = join(loincMetadataDir, 'loinc-fhir-codesystem.json');
  await writeJson(outputPath, metadata);

  return {
    status: 'profiled',
    counts: {
      filters: metadata.filters.length,
      properties: metadata.properties.length,
      concepts: 0,
    },
    notes: [
      'This CodeSystem file describes LOINC metadata fields and filters; it does not contain full LOINC terms.',
    ],
    outputs: [relativePath(outputPath)],
  };
}

async function parseElapro(source) {
  await ensureSource(source);
  const zipBuffer = await fs.readFile(sourcePath(source));
  const files = unzipSync(new Uint8Array(zipBuffer));
  const csvEntry = Object.entries(files).find(([name]) =>
    name.endsWith('Appendix8A__LOINC_FINAL_DATASET.csv'),
  );
  if (!csvEntry) throw new Error('ELaPro zip did not include Appendix8A CSV');

  const rows = parseCsv(strFromU8(csvEntry[1]));
  const terms = rows.map((row) => ({
    rank: numberOrUndefined(row.RANK),
    primaryLoinc: emptyToUndefined(row.Primary_LOINC_NUM),
    secondaryLoinc: emptyToUndefined(row.Secondary_LOINC_NUM),
    officialUmlsLncCui: emptyToUndefined(row.Official_UMLS_LNC_CUI),
    primaryUmlsLabCui: emptyToUndefined(row.Primary_UMLS_LAB_CUI),
    description: emptyToUndefined(row.STR),
    component: emptyToUndefined(row.COMPONENT),
    property: emptyToUndefined(row.PROPERTY),
    timeAspect: emptyToUndefined(row.TIME_ASPCT),
    system: emptyToUndefined(row.SYSTEM),
    scaleType: emptyToUndefined(row.SCALE_TYP),
    methodType: emptyToUndefined(row.METHOD_TYP),
    class: emptyToUndefined(row.CLASS),
    status: emptyToUndefined(row.STATUS),
    consumerName: emptyToUndefined(row.CONSUMER_NAME),
    submittedUnits: emptyToUndefined(row.SUBMITTED_UNITS),
    exampleUnits: emptyToUndefined(row.EXAMPLE_UNITS),
    exampleUcumUnits: emptyToUndefined(row.EXAMPLE_UCUM_UNITS),
    exampleSiUcumUnits: emptyToUndefined(row.EXAMPLE_SI_UCUM_UNITS),
    longCommonName: emptyToUndefined(row.LONG_COMMON_NAME),
    shortName: emptyToUndefined(row.SHORTNAME),
    displayName: emptyToUndefined(row.DisplayName),
    relatedNames: splitRelatedNames(row.RELATEDNAMES2),
    source: sourceReference(source),
  }));

  const byPrimary = new Map();
  for (const term of terms) {
    if (!term.primaryLoinc) continue;
    if (!byPrimary.has(term.primaryLoinc)) {
      byPrimary.set(term.primaryLoinc, {
        primaryLoinc: term.primaryLoinc,
        rank: term.rank,
        description: term.description,
        component: term.component,
        secondaryTerms: [],
      });
    }
    byPrimary.get(term.primaryLoinc).secondaryTerms.push(term);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    kind: 'loincMetadata',
    source: sourceReference(source),
    caveat: source.caveat,
    terms,
    groupedByPrimaryLoinc: [...byPrimary.values()].sort(
      (a, b) => (a.rank || 9999) - (b.rank || 9999),
    ),
  };

  const outputPath = join(loincMetadataDir, 'elapro-core-labs.json');
  await writeJson(outputPath, output);

  return {
    status: 'parsed',
    counts: {
      terms: terms.length,
      primaryLoincGroups: byPrimary.size,
      distinctSecondaryLoinc: new Set(terms.map((term) => term.secondaryLoinc)).size,
    },
    notes: [
      'Reduced to fields useful for search, aliases, units, and LOINC mapping.',
      'No reference intervals are imported from ELaPro.',
    ],
    outputs: [relativePath(outputPath)],
  };
}

function parseAhrqLoincMappings(text) {
  const beforeRanges = text.split('RANGE CHECKS FOR LABORATORY DATA')[0] || text;
  const mappings = [];
  for (const line of beforeRanges.split(/\r?\n/)) {
    const loincMatch = line.match(/\b(\d{3,5}-\d)\b/);
    if (!loincMatch) continue;
    const compact = line.replace(/\s+/g, ' ').trim();
    const beforeCode = compact.slice(0, compact.indexOf(loincMatch[1])).trim();
    const afterCode = compact.slice(compact.indexOf(loincMatch[1]) + loincMatch[1].length).trim();
    const testNumber = beforeCode.match(/^(\d+[A-Z]?)/)?.[1];
    mappings.push({
      testNumber,
      loinc: loincMatch[1],
      rawLabel: beforeCode.replace(/^(\d+[A-Z]?)\s+/, '') || undefined,
      loincName: afterCode || undefined,
    });
  }
  return mappings;
}

function parseAhrqRangeChecks(text) {
  const section = text.split('RANGE CHECKS FOR LABORATORY DATA')[1] || '';
  const checks = [];
  for (const rawLine of section.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    const match = line.match(
      /^(.+?)\s+((?:n\/a|-?[\d,.]+%?))\s+((?:n\/a|-?[\d,.]+%?))\s+((?:n\/a|-?[\d,.]+%?))\s+((?:n\/a|-?[\d,.]+%?))$/i,
    );
    if (!match) continue;
    const [, label, absoluteLow, absoluteHigh, relativeLow, relativeHigh] = match;
    const unitMatch = label.match(/\(([^)]+)\)|\[([^\]]+)\]/);
    checks.push({
      testName: label.replace(/\s*(\([^)]+\)|\[[^\]]+\])\s*/g, '').trim(),
      unit: unitMatch?.[1] || unitMatch?.[2] || undefined,
      absoluteLow: boundValue(absoluteLow),
      absoluteHigh: boundValue(absoluteHigh),
      relativeLow: boundValue(relativeLow),
      relativeHigh: boundValue(relativeHigh),
      rawLabel: label,
    });
  }
  return checks;
}

function parseCsv(csv) {
  const rows = [];
  const parsedRows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      parsedRows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += char;
  }

  if (field || row.length > 0) {
    row.push(field);
    parsedRows.push(row);
  }

  const headers = parsedRows.shift() || [];
  for (const parsedRow of parsedRows) {
    if (parsedRow.length === 1 && parsedRow[0] === '') continue;
    rows.push(
      Object.fromEntries(headers.map((header, index) => [header, parsedRow[index] || ''])),
    );
  }
  return rows;
}

async function ensureSource(source) {
  try {
    await fs.access(sourcePath(source));
  } catch {
    await fetchSource(source);
  }
}

async function readSourceText(source) {
  await ensureSource(source);
  return fs.readFile(sourcePath(source), 'utf8');
}

function sourcePath(source) {
  return join(sourceDir, `${source.id}.${source.extension}`);
}

function sourceMetadataPath(source) {
  return join(sourceDir, `${source.id}.metadata.json`);
}

function sourceReference(source) {
  return {
    id: source.id,
    url: source.url,
    lane: source.lane,
    license: source.license,
  };
}

async function writeJson(path, value) {
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeAnalysis(analysis) {
  const byLane = Map.groupBy(analysis.sources, (source) => source.lane);
  for (const [lane, sourcesForLane] of byLane.entries()) {
    const dir = lane === 'plausibilityRanges' ? plausibilityDir : loincMetadataDir;
    await writeJson(join(dir, 'source-analysis.json'), {
      generatedAt: analysis.generatedAt,
      purpose: analysis.purpose,
      sources: sourcesForLane,
      outputs: analysis.outputs.filter((output) => output.includes(`/${lane}/`)),
    });
  }
  console.log(`Wrote non-clinical lab outputs to ${importDir}`);
}

function extractXmlBlocks(xml, tagName) {
  return [...xml.matchAll(new RegExp(`<${tagName}>[\\s\\S]*?<\\/${tagName}>`, 'g'))].map(
    (match) => match[0],
  );
}

function parseCodeSystemBlock(block) {
  return {
    code: extractXmlValue(block, 'code'),
    uri: extractXmlValue(block, 'uri'),
    description: extractXmlValue(block, 'description'),
    type: extractXmlValue(block, 'type'),
    operator: extractXmlValues(block, 'operator'),
    value: extractXmlValue(block, 'value'),
  };
}

function extractXmlValue(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}\\s+value="([^"]*)"\\s*\\/>`));
  return match ? decodeXml(match[1]) : undefined;
}

function extractXmlValues(xml, tagName) {
  return [...xml.matchAll(new RegExp(`<${tagName}\\s+value="([^"]*)"\\s*\\/>`, 'g'))].map(
    (match) => decodeXml(match[1]),
  );
}

function extractXmlText(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}\\s+value="([^"]*)"\\s*\\/>`));
  if (match) return decodeXml(match[1]);
  return undefined;
}

function decodeXml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function splitConceptIds(value) {
  if (!value) return [];
  return value
    .split(/[|;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map(numberOrString);
}

function splitRelatedNames(value) {
  if (!value || value === 'NA') return [];
  return value
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

function boundValue(value) {
  if (!value || value.toLowerCase() === 'n/a') return undefined;
  return Number(value.replace(/[,%]/g, ''));
}

function numberOrUndefined(value) {
  if (!value || value === 'NA') return undefined;
  const number = Number(value.replace(/,/g, ''));
  return Number.isFinite(number) ? number : undefined;
}

function numberOrString(value) {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

function emptyToUndefined(value) {
  if (!value || value === 'NA') return undefined;
  return value;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function relativePath(path) {
  return path.replace(`${repoRoot}/`, '');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
