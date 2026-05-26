import { AcademicCapIcon } from '@heroicons/react/24/outline';

export function DentalStarterPanel({ dentalCount }: { dentalCount: number }) {
  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-emerald-50 p-2 text-emerald-700">
          <AcademicCapIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Dental workspace starter
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-700">
            {dentalCount > 0
              ? `${dentalCount} records look dental-related based on oral health terms, body sites, and imaging labels.`
              : 'Dental records will appear here when reports, X-rays, CBCT scans, or intraoral images include dental/oral terms.'}
          </p>
          <div className="mt-3 grid gap-2 text-sm text-gray-700 md:grid-cols-3">
            <span className="rounded-md bg-gray-50 p-2">
              Panoramic and bitewing X-rays
            </span>
            <span className="rounded-md bg-gray-50 p-2">
              CBCT and DICOM studies
            </span>
            <span className="rounded-md bg-gray-50 p-2">
              Odontogram-ready findings
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
