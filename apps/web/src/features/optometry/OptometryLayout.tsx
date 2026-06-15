import { NavLink, Outlet } from 'react-router-dom';

import {
  ChartPieIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  PhotoIcon,
  ScissorsIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';

import { AppPage } from '../../shared/components/AppPage';
import { ErrorPanel, LoadingPanel } from '../../shared/components/StatusPanel';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../Routes';
import { OptometryHeader } from './components/OptometryHeader';
import { useOptometryData } from './hooks/useOptometryData';

const optometryTabs = [
  { to: AppRoutes.Optometry, label: 'Overview', icon: ChartPieIcon, end: true },
  {
    to: AppRoutes.OptometryPrescriptions,
    label: 'Prescriptions',
    icon: Squares2X2Icon,
  },
  {
    to: AppRoutes.OptometryExams,
    label: 'Exams & metrics',
    icon: ClipboardDocumentListIcon,
  },
  {
    to: AppRoutes.OptometrySurgery,
    label: 'Surgery & procedures',
    icon: ScissorsIcon,
  },
  { to: AppRoutes.OptometryImaging, label: 'Imaging & scans', icon: PhotoIcon },
  {
    to: AppRoutes.OptometryRecords,
    label: 'Records',
    icon: DocumentTextIcon,
  },
];

export function OptometryLayout() {
  const { t } = useInterfaceLanguage();
  const optometryData = useOptometryData();

  return (
    <AppPage
      banner={
        <OptometryHeader
          recordCount={optometryData.records.length}
          imageCount={optometryData.imaging.length}
        />
      }
    >
      <div className="flex h-full min-h-0 flex-col bg-gray-50">
        <div className="border-b border-gray-200 bg-white px-2 sm:px-6 lg:px-8">
          <nav
            className="scrollbar-hide mx-auto flex max-w-7xl gap-1 overflow-x-auto py-2 sm:gap-2"
            aria-label="Optometry sections"
          >
            {optometryTabs.map(({ to, label, icon: Icon, end }) => (
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
            {optometryData.status === 'loading' ? (
              <LoadingPanel text={t('Loading optometry records...')} />
            ) : optometryData.status === 'error' ? (
              <ErrorPanel
                error={optometryData.error}
                text={t('Unable to load optometry records.')}
              />
            ) : (
              <Outlet context={optometryData} />
            )}
          </div>
        </div>
      </div>
    </AppPage>
  );
}
