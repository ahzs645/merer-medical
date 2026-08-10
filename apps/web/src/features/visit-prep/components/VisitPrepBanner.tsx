import {
  DocumentArrowDownIcon,
  DocumentTextIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

export function VisitPrepBanner({
  downloadMarkdownPacket,
  downloadHtmlPacket,
}: {
  downloadMarkdownPacket: () => void;
  downloadHtmlPacket: () => void;
}) {
  return (
    <div className="bg-primary-800 px-3 py-4 text-white sm:px-6 sm:py-6 lg:px-8 print:hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Visit prep and provider packet
          </h1>
          <p className="mt-1 text-sm text-primary-100">
            A printable summary and a visit-sized copy of your records, built
            from what is stored on this device.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary-700 shadow-sm ring-1 ring-inset ring-primary-100 hover:bg-primary-50"
            onClick={downloadMarkdownPacket}
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Markdown
          </button>
          <button
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary-700 shadow-sm ring-1 ring-inset ring-primary-100 hover:bg-primary-50"
            onClick={downloadHtmlPacket}
          >
            <DocumentTextIcon className="h-5 w-5" />
            HTML
          </button>
          <button
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary-700 shadow-sm ring-1 ring-inset ring-primary-100 hover:bg-primary-50"
            onClick={() => window.print()}
          >
            <PrinterIcon className="h-5 w-5" />
            Print / PDF
          </button>
        </div>
      </div>
    </div>
  );
}
