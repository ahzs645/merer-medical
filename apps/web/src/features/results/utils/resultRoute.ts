import { Routes } from '../../../Routes';

export const RESULT_SELECTION_PARAM = 'result';

/** Address a specific result so Summary, reload and Back preserve selection. */
export function resultDetailPath(detailId: string): string {
  return `${Routes.Results}?${RESULT_SELECTION_PARAM}=${encodeURIComponent(detailId)}`;
}
