import { Outlet } from 'react-router-dom';

import { AppPage } from '../../shared/components/AppPage';
import { ErrorPanel, LoadingPanel } from '../../shared/components/StatusPanel';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../Routes';
import { ALL_RECORD_CATEGORIES } from '../records/recordCategories';
import { ScrollableTabNav } from '../../shared/components/ScrollableTabNav';
import { OptometryHeader } from './components/OptometryHeader';
import { useOptometryData } from './hooks/useOptometryData';

// Sub-pages come from the shared record-category config so the tab strip, the
// desktop side nav, and the command palette can't drift apart.
const optometrySubPages =
  ALL_RECORD_CATEGORIES.find((category) => category.to === AppRoutes.Optometry)
    ?.children ?? [];

// Short names below `lg`, where "Surgery & procedures" and "Exams & metrics"
// would push the rest of the strip off a 390px screen. Full names from `lg` up.
const SHORT_TAB_LABELS: Record<string, string> = {
  [AppRoutes.OptometryExams]: 'Exams',
  [AppRoutes.OptometrySurgery]: 'Surgery',
  [AppRoutes.OptometryImaging]: 'Imaging',
};

const optometryTabs = optometrySubPages.map((tab) => ({
  ...tab,
  shortLabel: SHORT_TAB_LABELS[tab.to],
}));

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
        {/* At every width: the Records side nav does list these from `lg` up,
            but it scrolls separately and puts them below its own fold on a
            1440×900 screen. See DentalLayout for the same note. */}
        <div className="border-b border-gray-200 bg-white px-2 sm:px-6">
          <ScrollableTabNav
            tabs={optometryTabs}
            ariaLabel="Optometry sections"
          />
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
