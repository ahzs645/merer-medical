import {
  EYE_METRIC_FIELDS,
  OPTOMETRY_MODEL_CARDS,
  OPTOMETRY_REFERENCES,
} from '../utils/optometryReferenceData';

export function OptometryFieldModelPanel() {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-base font-semibold text-gray-900">
          Eye-care data model
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {OPTOMETRY_MODEL_CARDS.map((card) => (
            <div key={card.title} className="rounded-md bg-gray-50 p-3">
              <h3 className="text-sm font-semibold text-gray-900">
                {card.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-gray-700">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-base font-semibold text-gray-900">References</h2>
        <div className="mt-3 grid gap-2">
          {OPTOMETRY_REFERENCES.map((reference) => (
            <a
              key={reference.url}
              href={reference.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-gray-50 p-2 text-sm font-medium text-primary-700 hover:text-primary-900"
            >
              {reference.label}
            </a>
          ))}
        </div>
      </div>
      <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 xl:col-span-2">
        <h2 className="text-base font-semibold text-gray-900">
          Field types to preserve
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4">Field</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Unit</th>
                <th className="py-2 pr-4">Eye</th>
                <th className="py-2 pr-4">FHIR</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {EYE_METRIC_FIELDS.map((field) => (
                <tr key={field.key}>
                  <td className="py-2 pr-4 font-medium text-gray-900">
                    {field.label}
                  </td>
                  <td className="py-2 pr-4">{field.type}</td>
                  <td className="py-2 pr-4">{field.unit || '-'}</td>
                  <td className="py-2 pr-4">
                    {field.appliesTo?.join('/') || '-'}
                  </td>
                  <td className="py-2 pr-4">{field.fhirResource}</td>
                  <td className="max-w-md py-2 leading-6">{field.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
