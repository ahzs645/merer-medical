import { incrementalSearchParams } from './incrementalSync';

describe('incrementalSearchParams', () => {
  it('returns no params on the first sync (no last_refreshed)', () => {
    expect(incrementalSearchParams({})).toEqual({});
  });

  it('returns no params when the previous sync errored', () => {
    expect(
      incrementalSearchParams({
        last_refreshed: '2024-01-10T00:00:00.000Z',
        last_sync_was_error: true,
      }),
    ).toEqual({});
  });

  it('returns no params when last_refreshed is unparseable', () => {
    expect(incrementalSearchParams({ last_refreshed: 'not-a-date' })).toEqual(
      {},
    );
  });

  it('returns a _lastUpdated filter with a one-day overlap', () => {
    const result = incrementalSearchParams({
      last_refreshed: '2024-01-10T12:00:00.000Z',
    });
    expect(result).toEqual({ _lastUpdated: 'gt2024-01-09T12:00:00.000Z' });
  });
});
