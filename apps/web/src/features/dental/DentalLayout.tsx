import { NavLink, Outlet } from 'react-router-dom';

import {
  ChartPieIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  PhotoIcon,
  SparklesIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';

import { AppPage } from '../../shared/components/AppPage';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../Routes';
import { DentalHeader } from './components/DentalHeader';
import { useDentalData } from './hooks/useDentalData';

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
          <nav
            className="scrollbar-hide mx-auto flex max-w-7xl gap-1 overflow-x-auto py-2 sm:gap-2"
            aria-label="Dental sections"
          >
            {dentalTabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium sm:gap-2 sm:px-3 ${
                    isActive
                      ? 'bg-primary-800 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {t(label)}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
            <Outlet context={dentalData} />
            {dentalData.status === 'loading' && (
              <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
                {t('Loading dental records...')}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppPage>
  );
}
