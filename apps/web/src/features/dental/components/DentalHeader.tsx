import { FaceSmileIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { Routes as AppRoutes } from '../../../Routes';

export function DentalHeader({
  recordCount,
  imageCount,
}: {
  recordCount: number;
  imageCount: number;
}) {
  return (
    <div className="bg-primary-700 px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FaceSmileIcon className="h-7 w-7" />
            <h1 className="text-2xl font-semibold">Dental</h1>
          </div>
          <p className="mt-1 text-sm text-primary-100">
            {recordCount} dental records · {imageCount} dental images or scans
          </p>
        </div>
        <Link
          to={AppRoutes.AddRecord}
          className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-primary-800 shadow-sm hover:bg-primary-50"
        >
          <PlusIcon className="h-5 w-5" />
          Add dental record
        </Link>
      </div>
    </div>
  );
}
