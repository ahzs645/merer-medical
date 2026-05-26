import { TOOTH_SURFACES } from '../utils/dentalReferenceData';

const modelCards = [
  {
    title: 'Findings',
    body: 'Use Observation for tooth-specific findings, odontogram state, periodontal measurements, TMJ/TMD, occlusion, and soft-tissue exams.',
  },
  {
    title: 'Conditions',
    body: 'Use Condition for diagnosed dental problems such as caries, periodontal disease, abscesses, and bruxism.',
  },
  {
    title: 'Procedures',
    body: 'Use Procedure for completed treatment and ServiceRequest for planned treatment, referrals, and imaging orders.',
  },
  {
    title: 'Dental imaging',
    body: 'Use DiagnosticReport and ImagingStudy for DICOM/CBCT metadata, and DocumentReference for image files, PDFs, STL, PLY, and OBJ scans.',
  },
];

export function DentalModelingPanel() {
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-base font-semibold text-gray-900">
          Data input model
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {modelCards.map((card) => (
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
        <h2 className="text-base font-semibold text-gray-900">
          Tooth surfaces
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {TOOTH_SURFACES.map((surface) => (
            <div key={surface.code} className="rounded-md bg-gray-50 p-2">
              <p className="text-sm font-semibold text-gray-900">
                {surface.code} · {surface.label}
              </p>
              <p className="text-xs text-gray-600">{surface.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
