import { Link } from 'react-router-dom';
import {
  DocumentPlusIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../../Routes';

export function ImagingHeader({
  totalCount,
  query,
  setQuery,
}: {
  totalCount: number;
  query: string;
  setQuery: (query: string) => void;
}) {
  const { language, t } = useInterfaceLanguage();
  const isRtl = language === 'ar';

  return (
    <div className="bg-primary-700 px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PhotoIcon className="h-7 w-7" />
            <h1 className="text-2xl font-semibold">{t('Imaging & Scans')}</h1>
          </div>
          <p className="mt-1 text-sm text-primary-100">
            {totalCount} {t('imaging records')}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row md:max-w-2xl">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">{t('Search imaging records')}</span>
            <MagnifyingGlassIcon
              className={`pointer-events-none absolute top-2.5 h-5 w-5 text-gray-400 ${
                isRtl ? 'right-3' : 'left-3'
              }`}
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Search scans, reports, modality, body site')}
              className={`block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm ${
                isRtl ? 'pl-3 pr-10' : 'pl-10 pr-3'
              }`}
            />
          </label>
          <Link
            to={`${AppRoutes.AddRecord}?type=document&title=${encodeURIComponent(
              'Imaging record',
            )}`}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary-700 shadow-sm ring-1 ring-inset ring-primary-100 hover:bg-primary-50"
          >
            <DocumentPlusIcon className="h-5 w-5" />
            {t('Add image or scan')}
          </Link>
        </div>
      </div>
    </div>
  );
}
