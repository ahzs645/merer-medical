import { OptometryRecord } from '../types';

export function OptometryCheckupHistoryPanel({
  records,
}: {
  records: OptometryRecord[];
}) {
  const checkups = records
    .filter((record) => record.kind === 'checkup')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Checkup history
          </h2>
          <p className="text-sm text-gray-600">
            Comprehensive eye exams, annual visits, contact lens reviews, and
            recall history.
          </p>
        </div>
        <span className="text-sm font-medium text-gray-600">
          {checkups.length} visits
        </span>
      </div>
      {checkups.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {checkups.map((record) => (
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
          Annual eye exams and optometry checkups will appear here when synced
          or added.
        </p>
      )}
    </section>
  );
}
