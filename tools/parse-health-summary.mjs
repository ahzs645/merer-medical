#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const args = parseArgs(process.argv.slice(2));
if (!args.healthSummaryDir) {
  console.error(`Usage:
  node tools/parse-health-summary.mjs \\
    --health-summary-dir /path/to/HealthSummary \\
    [--output /path/to/health-summary-parsed.json]`);
  process.exit(1);
}

const healthSummaryDir = resolve(args.healthSummaryDir);
const ccdaDir = discoverCcdaDirectory(healthSummaryDir);
const parsed = {
  healthSummaryDir,
  ccdaDir,
  generatedAt: new Date().toISOString(),
  diagnosticReports: parseDiagnosticReports(ccdaDir),
};

const output = JSON.stringify(parsed, null, 2);
if (args.output) {
  writeFileSync(resolve(args.output), output, 'utf8');
} else {
  console.log(output);
}

function parseDiagnosticReports(dir) {
  if (!existsSync(dir)) return [];
  const reports = [];
  for (const name of readdirSync(dir).filter((entry) => /^DOC\d+\.XML$/i.test(entry))) {
    const file = join(dir, name);
    const xml = readFileSync(file, 'utf8');
    for (const section of extractCcdaSections(xml)) {
      if (section.title.toLowerCase() !== 'results') continue;
      for (const item of extractResultItems(section.xml)) {
        reports.push({
          sourceFile: file,
          title: item.title,
          date: item.date,
          accession: item.accession,
          modality: inferModality(`${item.title} ${item.narrative}`),
          bodySite: inferBodySite(`${item.title} ${item.narrative}`),
          narrative: item.narrative,
        });
      }
    }
  }
  return dedupeReports(reports);
}

function dedupeReports(reports) {
  const seen = new Set();
  return reports.filter((report) => {
    const key = [
      normalizeReportName(report.title),
      report.date,
      report.accession,
      report.narrative.slice(0, 200),
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function discoverCcdaDirectory(root) {
  const explicit = join(root, 'IHE_XDM');
  const searchRoot = existsSync(explicit) ? explicit : root;
  const candidates = [];
  for (const dir of walkDirectories(searchRoot)) {
    const count = readdirSync(dir).filter((name) => /^DOC\d+\.XML$/i.test(name)).length;
    if (count) candidates.push({ dir, count });
  }
  candidates.sort((a, b) => b.count - a.count || a.dir.localeCompare(b.dir));
  return candidates[0]?.dir || explicit;
}

function walkDirectories(dir) {
  const out = [dir];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const file = join(dir, entry);
    if (statSync(file).isDirectory()) out.push(...walkDirectories(file));
  }
  return out;
}

function extractCcdaSections(xml) {
  const sections = [];
  const re = /<section\b[\s\S]*?<\/section>/g;
  let match;
  while ((match = re.exec(xml))) {
    const sectionXml = match[0];
    const title = cleanText(sectionXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
    if (title) sections.push({ title, xml: sectionXml });
  }
  return sections;
}

function extractResultItems(sectionXml) {
  return [...sectionXml.matchAll(/<item\b[\s\S]*?<\/item>/g)]
    .map((match) => {
      const itemXml = match[0];
      const title = cleanText(itemXml.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/)?.[1] || 'C-CDA result');
      const narrative = cleanText(
        itemXml.match(/<paragraph\b[^>]*Narrative[^>]*>([\s\S]*?)<\/paragraph>/)?.[1] ||
          itemXml.match(/<td\b[^>]*styleCode="xpre"[^>]*>([\s\S]*?)<\/td>/)?.[1] ||
          '',
      );
      return {
        title,
        narrative,
        date:
          title.match(/\(([^)]*\d{4}[^)]*)\)/)?.[1] ||
          narrative.match(/Exam\/Service Date:\s*([^\n]+)/i)?.[1],
        accession: narrative.match(/Accession #\(s\):\s*([^\n]+)/i)?.[1],
      };
    })
    .filter((item) => item.title && item.narrative);
}

function normalizeReportName(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\s+-\s+final result.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferModality(text) {
  const normalized = text.toLowerCase();
  if (/\bmri?\b/.test(normalized)) return 'MRI';
  if (/\bus\b/.test(normalized) || normalized.includes('ultrasound')) return 'Ultrasound';
  if (/\bgr\b/.test(normalized) || normalized.includes('x-ray') || normalized.includes('radiograph')) return 'X-ray';
  if (/\bct\b/.test(normalized)) return 'CT';
  if (normalized.includes('ecg') || normalized.includes('ekg')) return 'ECG';
  return undefined;
}

function inferBodySite(text) {
  const normalized = text.toLowerCase();
  return ['knee', 'abdomen', 'pelvis', 'chest', 'kidney', 'bladder'].find((site) =>
    normalized.includes(site),
  );
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
    .replace(/&apos;/g, "'")
    .replace(/&#160;|&nbsp;/g, ' ');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    out[key] = argv[i + 1];
    i++;
  }
  return out;
}
