import type { MedicationViewItem } from '../medicationViewModel';
import { normalizeMedicationsWithRxNorm } from './rxnormNormalizer';
import type { CachedRxNormLookup } from './rxnormCacheStore';
import { rxNormNameCacheKey, rxNormRxcuiCacheKey } from './rxnormCacheStore';

function medication(
  overrides: Partial<MedicationViewItem>,
): MedicationViewItem {
  return {
    codes: [],
    group: 'current',
    name: 'Warfarin 5 mg oral tablet',
    nutritionFacts: [],
    rxNorm: undefined,
    ...overrides,
  } as MedicationViewItem;
}

function createMemoryCache(initial: CachedRxNormLookup[] = []) {
  const values = new Map(initial.map((value) => [value.key, value]));
  return {
    get: jest.fn((key: string) => Promise.resolve(values.get(key))),
    put: jest.fn((lookup: CachedRxNormLookup) => {
      values.set(lookup.key, lookup);
      return Promise.resolve();
    }),
    values,
  };
}

describe('RxNorm medication normalizer', () => {
  it('uses cached lookups without calling RxNav', async () => {
    const cache = createMemoryCache([
      {
        key: rxNormNameCacheKey('Warfarin 5 mg oral tablet'),
        input: 'Warfarin 5 mg oral tablet',
        rxcui: '11289',
        canonicalName: 'warfarin',
        synonyms: ['Warfarin'],
        ingredients: ['warfarin'],
        brands: [],
        relatedTerms: [],
        fetchedAt: new Date().toISOString(),
        source: 'RxNav',
        status: 'resolved',
      },
    ]);
    const fetchJson = jest.fn();

    const [result] = await normalizeMedicationsWithRxNorm([medication({})], {
      cache,
      fetchJson,
    });

    expect(fetchJson).not.toHaveBeenCalled();
    expect(result.rxcui).toBe('11289');
    expect(result.terms).toEqual(
      expect.arrayContaining(['Warfarin 5 mg oral tablet', 'warfarin']),
    );
    expect(result.provenance).toMatchObject({
      cacheHit: true,
      strategy: 'cache',
    });
  });

  it('calls RxNav on cache miss and persists name and RxCUI cache entries', async () => {
    const cache = createMemoryCache();
    const fetchJson = jest.fn((url: string) => {
      if (url.includes('/rxcui.json')) {
        return Promise.resolve({ idGroup: { rxnormId: ['11289'] } });
      }
      if (url.includes('/properties.json')) {
        return Promise.resolve({
          properties: {
            rxcui: '11289',
            name: 'warfarin',
            synonym: 'Warfarin',
          },
        });
      }
      if (url.includes('/related.json')) {
        return Promise.resolve({
          relatedGroup: {
            conceptGroup: [
              {
                tty: 'IN',
                conceptProperties: [{ name: 'warfarin' }],
              },
              {
                tty: 'BN',
                conceptProperties: [{ name: 'Coumadin' }],
              },
            ],
          },
        });
      }
      return Promise.resolve({});
    });

    const [result] = await normalizeMedicationsWithRxNorm([medication({})], {
      cache,
      fetchJson,
      now: () => new Date('2026-05-31T00:00:00.000Z'),
    });

    expect(result).toMatchObject({
      rxcui: '11289',
      canonicalName: 'warfarin',
      provenance: { cacheHit: false, strategy: 'rxnav-name' },
    });
    expect(result.terms).toEqual(
      expect.arrayContaining(['warfarin', 'Coumadin']),
    );
    expect(cache.put).toHaveBeenCalledWith(
      expect.objectContaining({
        key: rxNormNameCacheKey('Warfarin 5 mg oral tablet'),
        rxcui: '11289',
        status: 'resolved',
      }),
    );
    expect(cache.put).toHaveBeenCalledWith(
      expect.objectContaining({
        key: rxNormRxcuiCacheKey('11289'),
      }),
    );
  });

  it('falls back to local terms when RxNav fails', async () => {
    const cache = createMemoryCache();
    const fetchJson = jest.fn(() => Promise.reject(new Error('offline')));

    const [result] = await normalizeMedicationsWithRxNorm(
      [medication({ name: 'Unknown local med' })],
      { cache, fetchJson },
    );

    expect(result).toMatchObject({
      sourceName: 'Unknown local med',
      provenance: { cacheHit: false, strategy: 'local-only' },
    });
    expect(result.terms).toEqual(expect.arrayContaining(['Unknown local med']));
    expect(cache.put).toHaveBeenCalledWith(
      expect.objectContaining({
        key: rxNormNameCacheKey('Unknown local med'),
        status: 'error',
      }),
    );
  });

  it('uses stale cached entries offline and marks them stale', async () => {
    const cache = createMemoryCache([
      {
        key: rxNormNameCacheKey('aspirin'),
        input: 'aspirin',
        rxcui: '1191',
        canonicalName: 'aspirin',
        synonyms: [],
        ingredients: ['aspirin'],
        brands: [],
        relatedTerms: [],
        fetchedAt: '2020-01-01T00:00:00.000Z',
        source: 'RxNav',
        status: 'resolved',
      },
    ]);
    const fetchJson = jest.fn();

    const [result] = await normalizeMedicationsWithRxNorm(
      [medication({ name: 'aspirin' })],
      { cache, fetchJson },
    );

    expect(fetchJson).not.toHaveBeenCalled();
    expect(result.provenance).toMatchObject({
      cacheHit: true,
      cacheStale: true,
    });
  });

  it('refreshes stale cached entries when requested', async () => {
    const cache = createMemoryCache([
      {
        key: rxNormNameCacheKey('aspirin'),
        input: 'aspirin',
        rxcui: '1191',
        canonicalName: 'aspirin',
        synonyms: [],
        ingredients: ['aspirin'],
        brands: [],
        relatedTerms: [],
        fetchedAt: '2020-01-01T00:00:00.000Z',
        source: 'RxNav',
        status: 'resolved',
      },
    ]);
    const fetchJson = jest.fn((url: string) => {
      if (url.includes('/rxcui.json')) {
        return Promise.resolve({ idGroup: { rxnormId: ['1191'] } });
      }
      if (url.includes('/properties.json')) {
        return Promise.resolve({
          properties: { rxcui: '1191', name: 'aspirin' },
        });
      }
      return Promise.resolve({ relatedGroup: { conceptGroup: [] } });
    });

    await normalizeMedicationsWithRxNorm([medication({ name: 'aspirin' })], {
      cache,
      fetchJson,
      forceRefreshStale: true,
    });

    expect(fetchJson).toHaveBeenCalled();
  });
});
