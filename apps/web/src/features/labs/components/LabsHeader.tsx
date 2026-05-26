import { BeakerIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export function LabsHeader({
  labCount,
  groupCount,
  query,
  setQuery,
  hideSearch = false,
}: {
  labCount: number;
  groupCount: number;
  query: string;
  setQuery: (query: string) => void;
  hideSearch?: boolean;
}) {
  return (
    <div className="bg-primary-800 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-100">
            <BeakerIcon className="h-5 w-5" />
            Labs
          </div>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            All lab results
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-blue-50">
            {labCount} results grouped into {groupCount} lab types across your
            connected records.
          </p>
        </div>
        {!hideSearch ? (
          <label className="relative block w-full md:max-w-sm">
            <span className="sr-only">Search labs</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary-500"
              placeholder="Search lab name or code"
              type="search"
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}
