import {
  ArchiveBoxIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/20/solid';
import type { ComponentType, SVGProps } from 'react';

import { ImmunizationRecommendation } from '../types';

type RecommendationStatus = ImmunizationRecommendation['status'];

export type RecommendationStatusMeta = {
  /** Short, human-readable label (shown alongside the icon, never colour alone). */
  label: string;
  /** Icon paired with the label so status is conveyed without relying on colour. */
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Pill styling (background + text + ring). */
  badge: string;
  /** Left-border accent used on the card so attention items stand out. */
  accent: string;
  /** Sort weight — lower sorts first so action items lead. */
  order: number;
};

export const recommendationStatusMeta: Record<
  RecommendationStatus,
  RecommendationStatusMeta
> = {
  overdue: {
    label: 'Overdue',
    icon: ExclamationTriangleIcon,
    badge: 'bg-red-50 text-red-700 ring-red-600/20',
    accent: 'border-l-red-500',
    order: 0,
  },
  due: {
    label: 'Due now',
    icon: ClockIcon,
    badge: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    accent: 'border-l-amber-500',
    order: 1,
  },
  upcoming: {
    label: 'Upcoming',
    icon: CalendarDaysIcon,
    badge: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    accent: 'border-l-blue-500',
    order: 2,
  },
  complete: {
    label: 'Up to date',
    icon: CheckCircleIcon,
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    accent: 'border-l-emerald-500',
    order: 3,
  },
  history: {
    label: 'On record',
    icon: ArchiveBoxIcon,
    badge: 'bg-gray-100 text-gray-600 ring-gray-500/20',
    accent: 'border-l-gray-300',
    order: 4,
  },
};

/**
 * How a rule reads when there is nothing to assess it against.
 *
 * A forecast over an empty record set marks every routine vaccine due or
 * overdue, because "no dose on file" and "no dose given" are the same input to
 * it. On a brand-new install that told somebody who may be fully vaccinated
 * that five vaccines needed attention. The rule still belongs on screen — it
 * is the schedule — but as a schedule, not as a finding about this person.
 */
export const notAssessedStatusMeta: RecommendationStatusMeta = {
  label: 'No records yet',
  icon: ArchiveBoxIcon,
  badge: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  accent: 'border-l-gray-300',
  order: 4,
};

export function recommendationStatusOf(
  status: RecommendationStatus,
): RecommendationStatusMeta {
  return (
    recommendationStatusMeta[status] ?? recommendationStatusMeta['history']
  );
}

/** True for statuses the patient should act on (overdue / due). */
export function isActionable(status: RecommendationStatus): boolean {
  return status === 'overdue' || status === 'due';
}
