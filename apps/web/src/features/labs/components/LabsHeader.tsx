import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function LabsHeader({
  query,
  setQuery,
  hideSearch = false,
  hideOnMobile = false,
}: {
  query: string;
  setQuery: (query: string) => void;
  hideSearch?: boolean;
  hideOnMobile?: boolean;
}) {
  const { language, t } = useInterfaceLanguage();
  const isRtl = language === 'ar';

  return (
    <div
      className={`bg-primary-800 px-3 py-4 text-white sm:px-6 sm:py-6 lg:px-8 ${
        hideOnMobile ? 'hidden md:block' : ''
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {t('All lab results')}
          </h1>
        </div>
        {!hideSearch ? (
          <label className="relative block w-full md:max-w-sm">
            <span className="sr-only">{t('Search labs')}</span>
            <MagnifyingGlassIcon
              className={`pointer-events-none absolute top-2.5 h-5 w-5 text-gray-400 ${
                isRtl ? 'right-3' : 'left-3'
              }`}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`block w-full rounded-md border-0 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary-500 ${
                isRtl ? 'pl-3 pr-10' : 'pl-10 pr-3'
              }`}
              placeholder={t('Search lab name or code')}
              type="search"
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}
