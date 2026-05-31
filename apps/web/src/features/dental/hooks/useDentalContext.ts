import { useOutletContext } from 'react-router-dom';

import { useDentalData } from './useDentalData';

export type DentalContextValue = ReturnType<typeof useDentalData>;

/**
 * Access the dental data resolved once by `DentalLayout` and shared with every
 * routed sub-page through the router outlet context.
 */
export function useDentalContext(): DentalContextValue {
  return useOutletContext<DentalContextValue>();
}
