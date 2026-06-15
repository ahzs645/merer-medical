import { useOutletContext } from 'react-router-dom';

import { useOptometryData } from './useOptometryData';

export type OptometryContextValue = ReturnType<typeof useOptometryData>;

/**
 * Access the optometry data resolved once by `OptometryLayout` and shared with
 * every routed sub-page through the router outlet context.
 */
export function useOptometryContext(): OptometryContextValue {
  return useOutletContext<OptometryContextValue>();
}
