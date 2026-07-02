import '../styles.css';

import React from 'react';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useParams,
} from 'react-router-dom';

import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { useConsoleLogEasterEgg } from '../shared/hooks/useConsoleLogEasterEgg';
import { DeveloperLogsProvider } from '../app/providers/DeveloperLogsProvider';
import {
  LocalConfigProvider,
  useLocalConfig,
} from '../app/providers/LocalConfigProvider';
import { NotificationProvider } from '../app/providers/NotificationProvider';
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
import { AuditLogTab } from '../features/audit/AuditLogTab';
import { CarePlansTab } from '../features/care/CarePlansTab';
import { ConditionsTab } from '../features/conditions/ConditionsTab';
import { ConditionDetailTab } from '../features/conditions/ConditionDetailTab';
import { GoalsTab } from '../features/goals/GoalsTab';
import { GrowthChartsTab } from '../features/growth-charts/GrowthChartsTab';
import { HealthMaintenanceTab } from '../features/health-maintenance/HealthMaintenanceTab';
import { HistoriesTab } from '../features/histories/HistoriesTab';
import { ProceduresTab } from '../features/procedures/ProceduresTab';
import { RecordExportTab } from '../features/record-export/RecordExportTab';
import { WalletCardTab } from '../features/wallet-card/WalletCardTab';
import CernerRedirect from '../features/connections/oauth-callbacks/CernerRedirect';
import ConnectionTab from '../features/connections/ConnectionTab';
import EpicRedirect from '../features/connections/oauth-callbacks/EpicRedirect';
import { DentalLayout } from '../features/dental/DentalLayout';
import { DentalChartTab } from '../features/dental/tabs/DentalChartTab';
import { DentalHygieneTab } from '../features/dental/tabs/DentalHygieneTab';
import { DentalImagingTab } from '../features/dental/tabs/DentalImagingTab';
import { DentalOverviewTab } from '../features/dental/tabs/DentalOverviewTab';
import { DentalRecordsTab } from '../features/dental/tabs/DentalRecordsTab';
import { DentalTreatmentTab } from '../features/dental/tabs/DentalTreatmentTab';
import { DocumentsTab } from '../features/documents/DocumentsTab';
import { DocumentDetailTab } from '../features/documents/DocumentDetailTab';
import HealowRedirect from '../features/connections/oauth-callbacks/HealowRedirect';
import { LabDetailTab } from '../features/labs/LabDetailTab';
import { LabsTab } from '../features/labs/LabsTab';
import { ImagingTab } from '../features/imaging/ImagingTab';
import { ImmunizationsTab } from '../features/immunizations/ImmunizationsTab';
import { InsuranceTab } from '../features/insurance/InsuranceTab';
import { MedicationsTab } from '../features/medications/MedicationsTab';
import MereAITab from '../features/ai-chat/MereAITab';
import { ManualRecordTab } from '../features/manual-entry/ManualRecordTab';
import OnPatientRedirect from '../features/connections/oauth-callbacks/OnPatientRedirect';
import { OptometryLayout } from '../features/optometry/OptometryLayout';
import { OptometryOverviewTab } from '../features/optometry/tabs/OptometryOverviewTab';
import { OptometryPrescriptionsTab } from '../features/optometry/tabs/OptometryPrescriptionsTab';
import { OptometryExamsTab } from '../features/optometry/tabs/OptometryExamsTab';
import { OptometrySurgeryTab } from '../features/optometry/tabs/OptometrySurgeryTab';
import { OptometryImagingTab } from '../features/optometry/tabs/OptometryImagingTab';
import { OptometryRecordsTab } from '../features/optometry/tabs/OptometryRecordsTab';
import { ProblemsTab } from '../features/problems/ProblemsTab';
import { AllergiesTab } from '../features/allergies/AllergiesTab';
import { VitalsTab } from '../features/vitals/VitalsTab';
import { EncountersTab } from '../features/encounters/EncountersTab';
import { ReferralsTab } from '../features/referrals/ReferralsTab';
import { DirectoryTab } from '../features/directory/DirectoryTab';
import { ResultsTab } from '../features/results/ResultsTab';
import { RecordsLayout } from '../features/records/RecordsLayout';
import { RecordsHub } from '../features/records/RecordsHub';
import SettingsTab from '../features/settings/SettingsTab';
import { SharingTab } from '../features/sharing/SharingTab';
import SummaryTab from '../features/summary/SummaryTab';
import { TimelineTab } from '../features/timeline/TimelineTab';
import { TrackersTab } from '../features/trackers/TrackersTab';
import { UtilitiesLayout } from '../features/utilities/UtilitiesLayout';
import { VisitPrepTab } from '../features/visit-prep/VisitPrepTab';
import VARedirect from '../features/connections/oauth-callbacks/VARedirect';
import VeradigmRedirect from '../features/connections/oauth-callbacks/VeradigmRedirect';
import { Routes as AppRoutes } from '../Routes';
import { getRouterBasename } from '../shared/utils/demoMode';

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
            path: 'problems',
            element: <ProblemsTab />,
          },
          {
            path: 'conditions',
            element: <ConditionsTab />,
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
            element: <Navigate to={AppRoutes.VisitPrep} replace />,
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
        element: <Navigate to={AppRoutes.Timeline} />,
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
