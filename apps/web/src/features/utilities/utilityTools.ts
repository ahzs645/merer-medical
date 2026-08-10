import type { ComponentType } from 'react';
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

export interface UtilityTool {
  to: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

/**
 * Single source of truth for the eight Utilities tools, shared by the hub
 * (landing grid) and the tool nav (tab strip / phone menu) so the two can
 * never drift apart.
 */
export const UTILITY_TOOLS: UtilityTool[] = [
  {
    to: AppRoutes.VisitPrep,
    label: 'Visit prep',
    description: 'Build a printable summary and packet for your next visit.',
    icon: DocumentArrowDownIcon,
  },
  {
    to: AppRoutes.HealthMaintenance,
    label: 'Health maintenance',
    description: 'See which screenings and vaccines are due or overdue.',
    icon: ShieldCheckIcon,
  },
  {
    to: AppRoutes.WalletCard,
    label: 'Wallet card',
    description: 'A pocket-sized emergency summary you can print and carry.',
    icon: IdentificationIcon,
  },
  {
    to: AppRoutes.GrowthCharts,
    label: 'Growth charts',
    description: 'Plot height, weight and BMI against reference percentiles.',
    icon: PresentationChartLineIcon,
  },
  {
    to: AppRoutes.Trackers,
    label: 'Trackers',
    description: 'Log symptoms, vitals, mood, sleep and activity yourself.',
    icon: ChartBarIcon,
  },
  {
    to: AppRoutes.RecordExport,
    label: 'Export',
    description: 'Download every record this app holds as a single file.',
    icon: ArrowDownTrayIcon,
  },
  {
    to: AppRoutes.Sharing,
    label: 'Sharing',
    description: 'Set up emergency access, caregiver proxies and share grants.',
    icon: ShareIcon,
  },
  {
    to: AppRoutes.AuditLog,
    label: 'Audit log',
    description: 'Review what was exported, shared or changed, and when.',
    icon: ClockIcon,
  },
];

/** The tool whose page is currently open, if the path matches one. */
export function findActiveTool(pathname: string): UtilityTool | undefined {
  const current = pathname.replace(/\/+$/, '') || '/';
  return UTILITY_TOOLS.find((tool) => {
    const target = tool.to.replace(/\/+$/, '');
    return current === target || current.startsWith(`${target}/`);
  });
}
