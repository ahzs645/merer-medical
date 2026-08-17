import '../styles.css';

import React, { lazy } from 'react';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useParams,
} from 'react-router-dom';

import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { NotFoundPage } from '../shared/components/NotFoundPage';
import { useConsoleLogEasterEgg } from '../shared/hooks/useConsoleLogEasterEgg';
import { DeveloperLogsProvider } from '../app/providers/DeveloperLogsProvider';
import {
  LocalConfigProvider,
  useLocalConfig,
} from '../app/providers/LocalConfigProvider';
import { NotificationProvider } from '../app/providers/NotificationProvider';
import { RecordChangeBridge } from '../app/providers/RecordChangeBridge';
import { RxDbProvider } from '../app/providers/RxDbProvider';
import { SyncJobProvider } from '../features/sync/SyncJobProvider';
import { TutorialConfigProvider } from '../features/tutorial/TutorialConfigProvider';
import { UpdateAppChecker } from '../app/providers/UpdateAppChecker';
import { UserPreferencesProvider } from '../app/providers/UserPreferencesProvider';
import { UserProvider } from '../app/providers/UserProvider';
import { InterfaceLanguageProvider } from '../app/providers/InterfaceLanguageProvider';
import VectorProvider from '../features/vectors';
import { AppConfigProvider } from '../app/providers/AppConfigProvider';
import { AppDataProvider } from '../app/providers/AppDataProvider';
import { TabWrapper } from '../shared/components/TabWrapper';
import { TimelineTab } from '../features/timeline/TimelineTab';
import { Routes as AppRoutes } from '../Routes';
import { getRouterBasename } from '../shared/utils/demoMode';

/**
 * Every route below this line is fetched when it is first opened.
 *
 * The build used to emit a single entry chunk — 4.8 MB raw, 1.3 MB gzipped —
 * holding all 46 routes: the C-CDA parser, recharts, fhirpath, and three.js
 * (via the dental chart's odontogram). A phone opening the timeline paid for
 * the WebGL renderer behind one sub-page of one specialty workspace.
 *
 * The shell and the landing route stay eager, so the first paint is unchanged
 * and only navigation away from it can suspend. `TabWrapper` renders the
 * Suspense boundary around its `Outlet`.
 */
function lazyNamed<T extends Record<string, unknown>>(
  load: () => Promise<T>,
  name: keyof T,
) {
  return lazy(() =>
    load().then((module) => ({
      default: module[name] as React.ComponentType<Record<string, never>>,
    })),
  );
}

