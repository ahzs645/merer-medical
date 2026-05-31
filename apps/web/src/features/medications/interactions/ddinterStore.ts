import type {
  MedicationInteraction,
  MedicationInteractionBundleStatus,
  MedicationInteractionSeverity,
} from './types';
import type { NormalizedMedication } from './rxnormNormalizer';
import { expandMedicationInteractionAliases } from './ddinterAliases';

const DB_NAME = 'mere-medication-interactions';
const DB_VERSION = 1;
const STORE_NAME = 'ddinter';
const META_KEY = '__meta__';
const STALE_AFTER_MS = 72 * 60 * 60 * 1000;
const DDINTER_CSV_URLS = [
  '/assets/ddinter/ddinter_downloads_code_A.csv',
  '/assets/ddinter/ddinter_downloads_code_B.csv',
  '/assets/ddinter/ddinter_downloads_code_D.csv',
  '/assets/ddinter/ddinter_downloads_code_H.csv',
  '/assets/ddinter/ddinter_downloads_code_L.csv',
  '/assets/ddinter/ddinter_downloads_code_P.csv',
  '/assets/ddinter/ddinter_downloads_code_R.csv',
  '/assets/ddinter/ddinter_downloads_code_V.csv',
];

type StoredBundle = {
  key: string;
  records?: StoredInteractionRecord[];
  index?: StoredInteractionIndex;
  meta?: MedicationInteractionBundleStatus;
};

type StoredInteractionRecord = {
  id: string;
  ddinterIdA?: string;
  ddinterIdB?: string;
  drugA: string;
  drugB: string;
  normalizedA: string;
  normalizedB: string;
  severity: MedicationInteractionSeverity;
  description?: string;
  management?: string;
};

type StoredInteractionIndex = Record<string, string[]>;

type ParsedCsv = {
  records: StoredInteractionRecord[];
  valid: boolean;
};

export type { StoredInteractionIndex, StoredInteractionRecord };

export async function getDdinterStatus(): Promise<MedicationInteractionBundleStatus> {
  const db = await openDb();
  const meta = await get<StoredBundle>(db, META_KEY);
  db.close();
  if (!meta?.meta) {
    return {
      installed: false,
      readiness: 'missing',
      recordCount: 0,
      message: 'No DDInter bundle installed.',
    };
  }

  return withReadiness(meta.meta);
}

export async function importDdinterCsvFiles(files: File[]) {
  return importDdinterCsvTexts(
    await Promise.all(files.map((file) => file.text())),
    'DDInter manually imported CSV bundle',
  );
}

