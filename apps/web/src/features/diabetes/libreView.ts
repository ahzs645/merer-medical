import { BundleEntry, Observation } from 'fhir/r2';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import uuid4 from '../../shared/utils/UUIDUtils';

export const LIBRE_CONNECTION_LOCATION = 'freestyle-libre://local';
export const GLUCOSE_LOINC_CODE = '2339-0';
export const GLUCOSE_DISPLAY = 'Interstitial glucose';

export type LibreReading = {
  timestamp?: number;
  datetime: string;
  glucose_mgdl: number;
  isTimeChange?: boolean;
};

export type LibreImport = {
  patient?: string;
  device?: string;
  deviceType?: string | number;
  deviceSerial?: string;
  exportDate?: string;
  unit: 'mg/dL';
  readings: LibreReading[];
  reports?: Record<string, unknown>;
};

type RawLibreReading = {
  timestamp?: number | string;
  datetime?: string;
  value_mgdl?: number | string;
  glucose_mgdl?: number | string;
  isTimeChange?: boolean | string;
};

export function parseLibreViewFile(
  text: string,
  fileName: string,
): LibreImport {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('The selected LibreView file is empty.');
  }

  if (fileName.toLowerCase().endsWith('.csv')) {
    return parseLibreCsv(trimmed);
  }

  return parseLibreJson(trimmed);
}

export function buildLibreClinicalDocument(args: {
  userId: string;
  connectionId: string;
  reading: LibreReading;
  importMeta: LibreImport;
}): ClinicalDocument<BundleEntry<Observation>> {
  const sourceId = `libre|${args.reading.datetime}`;
  const value = args.reading.glucose_mgdl;

  return {
    id: `${args.connectionId}|${args.userId}|${sourceId}`,
    connection_record_id: args.connectionId,
    user_id: args.userId,
    data_record: {
      format: 'FHIR.DSTU2',
      content_type: 'application/fhir+json',
      resource_type: 'observation',
      version_history: [],
      raw: {
        resource: {
          resourceType: 'Observation',
          id: sourceId,
          status: 'final',
          category: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'laboratory',
                display: 'Laboratory',
              },
            ],
            text: 'Continuous glucose monitoring',
          },
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: GLUCOSE_LOINC_CODE,
                display: GLUCOSE_DISPLAY,
              },
            ],
            text: GLUCOSE_DISPLAY,
          },
          effectiveDateTime: args.reading.datetime,
          issued: args.reading.datetime,
          valueQuantity: {
            value,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL',
          },
          referenceRange: [
            {
              low: { value: 70, unit: 'mg/dL' },
              high: { value: 180, unit: 'mg/dL' },
              text: 'Target range 70-180 mg/dL',
            },
          ],
          device: {
            display: args.importMeta.device || 'FreeStyle Libre',
          },
        },
      },
    },
    metadata: {
      id: sourceId,
      date: args.reading.datetime,
      display_name: GLUCOSE_DISPLAY,
      loinc_coding: [GLUCOSE_LOINC_CODE],
    },
  };
}

export function normalizeLibreReading(reading: RawLibreReading): LibreReading {
  const datetime = reading.datetime;
  const value = reading.glucose_mgdl ?? reading.value_mgdl;
  const glucose = typeof value === 'string' ? Number(value) : value;

  if (!datetime || !Number.isFinite(glucose)) {
    throw new Error('LibreView reading is missing datetime or glucose_mgdl.');
  }

  return {
    timestamp:
      typeof reading.timestamp === 'string'
        ? Number(reading.timestamp)
        : reading.timestamp,
    datetime,
    glucose_mgdl: glucose as number,
    isTimeChange:
      typeof reading.isTimeChange === 'string'
        ? reading.isTimeChange.toLowerCase() === 'true'
        : reading.isTimeChange,
  };
}

function parseLibreJson(text: string): LibreImport {
  const data = JSON.parse(text);
  const reports = data.reports as Record<string, unknown> | undefined;
  const exportMeta = data.exportMeta || {};
  const simpleReadings = data.readings;
  const dailyLog = reports?.['Daily_Log'] as
    | { cgmReadings?: RawLibreReading[] }
    | undefined;
  const weeklySummary = reports?.['Weekly_Summary'] as
    | { cgmReadings?: RawLibreReading[] }
    | undefined;
  const readings =
    simpleReadings ||
    dailyLog?.cgmReadings ||
    weeklySummary?.cgmReadings ||
    [];

  if (!Array.isArray(readings) || readings.length === 0) {
    throw new Error('No LibreView CGM readings were found in this JSON file.');
  }

  const dailyPatterns = reports?.['Daily_Patterns'] as
    | { deviceSerial?: string }
    | undefined;
  const insights = reports?.['Glucose_Pattern_Insights'] as
    | { deviceSerial?: string }
    | undefined;

  return {
    patient: data.patient || exportMeta.patient,
    device: data.device || exportMeta.device || 'FreeStyle Libre',
    deviceType: data.deviceType || exportMeta.deviceType,
    deviceSerial:
      data.deviceSN || dailyPatterns?.deviceSerial || insights?.deviceSerial,
    exportDate: data.exportDate || exportMeta.exportedAt,
    unit: 'mg/dL',
    readings: readings.map(normalizeLibreReading),
    reports,
  };
}

function parseLibreCsv(text: string): LibreImport {
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(headerLine);
  const readings = lines.map((line) => {
    const columns = splitCsvLine(line);
    const row = Object.fromEntries(
      headers.map((header, index) => [header, columns[index]]),
    ) as RawLibreReading;

    return normalizeLibreReading(row);
  });

  return {
    device: 'FreeStyle Libre',
    unit: 'mg/dL',
    readings,
  };
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

export function buildLibreConnection(args: {
  userId: string;
  existingId?: string;
  importMeta?: LibreImport;
}) {
  const nowIso = new Date().toISOString();

  return {
    id: args.existingId || uuid4(),
    user_id: args.userId,
    access_token: 'local-libre-import',
    expires_at: Date.now() + 1000 * 60 * 60 * 24 * 365 * 20,
    source: 'freestyle_libre' as const,
    name: args.importMeta?.device || 'FreeStyle Libre',
    location: LIBRE_CONNECTION_LOCATION,
    last_refreshed: nowIso,
    last_sync_attempt: nowIso,
    last_sync_was_error: false,
    patient: args.importMeta?.patient,
  };
}
