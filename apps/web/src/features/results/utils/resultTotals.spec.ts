import { ResultGroup, ResultSummary, ResultType } from '../types';
import { resultTotals } from './resultTotals';

function result(type: ResultType, abnormal = false): ResultSummary {
  return {
    id: `${type}-${Math.round(abnormal ? 1 : 0)}-${type}`,
    detailId: 'detail',
    title: type,
    type,
    abnormal,
  } as ResultSummary;
}

function group(results: ResultSummary[]): ResultGroup {
  return { id: 'g', title: 'g', results } as ResultGroup;
}

describe('resultTotals', () => {
  it('accounts for every result across the two labelled tiles', () => {
    // One of each member of the union, including the two the old pair of
    // filters dropped on the floor.
    const groups = [
      group([result('lab'), result('lab'), result('imaging')]),
      group([
        result('diagnostic-report'),
        result('document'),
        result('procedure'),
        result('other'),
      ]),
    ];

    const totals = resultTotals(groups);

    expect(totals.total).toBe(7);
    expect(totals.labs).toBe(2);
    expect(totals.everythingElse).toBe(5);
    expect(totals.labs + totals.everythingElse).toBe(totals.total);
  });

  it('keeps adding up when the union grows a member nobody filtered for', () => {
    const groups = [
      group([result('lab'), 'a-type-added-later' as unknown as ResultSummary]),
    ];
    const totals = resultTotals(groups);
    expect(totals.labs + totals.everythingElse).toBe(totals.total);
  });

  it('counts anything flagged, whatever type it is', () => {
    const totals = resultTotals([
      group([
        result('lab', true),
        result('imaging', true),
        result('procedure'),
      ]),
    ]);
    expect(totals.attention).toBe(2);
  });

  it('reports zeroes for an empty library rather than throwing', () => {
    expect(resultTotals([])).toEqual({
      total: 0,
      labs: 0,
      everythingElse: 0,
      attention: 0,
    });
  });
});
