import { DocumentTextIcon, PhotoIcon } from '@heroicons/react/24/outline';

import { ImagingItem } from '../types';
import { formatDate } from '../utils/imagingRecords';

export function ImagingItemCard({ item }: { item: ImagingItem }) {
  const Icon = item.type === 'diagnosticreport' ? DocumentTextIcon : PhotoIcon;

  return (
    <article className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary-50 p-2 text-primary-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="break-words text-base font-semibold text-gray-900">
              {item.title}
            </h2>
            <span className="shrink-0 text-sm text-gray-500">
              {formatDate(item.date)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{item.type}</Badge>
            {item.modality && <Badge>{item.modality}</Badge>}
            {item.bodySite && <Badge>{item.bodySite}</Badge>}
            {item.attachmentType && <Badge>{item.attachmentType}</Badge>}
            {item.categories.includes('dental') && <Badge>Dental</Badge>}
          </div>
          {item.summary && (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-700">
              {item.summary}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
      {children}
    </span>
  );
}
