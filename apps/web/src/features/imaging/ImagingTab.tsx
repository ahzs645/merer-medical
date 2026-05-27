import { useMemo, useState } from 'react';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { AppPage } from '../../shared/components/AppPage';
import { ImagingCategoryTabs } from './components/ImagingCategoryTabs';
import { ImagingHeader } from './components/ImagingHeader';
import { ImagingItemCard } from './components/ImagingItemCard';
import { ImagingSummaryPanel } from './components/ImagingSummaryPanel';
import { useImagingData } from './hooks/useImagingData';
import { ImagingCategory } from './types';
import { filterImagingItems } from './utils/imagingRecords';

export function ImagingTab() {
  const { t } = useInterfaceLanguage();
  const { items, counts, status } = useImagingData(),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState<ImagingCategory | 'all'>('all');

  const filteredItems = useMemo(
    () => filterImagingItems(items, query, category),
    [category, items, query],
  );

  return (
    <AppPage
      banner={
        <ImagingHeader
          totalCount={counts.total}
          query={query}
          setQuery={setQuery}
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <ImagingSummaryPanel {...counts} />
          <ImagingCategoryTabs selected={category} onSelect={setCategory} />
          {status === 'loading' ? (
            <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
              {t('Loading imaging records...')}
            </div>
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
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
}
