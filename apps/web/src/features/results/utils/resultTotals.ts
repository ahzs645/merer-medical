import { ResultGroup } from '../types';

export interface ResultTotals {
  /** Every result the page lists. */
  total: number;
  labs: number;
  /** Everything that isn't a lab, so the two always account for the total. */
  everythingElse: number;
  attention: number;
}

/**
 * The figures behind the four tiles.
 *
 * The two middle tiles used to be independent filters — labs, and then
 * `imaging | diagnostic-report | document` — over a union that also holds
 * `procedure` and `other`. On the demo library that read **222 total, 180 labs,
 * 31 imaging & reports**: eleven records inside the total and inside neither
 * labelled bucket, with nothing on screen naming them.
 *
 * Defining the second bucket as the complement of the first is what makes the
 * row add up by construction rather than by whoever last edited the filter
 * remembering every member of the union. `resultTotals` is the only place these
 * are computed, and `labs + everythingElse === total` is asserted in its spec.
 */
export function resultTotals(groups: ResultGroup[]): ResultTotals {
  const results = groups.flatMap((group) => group.results);
  const labs = results.filter((result) => result.type === 'lab').length;
  return {
    total: results.length,
    labs,
    everythingElse: results.length - labs,
    attention: results.filter((result) => result.abnormal).length,
  };
}
