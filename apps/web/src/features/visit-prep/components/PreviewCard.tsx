import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

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
  visitPurpose,
  patientName,
  packetOptions,
}: {
  previewMode: 'packet' | 'file';
  setPreviewMode: (mode: 'packet' | 'file') => void;
  previewFile: PreviewFile | null;
  handlePreviewFile: (file: File | undefined) => void;
  packet: PacketSections;
  questions: string;
  visitPurpose: string;
  patientName: string;
  packetOptions: PacketOptions;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useInterfaceLanguage();
  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MagnifyingGlassIcon className="h-5 w-5 text-primary-700" />
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {t('Preview (optional)')}
            </h2>
            <p className="text-sm text-gray-600">
              {t(
                'Review your summary when you are ready. You can also check a file from this device.',
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="visit-preview-panel"
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex min-h-[44px] items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          {isOpen ? t('Hide preview') : t('Show preview')}
        </button>
      </div>
      <div id="visit-preview-panel" hidden={!isOpen}>
        {isOpen && (
          <>
            <div
              className="mt-4 flex flex-wrap items-center gap-2"
              role="group"
              aria-label={t('Preview type')}
            >
              <button
                type="button"
                onClick={() => setPreviewMode('packet')}
                aria-pressed={previewMode === 'packet'}
                className={`min-h-[44px] rounded-md px-3 py-2 text-sm font-semibold ${
                  previewMode === 'packet'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('Packet preview')}
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('file')}
                aria-pressed={previewMode === 'file'}
                className={`min-h-[44px] rounded-md px-3 py-2 text-sm font-semibold ${
                  previewMode === 'file'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('File preview')}
              </button>
            </div>

            {previewMode === 'packet' ? (
              <div className="mt-4 overflow-hidden rounded-md border border-gray-200">
                <iframe
                  title="Visit prep packet preview"
                  sandbox=""
                  srcDoc={buildPacketHtml({
                    packet,
                    questions,
                    visitPurpose,
                    patientName,
                    generatedAt: new Date(),
                    options: packetOptions,
                  })}
                  className="h-[min(520px,65dvh)] w-full bg-white"
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
                      onChange={(event) =>
                        handlePreviewFile(event.target.files?.[0])
                      }
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
          </>
        )}
      </div>
    </section>
  );
}
