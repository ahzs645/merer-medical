import { Routes as AppRoutes } from '../../Routes';
import {
  buildAddRecordPath,
  formExitTarget,
  safeReturnTo,
} from './addRecordPath';

describe('formExitTarget', () => {
  it('goes to the page that asked to be returned to', () => {
    expect(formExitTarget(AppRoutes.Medications, 'abc123')).toBe(
      AppRoutes.Medications,
    );
    expect(formExitTarget(AppRoutes.Medications, 'default')).toBe(
      AppRoutes.Medications,
    );
  });

  /**
   * "Add medication" from Medications, then Cancel, used to land on the
   * Timeline. Without a `returnTo`, the page that opened the form is the one
   * behind it in history.
   */
  it('steps back to the previous page when no return path was given', () => {
    expect(formExitTarget(null, 'abc123')).toBe(-1);
  });

  it('falls back to the timeline only when the form was the first page', () => {
    expect(formExitTarget(null, 'default')).toBe(AppRoutes.Timeline);
  });
});

describe('safeReturnTo', () => {
  it('keeps in-app paths and drops anything that could leave the app', () => {
    expect(safeReturnTo('/records/medications')).toBe('/records/medications');
    expect(safeReturnTo('//evil.example')).toBeNull();
    expect(safeReturnTo('https://evil.example')).toBeNull();
    expect(safeReturnTo(null)).toBeNull();
  });
});

describe('buildAddRecordPath', () => {
  it('carries the return path so Save and Cancel come back to the page', () => {
    const path = buildAddRecordPath({
      type: 'medicationstatement',
      returnTo: AppRoutes.Medications,
    });
    const params = new URLSearchParams(path.split('?')[1]);
    expect(path.startsWith(AppRoutes.AddRecord)).toBe(true);
    expect(params.get('type')).toBe('medicationstatement');
    expect(params.get('returnTo')).toBe(AppRoutes.Medications);
  });
});
