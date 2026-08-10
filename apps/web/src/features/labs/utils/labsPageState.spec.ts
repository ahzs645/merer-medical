import {
  initialLabsView,
  LABS_ADDED_PARAM,
  labsPathAfterAdd,
} from './labsPageState';

describe('initialLabsView', () => {
  it('opens an ordinary visit on Attention with the search you left behind', () => {
    expect(initialLabsView('', 'ferritin')).toEqual({
      filterMode: 'attention',
      query: 'ferritin',
    });
    expect(initialLabsView('?highlight=abc', '')).toEqual({
      filterMode: 'attention',
      query: '',
    });
  });

  it('opens on the full list after adding a lab from this page', () => {
    // A normal ferritin is not high, low or borderline, so Attention showed
    // everything except the row the user had just typed.
    expect(
      initialLabsView(labsPathAfterAdd().split('?')[1], 'vitamin d'),
    ).toEqual({ filterMode: 'all', query: '' });
  });

  it('sends the manual form back here carrying the marker', () => {
    const path = labsPathAfterAdd();

    expect(path.startsWith('/records/labs?')).toBe(true);
    expect(new URLSearchParams(path.split('?')[1]).has(LABS_ADDED_PARAM)).toBe(
      true,
    );
  });
});
