import { Navigate, useParams, type RouteObject } from 'react-router-dom';

import { NotFoundPage } from '../shared/components/NotFoundPage';
import { Routes as AppRoutes } from '../Routes';

/**
 * The routes that belong to the shell rather than to a page: where the root
 * goes, where retired addresses go, and what an unknown address shows.
 *
 * They live apart from `App.tsx` so they can be rendered in a test without
 * booting the database and every provider — which is how the root came to be a
 * 404 unnoticed. When the catch-all stopped redirecting to the timeline, it had
 * also been the only route matching `/`, so `/demo`, the end of the tutorial,
 * a returning user at `/` and the installed app's `start_url` all opened on
 * "Page not found".
 */

/** `/` has no page of its own; the timeline is the landing page. */
export const rootRedirectRoute: RouteObject = {
  index: true,
  element: <Navigate to={AppRoutes.Timeline} replace />,
};

function LegacyLabDetailRedirect() {
  const { labKey } = useParams();
  return (
    <Navigate
      to={`${AppRoutes.Labs}/${encodeURIComponent(labKey || '')}`}
      replace
    />
  );
}

/** Addresses that moved, kept resolving so bookmarks survive. */
export const legacyRedirectRoutes: RouteObject[] = [
  { path: '/labs', element: <Navigate to={AppRoutes.Labs} replace /> },
  { path: '/labs/:labKey', element: <LegacyLabDetailRedirect /> },
  {
    path: '/records/visit-prep',
    element: <Navigate to={AppRoutes.VisitPrep} replace />,
  },
  {
    path: '/records/sharing',
    element: <Navigate to={AppRoutes.Sharing} replace />,
  },
  {
    path: '/records/audit-log',
    element: <Navigate to={AppRoutes.AuditLog} replace />,
  },
  { path: '/imaging', element: <Navigate to={AppRoutes.Imaging} replace /> },
  { path: '/dental', element: <Navigate to={AppRoutes.Dental} replace /> },
  {
    path: '/optometry',
    element: <Navigate to={AppRoutes.Optometry} replace />,
  },
];

/** Anything else. Declared last. */
export const notFoundRoute: RouteObject = {
  path: '*',
  element: <NotFoundPage />,
};