const AuditLogTab = lazyNamed(
  () => import('../features/audit/AuditLogTab'),
  'AuditLogTab',
);
const CarePlansTab = lazyNamed(
  () => import('../features/care/CarePlansTab'),
  'CarePlansTab',
);
const ConditionsTab = lazyNamed(
  () => import('../features/conditions/ConditionsTab'),
  'ConditionsTab',
);
const ConditionDetailTab = lazyNamed(
  () => import('../features/conditions/ConditionDetailTab'),
  'ConditionDetailTab',
);
const GoalsTab = lazyNamed(
  () => import('../features/goals/GoalsTab'),
  'GoalsTab',
);
const GrowthChartsTab = lazyNamed(
  () => import('../features/growth-charts/GrowthChartsTab'),
  'GrowthChartsTab',
);
const HealthMaintenanceTab = lazyNamed(
  () => import('../features/health-maintenance/HealthMaintenanceTab'),
  'HealthMaintenanceTab',
);
const HistoriesTab = lazyNamed(
  () => import('../features/histories/HistoriesTab'),
  'HistoriesTab',
);
const ProceduresTab = lazyNamed(
  () => import('../features/procedures/ProceduresTab'),
  'ProceduresTab',
);
const RecordExportTab = lazyNamed(
  () => import('../features/record-export/RecordExportTab'),
  'RecordExportTab',
);
const WalletCardTab = lazyNamed(
  () => import('../features/wallet-card/WalletCardTab'),
  'WalletCardTab',
);
const CernerRedirect = lazy(
  () => import('../features/connections/oauth-callbacks/CernerRedirect'),
);
const ConnectionTab = lazy(
  () => import('../features/connections/ConnectionTab'),
);
const EpicRedirect = lazy(
  () => import('../features/connections/oauth-callbacks/EpicRedirect'),
);
const DentalLayout = lazyNamed(
  () => import('../features/dental/DentalLayout'),
  'DentalLayout',
);
const DentalChartTab = lazyNamed(
  () => import('../features/dental/tabs/DentalChartTab'),
  'DentalChartTab',
);
const DentalHygieneTab = lazyNamed(
  () => import('../features/dental/tabs/DentalHygieneTab'),
  'DentalHygieneTab',
);
const DentalImagingTab = lazyNamed(
  () => import('../features/dental/tabs/DentalImagingTab'),
  'DentalImagingTab',
);
const DentalOverviewTab = lazyNamed(
  () => import('../features/dental/tabs/DentalOverviewTab'),
  'DentalOverviewTab',
);
const DentalRecordsTab = lazyNamed(
  () => import('../features/dental/tabs/DentalRecordsTab'),
  'DentalRecordsTab',
);
const DentalTreatmentTab = lazyNamed(
  () => import('../features/dental/tabs/DentalTreatmentTab'),
  'DentalTreatmentTab',
);
const DocumentsTab = lazyNamed(
  () => import('../features/documents/DocumentsTab'),
  'DocumentsTab',
);
const DocumentDetailTab = lazyNamed(
  () => import('../features/documents/DocumentDetailTab'),
  'DocumentDetailTab',
);
const HealowRedirect = lazy(
  () => import('../features/connections/oauth-callbacks/HealowRedirect'),
);
const LabDetailTab = lazyNamed(
  () => import('../features/labs/LabDetailTab'),
  'LabDetailTab',
);
const LabsTab = lazyNamed(() => import('../features/labs/LabsTab'), 'LabsTab');
const ImagingTab = lazyNamed(
  () => import('../features/imaging/ImagingTab'),
  'ImagingTab',
);
const ImmunizationsTab = lazyNamed(
  () => import('../features/immunizations/ImmunizationsTab'),
  'ImmunizationsTab',
);
const InsuranceTab = lazyNamed(
  () => import('../features/insurance/InsuranceTab'),
  'InsuranceTab',
);
const MedicationsTab = lazyNamed(
  () => import('../features/medications/MedicationsTab'),
  'MedicationsTab',
);
const MereAITab = lazy(() => import('../features/ai-chat/MereAITab'));
const ManualRecordTab = lazyNamed(
  () => import('../features/manual-entry/ManualRecordTab'),
  'ManualRecordTab',
);
const OnPatientRedirect = lazy(
  () => import('../features/connections/oauth-callbacks/OnPatientRedirect'),
);
const OptometryLayout = lazyNamed(
  () => import('../features/optometry/OptometryLayout'),
  'OptometryLayout',
);
const OptometryOverviewTab = lazyNamed(
  () => import('../features/optometry/tabs/OptometryOverviewTab'),
  'OptometryOverviewTab',
);
const OptometryPrescriptionsTab = lazyNamed(
  () => import('../features/optometry/tabs/OptometryPrescriptionsTab'),
  'OptometryPrescriptionsTab',
);
const OptometryExamsTab = lazyNamed(
  () => import('../features/optometry/tabs/OptometryExamsTab'),
  'OptometryExamsTab',
);
const OptometrySurgeryTab = lazyNamed(
  () => import('../features/optometry/tabs/OptometrySurgeryTab'),
  'OptometrySurgeryTab',
);
const OptometryImagingTab = lazyNamed(
  () => import('../features/optometry/tabs/OptometryImagingTab'),
  'OptometryImagingTab',
);
const OptometryRecordsTab = lazyNamed(
  () => import('../features/optometry/tabs/OptometryRecordsTab'),
  'OptometryRecordsTab',
);
const ProblemsTab = lazyNamed(
  () => import('../features/problems/ProblemsTab'),
  'ProblemsTab',
);
const AllergiesTab = lazyNamed(
  () => import('../features/allergies/AllergiesTab'),
  'AllergiesTab',
);
const VitalsTab = lazyNamed(
  () => import('../features/vitals/VitalsTab'),
  'VitalsTab',
);
const EncountersTab = lazyNamed(
  () => import('../features/encounters/EncountersTab'),
  'EncountersTab',
);
const ReferralsTab = lazyNamed(
  () => import('../features/referrals/ReferralsTab'),
  'ReferralsTab',
);
const DirectoryTab = lazyNamed(
  () => import('../features/directory/DirectoryTab'),
  'DirectoryTab',
);
const ResultsTab = lazyNamed(
  () => import('../features/results/ResultsTab'),
  'ResultsTab',
);
const RecordsLayout = lazyNamed(
  () => import('../features/records/RecordsLayout'),
  'RecordsLayout',
);
const RecordsHub = lazyNamed(
  () => import('../features/records/RecordsHub'),
  'RecordsHub',
);
const SettingsTab = lazy(() => import('../features/settings/SettingsTab'));
const SharingTab = lazyNamed(
  () => import('../features/sharing/SharingTab'),
  'SharingTab',
);
const SummaryTab = lazy(() => import('../features/summary/SummaryTab'));
const TrackersTab = lazyNamed(
  () => import('../features/trackers/TrackersTab'),
  'TrackersTab',
);
const UtilitiesHub = lazyNamed(
  () => import('../features/utilities/UtilitiesHub'),
  'UtilitiesHub',
);
const UtilitiesLayout = lazyNamed(
  () => import('../features/utilities/UtilitiesLayout'),
  'UtilitiesLayout',
);
const VisitPrepTab = lazyNamed(
  () => import('../features/visit-prep/VisitPrepTab'),
  'VisitPrepTab',
);
const VARedirect = lazy(
  () => import('../features/connections/oauth-callbacks/VARedirect'),
);
const VeradigmRedirect = lazy(
  () => import('../features/connections/oauth-callbacks/VeradigmRedirect'),
);

