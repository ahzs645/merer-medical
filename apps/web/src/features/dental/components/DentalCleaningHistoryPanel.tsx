import { DentalRecord } from '../types';

export function DentalCleaningHistoryPanel({
  records,
}: {
  records: DentalRecord[];
}) {
  const cleanings = records
    .filter((record) => record.kind === 'cleaning')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Cleaning history
          </h2>
          <p className="text-sm text-gray-600">
            Prophy, periodontal maintenance, scaling/root planing, fluoride, and
            hygiene recall.
          </p>
        </div>
        <span className="text-sm font-medium text-gray-600">
          {cleanings.length} visits
        </span>
      </div>
      {cleanings.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {cleanings.map((record) => (
            <article key={record.id} className="rounded-md bg-gray-50 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  {record.title}
                </h3>
                <span className="text-xs font-medium uppercase text-gray-500">
                  {record.date?.split('T')[0] || 'Undated'}
                </span>
              </div>
              {record.summary && (
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {record.summary}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Dental cleanings and hygiene recalls will appear here when synced or
          added.
        </p>
      )}
    </section>
  );
}
