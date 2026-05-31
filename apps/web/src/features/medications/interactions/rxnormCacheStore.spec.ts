import {
  isRxNormCacheStale,
  rxNormNameCacheKey,
  rxNormRxcuiCacheKey,
  type CachedRxNormLookup,
} from './rxnormCacheStore';

function lookup(
  fetchedAt: string,
  status: CachedRxNormLookup['status'] = 'resolved',
): CachedRxNormLookup {
  return {
    key: rxNormNameCacheKey('aspirin'),
    input: 'aspirin',
    synonyms: [],
    ingredients: [],
    brands: [],
    relatedTerms: [],
    fetchedAt,
    source: 'RxNav',
    status,
  };
}

describe('RxNorm cache store helpers', () => {
  beforeEach(() => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-05-31T00:00:00.000Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates stable name and RxCUI keys', () => {
    expect(rxNormNameCacheKey('Aspirin 81 mg oral tablet')).toBe(
      'rxnorm:name:aspirin 81 mg oral tablet',
    );
    expect(rxNormRxcuiCacheKey(' 1191 ')).toBe('rxnorm:rxcui:1191');
  });

  it('treats successful lookups as stale after 30 days', () => {
    expect(isRxNormCacheStale(lookup('2026-05-15T00:00:00.000Z'))).toBe(false);
    expect(isRxNormCacheStale(lookup('2026-04-01T00:00:00.000Z'))).toBe(true);
  });

  it('treats failed lookups as stale after 24 hours', () => {
    expect(
      isRxNormCacheStale(lookup('2026-05-30T12:00:00.000Z', 'error')),
    ).toBe(false);
    expect(
      isRxNormCacheStale(lookup('2026-05-29T00:00:00.000Z', 'error')),
    ).toBe(true);
  });
});
