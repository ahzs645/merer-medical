import { Link } from 'react-router-dom';

import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
import { UTILITY_TOOLS } from './utilityTools';

/**
 * Utilities landing page. Previously /utilities silently redirected to Visit
 * prep, so the other seven tools existed only inside the tab strip — which is
 * collapsed to a menu on phones. This grid gives every tool a named, described
 * entry point, mirroring the Records hub.
 */
export function UtilitiesHub() {
  return (
    <AppPage banner={<GenericBanner text="Utilities" />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto w-full max-w-4xl px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <p className="mb-4 text-sm text-gray-600">
            Tools that work on top of your records — prepare for a visit, check
            what care is due, and export or share what you hold.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {UTILITY_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.to}
                  to={tool.to}
                  className="hover:ring-primary-300 hover:bg-primary-50 flex items-start gap-3 rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
                >
                  <span className="bg-primary-50 text-primary-700 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">
                      {tool.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-600">
                      {tool.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppPage>
  );
}
