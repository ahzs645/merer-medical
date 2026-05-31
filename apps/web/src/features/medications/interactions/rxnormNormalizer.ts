import type { MedicationViewItem } from '../medicationViewModel';
import {
  type CachedRxNormLookup,
  getCachedRxNormLookup,
  isRxNormCacheStale,
  putCachedRxNormLookup,
  rxNormNameCacheKey,
  rxNormRxcuiCacheKey,
} from './rxnormCacheStore';

const RXNAV_BASE_URL = 'https://rxnav.nlm.nih.gov/REST';

type RxNormCandidate = {
  rxcui?: string;
  name?: string;
  score?: string;
};

export type NormalizedMedication = {
  sourceName: string;
  rxcui?: string;
  canonicalName?: string;
  terms: string[];
  provenance: {
    strategy:
      | 'fhir-rxcui'
      | 'rxnav-name'
      | 'rxnav-approximate'
      | 'local-only'
      | 'cache';
    cacheHit: boolean;
    cacheStale?: boolean;
  };
};

type RxNormCacheAdapter = {
  get: (key: string) => Promise<CachedRxNormLookup | undefined>;
  put: (lookup: CachedRxNormLookup) => Promise<void>;
};

type RxNormNormalizerOptions = {
  cache?: RxNormCacheAdapter;
  fetchJson?: (url: string) => Promise<any>;
  forceRefreshStale?: boolean;
  now?: () => Date;
};

const defaultCache: RxNormCacheAdapter = {
  get: getCachedRxNormLookup,
  put: putCachedRxNormLookup,
};

export async function normalizeMedicationsWithRxNorm(
  medications: MedicationViewItem[],
  options: RxNormNormalizerOptions = {},
): Promise<NormalizedMedication[]> {
  const cache = options.cache ?? defaultCache;
  const fetchJson = options.fetchJson ?? defaultFetchJson;
  const forceRefreshStale = options.forceRefreshStale ?? false;
  const now = options.now ?? (() => new Date());

  return Promise.all(
    medications.map(async (medication) => {
      const sourceName = medication.rxNorm?.display || medication.name;
      const localTerms = getLocalMedicationTerms(medication);
      const rxcui = medication.rxNorm?.code;
      const cacheKey = rxcui
        ? rxNormRxcuiCacheKey(rxcui)
        : rxNormNameCacheKey(sourceName);
      const cached = await cache.get(cacheKey);

      if (cached && (!forceRefreshStale || !isRxNormCacheStale(cached))) {
        return normalizedMedicationFromCache(sourceName, localTerms, cached);
      }

      const lookup = await lookupRxNormTerms(sourceName, medication, fetchJson);
      const persisted = lookupToCacheEntry({
        input: sourceName,
        key: cacheKey,
        lookup,
        now,
      });
      await cache.put(persisted);

      if (lookup.rxcui && !rxcui) {
        await cache.put({
          ...persisted,
          key: rxNormRxcuiCacheKey(lookup.rxcui),
        });
      }

      return {
        sourceName,
        rxcui: lookup.rxcui || rxcui,
        canonicalName: lookup.canonicalName,
        terms: mergeTerms(localTerms, lookup.terms),
        provenance: {
          strategy:
            rxcui && lookup.status === 'resolved'
              ? 'fhir-rxcui'
              : lookup.strategy,
          cacheHit: false,
        },
      };
    }),
  );
}

async function lookupRxNormTerms(
  sourceName: string,
  medication: MedicationViewItem,
  fetchJson: (url: string) => Promise<any>,
) {
  try {
    const rxcui =
      medication.rxNorm?.code || (await findRxcuiByName(sourceName, fetchJson));
    const approximateCandidate =
      rxcui || medication.rxNorm?.code
        ? undefined
        : await getApproximateCandidate(sourceName, fetchJson);
    const resolvedRxcui = rxcui || approximateCandidate?.rxcui;
    const [properties, related] = await Promise.all([
      resolvedRxcui
        ? getRxcuiProperties(resolvedRxcui, fetchJson)
        : Promise.resolve(undefined),
      resolvedRxcui
        ? getRelatedTerms(resolvedRxcui, fetchJson)
        : Promise.resolve({
            ingredients: [],
            brands: [],
            relatedTerms: [],
          }),
    ]);

    if (!resolvedRxcui && !approximateCandidate?.name) {
      return {
        status: 'not-found' as const,
        strategy: 'local-only' as const,
        terms: [] as string[],
      };
    }

    return {
      status: 'resolved' as const,
      strategy: rxcui
        ? ('rxnav-name' as const)
        : ('rxnav-approximate' as const),
      rxcui: resolvedRxcui,
      canonicalName: properties?.canonicalName || approximateCandidate?.name,
      synonyms: properties?.synonyms ?? [],
      ingredients: related.ingredients,
      brands: related.brands,
      relatedTerms: related.relatedTerms,
      terms: [
        resolvedRxcui,
        properties?.canonicalName,
        ...(properties?.synonyms ?? []),
        approximateCandidate?.name,
        ...related.ingredients,
        ...related.brands,
        ...related.relatedTerms,
      ].filter(Boolean) as string[],
    };
  } catch {
    return {
      status: 'error' as const,
      strategy: 'local-only' as const,
      terms: [] as string[],
    };
  }
}

