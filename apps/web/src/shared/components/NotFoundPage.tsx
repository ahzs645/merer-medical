import { Link, useLocation } from 'react-router-dom';
import { MapIcon } from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from './AppPage';
import { GenericBanner } from './GenericBanner';

/**
 * Shown for any path the router does not recognise. This used to redirect
 * silently to the timeline, which left anyone following a stale bookmark or a
 * renamed link on a page they did not ask for with no way to tell what had
 * happened.
 */
export function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <AppPage banner={<GenericBanner text="Page not found" />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-8 pb-24 sm:px-6">
          <div className="rounded-md bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <span className="bg-primary-50 text-primary-700 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <MapIcon className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-semibold text-gray-900">
              There is nothing at this address
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              We could not find a page for{' '}
              <code className="break-all rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-800">
                {pathname}
              </code>
              . The link may be out of date, or the page may have moved. Your
              records are untouched.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to={AppRoutes.Records}
                className="bg-primary hover:bg-primary-700 inline-flex min-h-[44px] items-center rounded-md px-4 text-sm font-semibold text-white shadow-sm"
              >
                Browse records
              </Link>
              <Link
                to={AppRoutes.Timeline}
                className="inline-flex min-h-[44px] items-center rounded-md px-4 text-sm font-semibold text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                Go to timeline
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppPage>
  );
}
