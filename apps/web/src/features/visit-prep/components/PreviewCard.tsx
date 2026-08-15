import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { PacketOptions, PacketSections, PreviewFile } from '../types';
import { formatFileSize } from '../utils/filePreview';
import { buildPacketHtml } from '../utils/packetExport';
import { FilePreviewPane } from './FilePreviewPane';

export function PreviewCard({
  previewMode,
  setPreviewMode,
  previewFile,
  handlePreviewFile,
  packet,
  questions,
  patientName,
  packetOptions,
}: {
  previewMode: 'packet' | 'file';
  setPreviewMode: (mode: 'packet' | 'file') => void;
  previewFile: PreviewFile | null;
  handlePreviewFile: (file: File | undefined) => void;
  packet: PacketSections;
  questions: string;
  patientName: string;
  packetOptions: PacketOptions;
}) {
  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MagnifyingGlassIcon className="h-5 w-5 text-primary-700" />
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Preview before you share
            </h2>
            <p className="text-sm text-gray-600">
              See exactly what your packet looks like, or open a PDF, image, or
              text file from this device to check it first.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewMode('packet')}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              previewMode === 'packet'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
            }`}
          >
            Packet preview
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('file')}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              previewMode === 'file'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
            }`}
          >
            File preview
          </button>
        </div>
      </div>

      {previewMode === 'packet' ? (
        <div className="mt-4 overflow-hidden rounded-md border border-gray-200">
          <iframe
            title="Visit prep packet preview"
            srcDoc={buildPacketHtml({
              packet,
              questions,
              patientName,
              generatedAt: new Date(),
              options: packetOptions,
            })}
            className="h-[520px] w-full bg-white"
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-md border border-dashed border-gray-300 p-4">
            <label className="block text-sm font-medium text-gray-700">
              Choose a file
              <input
                type="file"
                accept=".pdf,.txt,.md,.csv,.json,image/*,application/pdf,text/*,application/json"
                onChange={(event) => handlePreviewFile(event.target.files?.[0])}
                className="mt-2 block w-full text-sm text-gray-700 file:me-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-700"
              />
            </label>
            {previewFile ? (
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="font-medium text-gray-900">Name</dt>
                  <dd className="break-words text-gray-600">
                    {previewFile.name}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-900">Type</dt>
                  <dd className="text-gray-600">{previewFile.type}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-900">Size</dt>
                  <dd className="text-gray-600">
                    {formatFileSize(previewFile.size)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                Files you open stay on this device. Nothing is uploaded.
              </p>
            )}
          </div>
          <FilePreviewPane file={previewFile} />
        </div>
      )}
    </section>
  );
}
