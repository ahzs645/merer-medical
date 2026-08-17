import { Link } from 'react-router-dom';

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
    <p className="mt-3 text-xs text-gray-700">
      Other ways to take your records with you:{' '}
      {others.map((key, index) => (
        <span key={key}>
          {index > 0 && '; '}
          <Link
            to={DOORS[key].to}
            className="text-primary-700 hover:text-primary-900 font-medium underline"
          >
            {DOORS[key].label}
          </Link>{' '}
          gives you {DOORS[key].what}
        </span>
      ))}
      .
    </p>
  );
}
