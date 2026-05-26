import { OptometryRecord } from '../types';

export function EyePrescriptionPanel({
  records,
}: {
  records: OptometryRecord[];
}) {
  const prescriptions = records.filter(
    (record) => record.kind === 'prescription',
  );

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-base font-semibold text-gray-900">
        Eye prescriptions
      </h2>
      {prescriptions.length > 0 ? (
        <div className="mt-3 grid gap-3">
          {prescriptions.map((record) => (
            <article key={record.id} className="rounded-md bg-gray-50 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  {record.title}
                </h3>
                <span className="text-xs font-medium uppercase text-gray-500">
                  VisionPrescription
                </span>
              </div>
              <MetricList metrics={record.metrics} />
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Final glasses and contact lens prescriptions will appear here as
          `VisionPrescription` records.
        </p>
      )}
    </section>
  );
}

function MetricList({
  metrics,
}: {
  metrics: Record<string, string | number | boolean>;
}) {
  const entries = Object.entries(metrics);
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-md bg-white p-2">
          <p className="text-xs uppercase text-gray-500">{key}</p>
          <p className="text-sm font-semibold text-gray-900">{`${value}`}</p>
        </div>
      ))}
    </div>
  );
}