export default function App() {
  useConsoleLogEasterEgg();

  return (
    <ErrorBoundary>
      <LocalConfigProvider>
        <DeveloperLogsProvider>
          <TutorialConfigProvider>
            <NotificationProvider>
              <UpdateAppChecker />
              <RxDbProvider>
                <AppDataProvider>
                  <AppConfigProvider>
                    <UserProvider>
                      <VectorProvider>
                        <UserPreferencesProvider>
                          <InterfaceLanguageProvider>
                            <SyncJobProvider>
                              <RecordChangeBridge />
                              <RouterProvider router={router} />
                            </SyncJobProvider>
                          </InterfaceLanguageProvider>
                        </UserPreferencesProvider>
                      </VectorProvider>
                    </UserProvider>
                  </AppConfigProvider>
                </AppDataProvider>
              </RxDbProvider>
            </NotificationProvider>
          </TutorialConfigProvider>
        </DeveloperLogsProvider>
      </LocalConfigProvider>
    </ErrorBoundary>
  );
}

const routes = [
  {
    element: <TabWrapper />,
    children: [
      {
        path: AppRoutes.Timeline,
        element: <TimelineTab />,
      },
      {
        path: AppRoutes.Records,
        element: <RecordsLayout />,
        children: [
          {
            index: true,
            element: <RecordsHub />,
          },
          {
            path: 'labs',
            element: <LabsTab />,
          },
          {
            path: 'labs/:labKey',
            element: <LabDetailTab />,
          },
          {
            path: 'documents',
            element: <DocumentsTab />,
          },
          {
            path: 'documents/detail/:documentId',
            element: <DocumentDetailTab />,
          },
          {
            path: 'imaging',
            element: <ImagingTab />,
          },
          {
            path: 'medications',
            element: <MedicationsTab />,
          },
          {
            path: 'immunizations',
            element: <ImmunizationsTab />,
          },
          {
            path: 'insurance',
            element: <InsuranceTab />,
          },
          {
            path: 'care-plans',
            element: <CarePlansTab />,
          },
          {
            // Problems and My conditions were two nav entries over one pile of
            // FHIR Conditions, both headers reporting the same count. They are
            // one category with two views now; the old address still resolves.
            path: 'problems',
            element: <Navigate to={AppRoutes.ConditionDetails} replace />,
          },
          {
            path: 'conditions',
            element: <ConditionsTab />,
          },
          {
            // Declared before `:conditionId` so the literal wins the match.
            path: 'conditions/details',
            element: <ProblemsTab />,
          },
          {
            path: 'conditions/:conditionId',
            element: <ConditionDetailTab />,
          },
          {
            path: 'dental',
            element: <DentalLayout />,
            children: [
              {
                index: true,
                element: <DentalOverviewTab />,
              },
              {
                path: 'chart',
                element: <DentalChartTab />,
              },
              {
                path: 'treatment',
                element: <DentalTreatmentTab />,
              },
              {
                path: 'hygiene',
                element: <DentalHygieneTab />,
              },
              {
                path: 'imaging',
                element: <DentalImagingTab />,
              },
              {
                path: 'records',
                element: <DentalRecordsTab />,
              },
            ],
          },
          {
            path: 'optometry',
            element: <OptometryLayout />,
            children: [
              {
                index: true,
                element: <OptometryOverviewTab />,
              },
              {
                path: 'prescriptions',
                element: <OptometryPrescriptionsTab />,
              },
              {
                path: 'exams',
                element: <OptometryExamsTab />,
              },
              {
                path: 'surgery',
                element: <OptometrySurgeryTab />,
              },
              {
                path: 'imaging',
                element: <OptometryImagingTab />,
              },
              {
                path: 'records',
                element: <OptometryRecordsTab />,
              },
            ],
          },
          {
            path: 'histories',
            element: <HistoriesTab />,
          },
          {
            path: 'goals',
            element: <GoalsTab />,
          },
          {
            path: 'procedures',
            element: <ProceduresTab />,
          },
          {
            path: 'allergies',
            element: <AllergiesTab />,
          },
          {
            path: 'vitals',
            element: <VitalsTab />,
          },
          {
            path: 'encounters',
            element: <EncountersTab />,
          },
          {
            path: 'referrals',
            element: <ReferralsTab />,
          },
          {
            path: 'directory',
            element: <DirectoryTab />,
          },
          {
            path: 'results',
            element: <ResultsTab />,
          },
          {
            path: 'new',
            element: <ManualRecordTab />,
          },
          {
            path: ':recordId/edit',
            element: <ManualRecordTab />,
          },
        ],
      },
      {
        path: AppRoutes.Utilities,
        element: <UtilitiesLayout />,
        children: [
          {
            index: true,
            element: <UtilitiesHub />,
          },
          {
            path: 'visit-prep',
            element: <VisitPrepTab />,
          },
          {
            path: 'sharing',
            element: <SharingTab />,
          },
          {
            path: 'audit-log',
            element: <AuditLogTab />,
          },
          {
            path: 'trackers',
            element: <TrackersTab />,
          },
          {
            path: 'health-maintenance',
            element: <HealthMaintenanceTab />,
          },
          {
            path: 'wallet-card',
            element: <WalletCardTab />,
          },
          {
            path: 'growth-charts',
            element: <GrowthChartsTab />,
          },
          {
            path: 'export',
            element: <RecordExportTab />,
          },
        ],
      },
      {
        path: AppRoutes.AddConnection,
        element: <ConnectionTab />,
      },
      {
        path: AppRoutes.MereAIAssistant,
        element: <AssistantRoute />,
      },
      {
        path: AppRoutes.Summary,
        element: <SummaryTab />,
      },
      {
        path: AppRoutes.Settings,
        element: <SettingsTab />,
      },
      {
        path: AppRoutes.OnPatientCallback,
        element: <OnPatientRedirect />,
      },
      {
        path: AppRoutes.EpicCallback,
        element: <EpicRedirect />,
      },
      {
        path: AppRoutes.CernerCallback,
        element: <CernerRedirect />,
      },
      {
        path: AppRoutes.VeradigmCallback,
        element: <VeradigmRedirect />,
      },
      {
        path: AppRoutes.VACallback,
        element: <VARedirect />,
      },
      {
        path: AppRoutes.HealowCallback,
        element: <HealowRedirect />,
      },
      {
        path: '/labs',
        element: <Navigate to={AppRoutes.Labs} replace />,
      },
      {
        path: '/labs/:labKey',
        element: <LegacyLabDetailRedirect />,
      },
      {
        path: '/records/visit-prep',
        element: <Navigate to={AppRoutes.VisitPrep} replace />,
      },
      {
        path: '/records/sharing',
        element: <Navigate to={AppRoutes.Sharing} replace />,
      },
      {
        path: '/records/audit-log',
        element: <Navigate to={AppRoutes.AuditLog} replace />,
      },
      {
        path: '/imaging',
        element: <Navigate to={AppRoutes.Imaging} replace />,
      },
      {
        path: '/dental',
        element: <Navigate to={AppRoutes.Dental} replace />,
      },
      {
        path: '/optometry',
        element: <Navigate to={AppRoutes.Optometry} replace />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];

const router = createBrowserRouter(routes, { basename: getRouterBasename() });

function LegacyLabDetailRedirect() {
  const { labKey } = useParams();
  return (
    <Navigate
      to={`${AppRoutes.Labs}/${encodeURIComponent(labKey || '')}`}
      replace
    />
  );
}

function AssistantRoute() {
  const { experimental__use_openai_rag } = useLocalConfig();
  return experimental__use_openai_rag ? (
    <MereAITab />
  ) : (
    <Navigate to={AppRoutes.Settings} replace />
  );
}
