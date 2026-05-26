import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export function LabsHeader({
  query,
  setQuery,
  hideSearch = false,
  hideOnMobile = false,
}: {
  query: string;
  setQuery: (query: string) => void;
  hideSearch?: boolean;
  hideOnMobile?: boolean;
}) {
  return (
    <div
      className={`bg-primary-800 px-3 py-4 text-white sm:px-6 sm:py-6 lg:px-8 ${
        hideOnMobile ? 'hidden md:block' : ''
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">All lab results</h1>
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
