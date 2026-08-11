import { Outlet } from 'react-router-dom';

import { AppPage } from '../../shared/components/AppPage';
import { ErrorPanel, LoadingPanel } from '../../shared/components/StatusPanel';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../Routes';
import { ALL_RECORD_CATEGORIES } from '../records/recordCategories';
import { DentalHeader } from './components/DentalHeader';
import { useDentalData } from './hooks/useDentalData';
import { ScrollableTabNav } from '../../shared/components/ScrollableTabNav';

// Sub-pages come from the shared record-category config so the tab strip, the
// desktop side nav, and the command palette can't drift apart.
const dentalSubPages =
  ALL_RECORD_CATEGORIES.find((category) => category.to === AppRoutes.Dental)
    ?.children ?? [];

// The phone-width strip scrolls horizontally, and the full "Chart & teeth" /
// "Hygiene & perio" names push more than half of it off-screen at 390px. The
// icon plus a single word still identifies each sub-page below `lg`; from `lg`
// up, where there is room, the strip shows the full names.
const SHORT_TAB_LABELS: Record<string, string> = {
  [AppRoutes.DentalChart]: 'Chart',
  [AppRoutes.DentalHygiene]: 'Hygiene',
  [AppRoutes.DentalImaging]: 'Imaging',
  [AppRoutes.DentalRecords]: 'Records',
};

const dentalTabs = dentalSubPages.map((tab) => ({
  ...tab,
  shortLabel: SHORT_TAB_LABELS[tab.to],
}));

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
        {/* At every width, not `lg:hidden`.
            The theory was that the Records side nav lists these sub-pages from
            `lg` up, so the strip was redundant there. In practice that column
            scrolls on its own, and on a 1440×900 screen Dental's children sit
            below its fold — so the widest viewport was the one where the five
            sub-pages had no visible route in, while the phone had a tab strip.
            The workspace carries its own navigation now. */}
        <div className="border-b border-gray-200 bg-white px-2 sm:px-6">
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
