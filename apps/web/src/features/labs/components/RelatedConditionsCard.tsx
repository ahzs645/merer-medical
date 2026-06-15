import { Link } from 'react-router-dom';
import { Squares2X2Icon } from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../../Routes';

export type RelatedConditionLink = {
  id: string;
  name: string;
  status: 'active' | 'resolved' | 'unknown';
};

/**
 * Shows which conditions this lab helps monitor, giving the otherwise
 * one-directional Conditions -> labs association a way back. Renders nothing
 * when no condition references this lab.
 */
export function RelatedConditionsCard({
  conditions,
}: {
  conditions: RelatedConditionLink[];
}) {
  if (conditions.length === 0) return null;

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
        <Squares2X2Icon className="h-5 w-5 text-primary-700" />
        Related conditions
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Conditions this lab is commonly used to monitor.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {conditions.map((condition) => (
          <Link
            key={condition.id}
            to={`${AppRoutes.Conditions}/${encodeURIComponent(condition.id)}`}
            className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 ring-1 ring-inset ring-primary-600/10 hover:bg-primary-100"
          >
            {condition.name}
            {condition.status === 'resolved' && (
              <span className="text-xs text-gray-500">(resolved)</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
