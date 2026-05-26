import { createDexieDataClient } from '@mere/local-dexie';
import {
  TerminologyDomain,
  TerminologyEntry as DomainTerminologyEntry,
  TerminologyLanguage,
  TerminologyLookupMode,
  TerminologyPack,
  TerminologyProfile,
} from '@mere/domain';

import { canadaStarterEntries, canadaStarterPack } from './starterPack';
import {
  DEFAULT_TERMINOLOGY_LANGUAGE,
  DEFAULT_TERMINOLOGY_LOOKUP_MODE,
  DEFAULT_TERMINOLOGY_PROFILE,
  DEFAULT_TERMINOLOGY_REMOTE_ENABLED,
  TerminologySettings,
} from './terminologySettings';

let starterPackPromise: Promise<void> | null = null;

function client() {
  return createDexieDataClient({ dbName: 'mere' });
}

export async function ensureStarterTerminologyPack(): Promise<void> {
  if (starterPackPromise) return starterPackPromise;
  starterPackPromise = (async () => {
    const dataClient = client();
    const packs = await dataClient.terminology.listPacks('canada');
    const hasStarter = packs.some((pack) => pack.id === canadaStarterPack.id);
    if (!hasStarter) {
      await dataClient.terminology.upsertPack({
        pack: canadaStarterPack,
        entries: canadaStarterEntries,
      });
    }
  })();
  return starterPackPromise;
}

export type SearchTerminologyOptions = Partial<TerminologySettings> & {
  domain: TerminologyDomain;
  query: string;
  limit?: number;
};

export async function searchTerminologyEntries({
  profile = DEFAULT_TERMINOLOGY_PROFILE,
  domain,
  query,
  language = DEFAULT_TERMINOLOGY_LANGUAGE,
  lookupMode = DEFAULT_TERMINOLOGY_LOOKUP_MODE,
  remoteEnabled = DEFAULT_TERMINOLOGY_REMOTE_ENABLED,
  limit = 8,
}: SearchTerminologyOptions): Promise<DomainTerminologyEntry[]> {
  await ensureStarterTerminologyPack();
  const dataClient = client();
  const local =
    lookupMode === 'server-first'
      ? []
      : await dataClient.terminology.search({
          profile,
          domain,
          query,
          language,
          lookupMode,
          remoteEnabled,
          limit,
        });
  if (
    local.length >= Math.min(3, limit) ||
    lookupMode === 'local-only' ||
    !remoteEnabled
  ) {
    return local.slice(0, limit);
  }

  // Remote terminology connectors are intentionally opt-in and are wired here
  // later for licensed SNOMED CT CA / ICD-10-CA / CCI servers.
  return local.slice(0, limit);
}

export async function listTerminologyPacks(
  profile?: TerminologyProfile,
): Promise<TerminologyPack[]> {
  await ensureStarterTerminologyPack();
  return client().terminology.listPacks(profile);
}

export async function importTerminologyPackJson(text: string): Promise<void> {
  const parsed = JSON.parse(text) as {
    pack: Parameters<
      ReturnType<typeof client>['terminology']['upsertPack']
    >[0]['pack'];
    entries: Parameters<
      ReturnType<typeof client>['terminology']['upsertPack']
    >[0]['entries'];
  };
  if (!parsed.pack || !Array.isArray(parsed.entries)) {
    throw new Error('Terminology pack must contain pack and entries fields.');
  }
  await client().terminology.upsertPack(parsed);
}

export function getTerminologyDisplay(
  entry: DomainTerminologyEntry,
  language: TerminologyLanguage,
): string {
  return language === 'fr' && entry.displayFr
    ? entry.displayFr
    : entry.displayEn;
}

export function getPreferredUnits(entry?: DomainTerminologyEntry): string[] {
  return entry?.units ?? [];
}

export function resolveCoding(entry?: DomainTerminologyEntry):
  | {
      system: string;
      code: string;
      display: string;
    }
  | undefined {
  if (!entry) return undefined;
  return {
    system: entry.system,
    code: entry.code,
    display: entry.displayEn,
  };
}

export type {
  DomainTerminologyEntry,
  TerminologyDomain,
  TerminologyLanguage,
  TerminologyLookupMode,
  TerminologyProfile,
};
