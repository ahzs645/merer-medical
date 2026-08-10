import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DocumentPlusIcon, PhotoIcon } from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import {
  RecordHeaderLink,
  RecordPageHeader,
} from '../../shared/components/records/RecordPageHeader';
import { ErrorPanel } from '../../shared/components/StatusPanel';
import { ImagingCategoryTabs } from './components/ImagingCategoryTabs';
import { ImagingItemCard } from './components/ImagingItemCard';
import { ImagingSummaryPanel } from './components/ImagingSummaryPanel';
import { useImagingData } from './hooks/useImagingData';
import { ImagingCategory } from './types';
import {
  countImagingCategories,
  filterImagingItems,
} from './utils/imagingRecords';

export function ImagingTab() {
  const { t } = useInterfaceLanguage();
  const { items, status, error } = useImagingData(),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState<ImagingCategory | 'all'>('all');

  // Counts are scoped to the search, not the whole library, so a tile or chip
  // never advertises records the current query has already filtered out.
  const searchedItems = useMemo(
    () => filterImagingItems(items, query, 'all'),
    [items, query],
  );
  const counts = useMemo(
    () => countImagingCategories(searchedItems),
    [searchedItems],
  );
  const filteredItems = useMemo(
    () => filterImagingItems(searchedItems, '', category),
    [category, searchedItems],
  );

  return (
    <AppPage
      banner={
        <RecordPageHeader
          title={t('Imaging & Scans')}
          icon={PhotoIcon}
          count={
            <>
              {items.length} {t('imaging records')}
            </>
          }
          search={{
            query,
            onChange: setQuery,
            placeholder: t('Search scans, reports, modality, body site'),
            label: t('Search imaging records'),
          }}
          action={
            <RecordHeaderLink
              to={`${AppRoutes.AddRecord}?type=document&title=${encodeURIComponent(
                'Imaging record',
              )}`}
              label={t('Add image or scan')}
              icon={DocumentPlusIcon}
              compact
            />
          }
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <ImagingSummaryPanel
            total={searchedItems.length}
            byCategory={counts}
          />
          <ImagingCategoryTabs
            selected={category}
            onSelect={setCategory}
            total={searchedItems.length}
            counts={counts}
          />
          {status === 'loading' ? (
            <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
              {t('Loading imaging records...')}
            </div>
          ) : status === 'error' ? (
            <ErrorPanel error={error} />
          ) : filteredItems.length > 0 ? (
            <div className="grid gap-3">
              {filteredItems.map((item) => (
                <ImagingItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-md bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('No matching imaging records')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {t(
                  'Imaging reports, X-rays, DICOM studies, photos, and scan files will appear here when they are synced or added.',
                )}
              </p>
              <Link
                to={`${AppRoutes.AddRecord}?type=document&title=${encodeURIComponent(
                  'Imaging record',
                )}`}
                className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
              >
                {t('Add image or scan')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
}
