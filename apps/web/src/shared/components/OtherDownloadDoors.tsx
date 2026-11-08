import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../Routes';

/**
 * Three pages produce a file of your records, and none of them mentioned the
 * other two.
 *
 * Sharing offers a full-record or visit-specific package; Visit prep builds
 * the visit-sized one; Export writes a printable summary or a FHIR bundle.
 * Sharing's "visit-specific package" is the thing Visit prep exists for, both
 * offer the same three checkboxes, and Export says "complete record" for what
 * Sharing calls "full record" — so a reader who wants their records out has
 * three doors, no way to tell them apart, and no sign the others exist.
 *
 * Rather than collapse three working features into one, this states the
 * difference in one place and links across, so the answer cannot drift page by
 * page. Each page names itself in `from`, and gets the other two.
 */
type Door = 'export' | 'sharing' | 'visit-prep';

const DOORS: Record<Door, { to: string; label: string; what: string }> = {
  export: {
    to: AppRoutes.RecordExport,
    label: 'Export records',
    what: 'a printable summary, or a FHIR bundle another app can read',
  },
  sharing: {
    to: AppRoutes.Sharing,
    label: 'Sharing',
    what: 'a package of everything on this device, profile and connections included',
  },
  'visit-prep': {
    to: AppRoutes.VisitPrep,
    label: 'Visit prep',
    what: 'a visit-sized packet for one appointment',
  },
};

export function OtherDownloadDoors({ from }: { from: Door }) {
  const others = (Object.keys(DOORS) as Door[]).filter((key) => key !== from);

  return (
    <div className="mt-3 text-sm text-gray-700">
      <p>Other ways to take your records with you:</p>
      <ul className="mt-2 space-y-2">
        {others.map((key) => (
          <li key={key}>
            <Link
              to={DOORS[key].to}
              className="flex min-h-[44px] items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 text-primary-800 hover:bg-primary-50"
            >
              <span className="min-w-0">
                <span className="block font-semibold">{DOORS[key].label}</span>
                <span className="block text-xs text-gray-600">
                  {DOORS[key].what}
                </span>
              </span>
              <ChevronRightIcon
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
