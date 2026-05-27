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
import { LocalConfigProvider } from '../app/providers/LocalConfigProvider';
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
import { TabWrapper } from '../shared/components/TabWrapper';
import { TutorialOverlay } from '../features/tutorial/TutorialOverlay';
import CernerRedirect from '../features/connections/oauth-callbacks/CernerRedirect';
import ConnectionTab from '../features/connections/ConnectionTab';
import EpicRedirect from '../features/connections/oauth-callbacks/EpicRedirect';
import { DentalTab } from '../features/dental/DentalTab';
import HealowRedirect from '../features/connections/oauth-callbacks/HealowRedirect';
import { LabDetailTab } from '../features/labs/LabDetailTab';
import { LabsTab } from '../features/labs/LabsTab';
import { ImagingTab } from '../features/imaging/ImagingTab';
import { MedicationsTab } from '../features/medications/MedicationsTab';
import MereAITab from '../features/ai-chat/MereAITab';
import { ManualRecordTab } from '../features/manual-entry/ManualRecordTab';
import OnPatientRedirect from '../features/connections/oauth-callbacks/OnPatientRedirect';
import { OptometryTab } from '../features/optometry/OptometryTab';
import { RecordsLayout } from '../features/records/RecordsLayout';
import SettingsTab from '../features/settings/SettingsTab';
import SummaryTab from '../features/summary/SummaryTab';
import { TimelineTab } from '../features/timeline/TimelineTab';
import VARedirect from '../features/connections/oauth-callbacks/VARedirect';
import VeradigmRedirect from '../features/connections/oauth-callbacks/VeradigmRedirect';
import { Routes as AppRoutes } from '../Routes';
import { getRouterBasename, isDemoMode } from '../shared/utils/demoMode';

export default function App() {
  useConsoleLogEasterEgg();

  return (
    <ErrorBoundary>
      <LocalConfigProvider>
        <DeveloperLogsProvider>
          <TutorialConfigProvider>
            {!isDemoMode() && <TutorialOverlay />}
          </TutorialConfigProvider>
          <NotificationProvider>
            <UpdateAppChecker />
            <RxDbProvider>
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
            </RxDbProvider>
          </NotificationProvider>
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
            element: <Navigate to={AppRoutes.Labs} replace />,
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
            path: 'imaging',
            element: <ImagingTab />,
          },
          {
            path: 'medications',
            element: <MedicationsTab />,
          },
          {
            path: 'dental',
            element: <DentalTab />,
          },
          {
            path: 'optometry',
            element: <OptometryTab />,
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
        path: AppRoutes.AddConnection,
        element: <ConnectionTab />,
      },
      {
        path: AppRoutes.MereAIAssistant,
        element: <MereAITab />,
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
