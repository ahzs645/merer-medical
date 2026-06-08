import {
  BeakerIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

type Stat = {
  label: string;
  value: number;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tint: string;
};

export function ImmunizationSummaryPanel({
  counts,
}: {
  counts: {
    total: number;
    vaccineTypes: number;
    boostersTracked: number;
  };
}) {
  const { t } = useInterfaceLanguage();
  const stats: Stat[] = [
    {
      label: 'Total doses',
      value: counts.total,
      icon: BeakerIcon,
      tint: 'bg-primary-50 text-primary-700',
    },
    {
      label: 'Vaccine types',
      value: counts.vaccineTypes,
      icon: Squares2X2Icon,
      tint: 'bg-indigo-50 text-indigo-700',
    },
    {
      label: 'Boosters tracked',
      value: counts.boostersTracked,
      icon: ShieldCheckIcon,
      tint: 'bg-emerald-50 text-emerald-700',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 sm:p-4"
          >
            <span
              className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:flex ${stat.tint}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-semibold leading-none text-gray-900 sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 truncate text-xs font-medium text-gray-500 sm:text-sm">
                {t(stat.label)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
