import { Outlet } from 'react-router-dom';

import {
  ChartPieIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  PhotoIcon,
  SparklesIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';

import { AppPage } from '../../shared/components/AppPage';
import { ErrorPanel, LoadingPanel } from '../../shared/components/StatusPanel';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../Routes';
import { DentalHeader } from './components/DentalHeader';
import { useDentalData } from './hooks/useDentalData';
import { ScrollableTabNav } from '../../shared/components/ScrollableTabNav';

const dentalTabs = [
  { to: AppRoutes.Dental, label: 'Overview', icon: ChartPieIcon, end: true },
  { to: AppRoutes.DentalChart, label: 'Chart & teeth', icon: Squares2X2Icon },
  {
    to: AppRoutes.DentalTreatment,
    label: 'Treatment',
    icon: ClipboardDocumentCheckIcon,
  },
  { to: AppRoutes.DentalHygiene, label: 'Hygiene & perio', icon: SparklesIcon },
  { to: AppRoutes.DentalImaging, label: 'Imaging & scans', icon: PhotoIcon },
  {
    to: AppRoutes.DentalRecords,
    label: 'Records & claims',
    icon: DocumentTextIcon,
  },
];

export function DentalLayout() {
  const { t } = useInterfaceLanguage();
  const dentalData = useDentalData();

  return (
    <AppPage
      banner={
        <DentalHeader
          recordCount={dentalData.records.length}
          imageCount={dentalData.imaging.length}
        />
      }
    >
      <div className="flex h-full min-h-0 flex-col bg-gray-50">
        <div className="border-b border-gray-200 bg-white px-2 sm:px-6 lg:px-8">
          <ScrollableTabNav tabs={dentalTabs} ariaLabel="Dental sections" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
            {dentalData.status === 'loading' ? (
              <LoadingPanel text={t('Loading dental records...')} />
            ) : dentalData.status === 'error' ? (
              <ErrorPanel
                error={dentalData.error}
                text={t('Unable to load dental records.')}
              />
            ) : (
              <Outlet context={dentalData} />
            )}
          </div>
        </div>
      </div>
    </AppPage>
  );
}
