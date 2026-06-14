import { Outlet } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  IdentificationIcon,
  PresentationChartLineIcon,
  ShareIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../Routes';
import { ScrollableTabNav } from '../../shared/components/ScrollableTabNav';

const utilityTabs = [
  { to: AppRoutes.VisitPrep, label: 'Visit prep', icon: DocumentArrowDownIcon },
  {
    to: AppRoutes.HealthMaintenance,
    label: 'Health maintenance',
    icon: ShieldCheckIcon,
  },
  { to: AppRoutes.WalletCard, label: 'Wallet card', icon: IdentificationIcon },
  {
    to: AppRoutes.GrowthCharts,
    label: 'Growth charts',
    icon: PresentationChartLineIcon,
  },
  { to: AppRoutes.Trackers, label: 'Trackers', icon: ChartBarIcon },
  { to: AppRoutes.RecordExport, label: 'Export', icon: ArrowDownTrayIcon },
  { to: AppRoutes.Sharing, label: 'Sharing', icon: ShareIcon },
  { to: AppRoutes.AuditLog, label: 'Audit log', icon: ClockIcon },
];

export function UtilitiesLayout() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-2 sm:px-6 lg:px-8">
        <ScrollableTabNav tabs={utilityTabs} ariaLabel="Utilities" />
      </div>
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