export async function syncDdinterBundleFromRemote() {
  const texts = await Promise.all(
    DDINTER_CSV_URLS.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Unable to download ${url}: ${response.status}`);
      }
      return response.text();
    }),
  );

  return importDdinterCsvTexts(texts, 'Bundled DDInter CSV bundle');
}

export async function importDdinterCsvTexts(
  texts: string[],
  sourceVersion = 'DDInter CSV bundle',
) {
  const parsedFiles = texts.map((text) => parseDdinterCsv(text));
  validateDdinterBundle(parsedFiles);
  const records = parsedFiles.flatMap((file) => file.records);
  const unique = uniqueRecords(records);
  const index = buildInteractionIndex(unique);
  const db = await openDb();
  await put(db, { key: 'records', records: unique, index });
  await put(db, {
    key: META_KEY,
    meta: {
      installed: true,
      readiness: 'installed',
      recordCount: unique.length,
      updatedAt: new Date().toISOString(),
      sourceVersion,
      license: 'DDInter terms: CC BY-NC-SA 4.0 / non-commercial',
      sourceUrl: 'https://ddinter.scbdd.com/download/',
      fileCount: parsedFiles.length,
    },
  });
  db.close();

  return unique.length;
}

export async function clearDdinterBundle() {
  const db = await openDb();
  await clear(db);
  db.close();
}

export async function findDdinterInteractions(
  medicationNames: string[],
): Promise<MedicationInteraction[]> {
  const normalizedNames = medicationNames
    .map(normalizeDrugName)
    .filter(Boolean);
  if (normalizedNames.length < 2) return [];

  const db = await openDb();
  const bundle = await get<StoredBundle>(db, 'records');
  db.close();

  return sortInteractionsBySeverity(
    matchDdinterRecords(bundle?.records ?? [], normalizedNames, bundle?.index),
  );
}

export async function findDdinterInteractionsForTerms(
  medicationTerms: string[][],
): Promise<MedicationInteraction[]> {
  const normalizedGroups = medicationTerms
    .map((terms) =>
      expandMedicationInteractionAliases(
        terms.map(normalizeDrugName).filter(Boolean),
      ),
    )
    .filter((terms) => terms.length > 0);
  if (normalizedGroups.length < 2) return [];

  const db = await openDb();
  const bundle = await get<StoredBundle>(db, 'records');
  db.close();

  return sortInteractionsBySeverity(
    matchDdinterRecordsByGroups(
      bundle?.records ?? [],
      normalizedGroups,
      bundle?.index,
    ),
  );
}

export async function findDdinterInteractionsForNormalizedMedications(
  medications: NormalizedMedication[],
): Promise<MedicationInteraction[]> {
  const normalizedGroups = medications
    .map((medication) =>
      expandMedicationInteractionAliases(
        medication.terms.map(normalizeDrugName).filter(Boolean),
      ),
    )
    .filter((terms) => terms.length > 0);
  if (normalizedGroups.length < 2) return [];

  const db = await openDb();
  const bundle = await get<StoredBundle>(db, 'records');
  db.close();

  return sortInteractionsBySeverity(
    matchDdinterRecordsByGroups(
      bundle?.records ?? [],
      normalizedGroups,
      bundle?.index,
      medications,
    ),
  );
}

export function parseDdinterCsvForTest(text: string) {
  return parseDdinterCsv(text).records;
}

export function matchDdinterRecordsForTest(
  records: StoredInteractionRecord[],
  medicationNames: string[],
) {
  return sortInteractionsBySeverity(
    matchDdinterRecords(
      records,
      expandMedicationInteractionAliases(
        medicationNames.map(normalizeDrugName).filter(Boolean),
      ),
      buildInteractionIndex(records),
    ),
  );
}

function matchDdinterRecords(
  records: StoredInteractionRecord[],
  normalizedNames: string[],
  index?: StoredInteractionIndex,
): MedicationInteraction[] {
  return matchDdinterRecordsByGroups(
    records,
    normalizedNames.map((name) => [name]),
    index,
  );
}

function matchDdinterRecordsByGroups(
  records: StoredInteractionRecord[],
  normalizedGroups: string[][],
  index?: StoredInteractionIndex,
  medications?: NormalizedMedication[],
): MedicationInteraction[] {
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const candidateIds = new Set<string>();

  if (index) {
    normalizedGroups.flat().forEach((term) => {
      index[term]?.forEach((recordId) => candidateIds.add(recordId));
    });
  }

  const candidates =
    index && candidateIds.size > 0
      ? Array.from(candidateIds)
          .map((id) => recordsById.get(id))
          .filter((record): record is StoredInteractionRecord =>
            Boolean(record),
          )
      : records;

  const exactMatches = matchCandidateRecords({
    allowContains: false,
    candidates,
    medications,
    normalizedGroups,
  });

  if (exactMatches.length > 0) return exactMatches;

  return matchCandidateRecords({
    allowContains: true,
    candidates: records,
    medications,
    normalizedGroups,
  });
}

function matchCandidateRecords({
  allowContains,
  candidates,
  medications,
  normalizedGroups,
}: {
  allowContains: boolean;
  candidates: StoredInteractionRecord[];
  medications?: NormalizedMedication[];
  normalizedGroups: string[][];
}): MedicationInteraction[] {
  return candidates.flatMap((record) => {
    const matchingAGroupIndex = normalizedGroups.findIndex((terms) =>
      terms.some((name) => namesMatch(name, record.normalizedA, allowContains)),
    );
    const matchingBGroupIndex = normalizedGroups.findIndex((terms) =>
      terms.some((name) => namesMatch(name, record.normalizedB, allowContains)),
    );

    if (
      matchingAGroupIndex === -1 ||
      matchingBGroupIndex === -1 ||
      matchingAGroupIndex === matchingBGroupIndex
    ) {
      return [];
    }

    return {
      id: record.id,
      source: 'DDInter',
      severity: record.severity,
      drugs: [record.drugA, record.drugB] as [string, string],
      description: record.description,
      management: record.management,
      provenance: {
        ddinterIds: [record.ddinterIdA, record.ddinterIdB],
        matchedAliases: [
          normalizedGroups[matchingAGroupIndex][0],
          normalizedGroups[matchingBGroupIndex][0],
        ],
        matchedInputNames: [
          medications?.[matchingAGroupIndex]?.sourceName || '',
          medications?.[matchingBGroupIndex]?.sourceName || '',
        ],
        matchedRxcuis: [
          medications?.[matchingAGroupIndex]?.rxcui,
          medications?.[matchingBGroupIndex]?.rxcui,
        ],
        matchStrategy: medications ? 'rxnorm_expansion' : 'normalized_alias',
      },
    };
  });
}

function parseDdinterCsv(text: string): ParsedCsv {
  const rows = parseCsv(text);
  const [header, ...dataRows] = rows;
  if (!header || dataRows.length === 0) {
    return { records: [], valid: false };
  }

  const columns = header.map((value) => normalizeHeader(value));
  const ddinterIdAIndex = findColumn(columns, ['ddinterid_a', 'ddinter_id_a']);
  const ddinterIdBIndex = findColumn(columns, ['ddinterid_b', 'ddinter_id_b']);
  const drugAIndex = findColumn(columns, [
    'drug_a',
    'drug1',
    'drug_1',
    'object_drug_name',
  ]);
  const drugBIndex = findColumn(columns, [
    'drug_b',
    'drug2',
    'drug_2',
    'precipitant_drug_name',
  ]);
  const severityIndex = findColumn(columns, [
    'level',
    'severity',
    'risk_level',
    'interaction_level',
  ]);
  const descriptionIndex = findColumn(columns, [
    'description',
    'mechanism',
    'interaction',
  ]);
  const managementIndex = findColumn(columns, [
    'management',
    'management_strategy',
    'recommendation',
    'alternative',
  ]);

  if (drugAIndex === -1 || drugBIndex === -1) {
    return { records: [], valid: false };
  }

  const records = dataRows.reduce<StoredInteractionRecord[]>((acc, row) => {
    const ddinterIdA = row[ddinterIdAIndex]?.trim() || undefined;
    const ddinterIdB = row[ddinterIdBIndex]?.trim() || undefined;
    const drugA = row[drugAIndex]?.trim();
    const drugB = row[drugBIndex]?.trim();
    if (!drugA || !drugB) return acc;
    const severity = normalizeSeverity(row[severityIndex]);

    acc.push({
      id: stableInteractionId({
        ddinterIdA,
        ddinterIdB,
        drugA,
        drugB,
        severity,
      }),
      ddinterIdA,
      ddinterIdB,
      drugA,
      drugB,
      normalizedA: normalizeDrugName(drugA),
      normalizedB: normalizeDrugName(drugB),
      severity,
      description: row[descriptionIndex]?.trim() || undefined,
      management: row[managementIndex]?.trim() || undefined,
    });

    return acc;
  }, []);

  return { records, valid: true };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
}

function findColumn(columns: string[], candidates: string[]) {
  return columns.findIndex((column) =>
    candidates.some(
      (candidate) => column === candidate || column.includes(candidate),
    ),
  );
}

function normalizeDrugName(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(
      /\b(tablet|capsule|oral|injection|solution|suspension|mg|mcg|ml)\b/g,
      ' ',
    )
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function namesMatch(input: string, stored: string, allowContains = false) {
  return (
    input === stored ||
    (allowContains && (input.includes(stored) || stored.includes(input)))
  );
}

function normalizeSeverity(value?: string): MedicationInteractionSeverity {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('contraindicat')) return 'contraindicated';
  if (normalized.includes('major')) return 'major';
  if (normalized.includes('moderate')) return 'moderate';
  if (normalized.includes('minor')) return 'minor';
  return 'unknown';
}

function withReadiness(
  meta: MedicationInteractionBundleStatus,
): MedicationInteractionBundleStatus {
  const updatedAtMs = meta.updatedAt ? Date.parse(meta.updatedAt) : 0;
  const isStale = !updatedAtMs || Date.now() - updatedAtMs > STALE_AFTER_MS;

  return {
    ...meta,
    readiness: isStale ? 'stale' : 'installed',
    message: isStale
      ? 'DDInter bundle is installed but may be stale.'
      : 'DDInter bundle is installed.',
  };
}

function uniqueRecords(records: StoredInteractionRecord[]) {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = [
      record.normalizedA,
      record.normalizedB,
      record.severity,
      record.description,
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validateDdinterBundle(parsedFiles: ParsedCsv[]) {
  if (parsedFiles.length !== DDINTER_CSV_URLS.length) {
    throw new Error(
      `Expected ${DDINTER_CSV_URLS.length} DDInter CSV files, received ${parsedFiles.length}.`,
    );
  }

  const invalidFiles = parsedFiles.filter((file) => !file.valid);
  if (invalidFiles.length > 0) {
    throw new Error(
      'One or more DDInter CSV files is missing required columns.',
    );
  }
}

function buildInteractionIndex(records: StoredInteractionRecord[]) {
  const index: StoredInteractionIndex = {};

  records.forEach((record) => {
    addToIndex(index, record.normalizedA, record.id);
    addToIndex(index, record.normalizedB, record.id);
  });

  return index;
}

function addToIndex(
  index: StoredInteractionIndex,
  normalizedName: string,
  recordId: string,
) {
  if (!normalizedName) return;
  index[normalizedName] ??= [];
  index[normalizedName].push(recordId);
}

function stableInteractionId({
  ddinterIdA,
  ddinterIdB,
  drugA,
  drugB,
  severity,
}: {
  ddinterIdA?: string;
  ddinterIdB?: string;
  drugA: string;
  drugB: string;
  severity: MedicationInteractionSeverity;
}) {
  return [
    ddinterIdA || normalizeDrugName(drugA),
    ddinterIdB || normalizeDrugName(drugB),
    severity,
  ].join(':');
}

function severityRank(severity: MedicationInteractionSeverity) {
  const rank: Record<MedicationInteractionSeverity, number> = {
    contraindicated: 0,
    major: 1,
    moderate: 2,
    minor: 3,
    unknown: 4,
  };

  return rank[severity];
}

function sortInteractionsBySeverity(interactions: MedicationInteraction[]) {
  return [...interactions].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  );
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function get<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

function put(db: IDBDatabase, value: StoredBundle): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, 'readwrite')
      .objectStore(STORE_NAME)
      .put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clear(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, 'readwrite')
      .objectStore(STORE_NAME)
      .clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