async function findRxcuiByName(
  name: string,
  fetchJson: (url: string) => Promise<any>,
) {
  const url = `${RXNAV_BASE_URL}/rxcui.json?name=${encodeURIComponent(name)}`;
  const json = await fetchJson(url);
  return json?.idGroup?.rxnormId?.[0] as string | undefined;
}

async function getRxcuiProperties(
  rxcui: string,
  fetchJson: (url: string) => Promise<any>,
) {
  const url = `${RXNAV_BASE_URL}/rxcui/${encodeURIComponent(
    rxcui,
  )}/properties.json`;
  const json = await fetchJson(url);
  const properties = json?.properties ?? {};
  return {
    canonicalName: properties.name as string | undefined,
    synonyms: [properties.synonym, properties.rxcui].filter(
      Boolean,
    ) as string[],
  };
}

async function getApproximateCandidate(
  name: string,
  fetchJson: (url: string) => Promise<any>,
) {
  const url = `${RXNAV_BASE_URL}/approximateTerm.json?term=${encodeURIComponent(
    name,
  )}&maxEntries=3`;
  const json = await fetchJson(url);
  const candidates: RxNormCandidate[] = json?.approximateGroup?.candidate ?? [];
  return candidates[0];
}

async function getRelatedTerms(
  rxcui: string,
  fetchJson: (url: string) => Promise<any>,
) {
  const url = `${RXNAV_BASE_URL}/rxcui/${encodeURIComponent(
    rxcui,
  )}/related.json?tty=IN+MIN+PIN+BN+SCD+SBD`;
  const json = await fetchJson(url);
  const groups = json?.relatedGroup?.conceptGroup ?? [];
  const ingredients: string[] = [];
  const brands: string[] = [];
  const relatedTerms: string[] = [];

  groups.forEach((group: any) => {
    const tty = group.tty;
    const concepts = group.conceptProperties ?? [];
    concepts.forEach((concept: any) => {
      if (!concept.name) return;
      if (['IN', 'MIN', 'PIN'].includes(tty)) {
        ingredients.push(concept.name);
      } else if (tty === 'BN') {
        brands.push(concept.name);
      } else {
        relatedTerms.push(concept.name);
      }
    });
  });

  return {
    ingredients,
    brands,
    relatedTerms,
  };
}

function getLocalMedicationTerms(medication: MedicationViewItem) {
  return [
    medication.name,
    medication.rxNorm?.display,
    medication.rxNorm?.code,
    medication.codes.find((code) => code.display)?.display,
  ]
    .filter(Boolean)
    .map((value) => String(value));
}

function normalizedMedicationFromCache(
  sourceName: string,
  localTerms: string[],
  cached: CachedRxNormLookup,
): NormalizedMedication {
  return {
    sourceName,
    rxcui: cached.rxcui,
    canonicalName: cached.canonicalName,
    terms: mergeTerms(localTerms, [
      cached.rxcui,
      cached.canonicalName,
      ...cached.synonyms,
      ...cached.ingredients,
      ...cached.brands,
      ...cached.relatedTerms,
    ]),
    provenance: {
      strategy: 'cache',
      cacheHit: true,
      cacheStale: isRxNormCacheStale(cached),
    },
  };
}

function lookupToCacheEntry({
  input,
  key,
  lookup,
  now,
}: {
  input: string;
  key: string;
  lookup: Awaited<ReturnType<typeof lookupRxNormTerms>>;
  now: () => Date;
}): CachedRxNormLookup {
  return {
    key,
    input,
    rxcui: lookup.rxcui,
    canonicalName: lookup.canonicalName,
    synonyms: lookup.synonyms ?? [],
    ingredients: lookup.ingredients ?? [],
    brands: lookup.brands ?? [],
    relatedTerms: lookup.relatedTerms ?? lookup.terms ?? [],
    fetchedAt: now().toISOString(),
    source: 'RxNav',
    status: lookup.status,
  };
}

function mergeTerms(...groups: Array<Array<string | undefined>>) {
  const seen = new Set<string>();
  return groups
    .flat()
    .filter((term): term is string => Boolean(term))
    .filter((term) => {
      const key = term.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function defaultFetchJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`RxNav request failed: ${response.status}`);
  return response.json();
}

function isLikelyRxcui(value: string) {
  return /^\d+$/.test(value);
}
