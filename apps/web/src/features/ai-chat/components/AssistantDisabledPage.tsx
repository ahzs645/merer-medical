import { Link } from 'react-router-dom';
import { SparklesIcon } from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../../Routes';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { AppPage } from '../../../shared/components/AppPage';
import { GenericBanner } from '../../../shared/components/GenericBanner';

/**
 * Shown at `/assistant` when the assistant is switched off.
 *
 * The route used to `<Navigate>` to Settings instead, which dropped anyone
 * following a bookmark or a shared link onto a page they had not asked for,
 * scrolled to the top of a long list of unrelated switches, with nothing to
 * say why. The same silent-redirect shape `NotFoundPage` was written to
 * replace.
 */
export function AssistantDisabledPage() {
  const { t } = useInterfaceLanguage();

  return (
    <AppPage banner={<GenericBanner text={t('Mere Assistant')} />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-8 pb-24 sm:px-6">
          <div className="rounded-md bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <span className="bg-primary-50 text-primary-700 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <SparklesIcon className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('The assistant is switched off')}
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              {t(
                'Mere Assistant answers questions about your records using an AI model, and is off until you turn it on. Turn on "Enable Mere Assistant" under Experimental features in Settings, and choose OpenAI or a local Ollama instance.',
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to={AppRoutes.Settings}
                className="bg-primary hover:bg-primary-700 inline-flex min-h-[44px] items-center rounded-md px-4 text-sm font-semibold text-white shadow-sm"
              >
                {t('Open Settings')}
              </Link>
              <Link
                to={AppRoutes.Timeline}
                className="inline-flex min-h-[44px] items-center rounded-md px-4 text-sm font-semibold text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                {t('Go to timeline')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppPage>
  );
}
