import { OptometryRecord } from '../types';

export function OcularRecordsPanel({
  records,
}: {
  records: OptometryRecord[];
}) {
  const timeline = records.filter(
    (record) =>
      !['prescription', 'refraction', 'visualAcuity', 'iop'].includes(
        record.kind,
      ),
  );

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-base font-semibold text-gray-900">
        Ocular conditions, procedures, and documents
      </h2>
      {timeline.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {timeline.slice(0, 12).map((record) => (
            <article key={record.id} className="rounded-md bg-gray-50 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  {record.title}
                </h3>
                <span className="text-xs font-medium uppercase text-gray-500">
                  {record.kind}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {[record.date?.split('T')[0], record.laterality]
                  .filter(Boolean)
                  .join(' · ') || 'No date or laterality'}
              </p>
              {record.summary && (
                <p className="mt-2 line-clamp-2 text-sm text-gray-700">
                  {record.summary}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Ocular diagnoses, procedures, referrals, forms, and optical retail
          records will appear here when synced or added.
        </p>
      )}
    </section>
  );
}
