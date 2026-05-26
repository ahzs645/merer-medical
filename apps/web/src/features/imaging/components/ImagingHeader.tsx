import { MagnifyingGlassIcon, PhotoIcon } from '@heroicons/react/24/outline';

export function ImagingHeader({
  totalCount,
  query,
  setQuery,
}: {
  totalCount: number;
  query: string;
  setQuery: (query: string) => void;
}) {
  return (
    <div className="bg-primary-700 px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PhotoIcon className="h-7 w-7" />
            <h1 className="text-2xl font-semibold">Imaging & Scans</h1>
          </div>
          <p className="mt-1 text-sm text-primary-100">
            {totalCount} imaging records
          </p>
        </div>
        <label className="relative block w-full md:max-w-md">
          <span className="sr-only">Search imaging records</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search scans, reports, modality, body site"
            className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm"
          />
        </label>
      </div>
    </div>
  );
}
