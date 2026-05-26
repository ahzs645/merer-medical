import { Link } from 'react-router-dom';

import { Routes as AppRoutes } from '../../../Routes';
import { ImagingItem } from '../../imaging/types';

export function DentalImagingPanel({ items }: { items: ImagingItem[] }) {
  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Dental imaging
          </h2>
          <p className="text-sm text-gray-600">
            Dental X-rays, CBCT, intraoral photos, and scans remain connected to
            the Imaging workspace.
          </p>
        </div>
        <Link
          to={AppRoutes.Imaging}
          className="text-sm font-medium text-primary-700 hover:text-primary-900"
        >
          Open imaging
        </Link>
      </div>
      {items.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {items.slice(0, 6).map((item) => (
            <div key={item.id} className="rounded-md bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">
                {item.title}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                {[item.modality, item.bodySite, item.attachmentType]
                  .filter(Boolean)
                  .join(' · ') || item.type}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          No dental imaging has been detected yet. The dental workspace will
          pull from imaging records tagged by oral/dental terms.
        </p>
      )}
    </section>
  );
}
