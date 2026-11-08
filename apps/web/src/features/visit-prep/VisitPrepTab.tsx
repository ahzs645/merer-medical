import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '../../app/providers/UserProvider';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { AppPage } from '../../shared/components/AppPage';
import { RecordHeaderButton } from '../../shared/components/records/RecordPageHeader';
import {
  DocumentArrowDownIcon,
  DocumentTextIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { PacketContentsCard } from './components/PacketContentsCard';
import { PreviewCard } from './components/PreviewCard';
import { ProviderPacketCard } from './components/ProviderPacketCard';
import { RecordPackageCard } from './components/RecordPackageCard';
import { VisitPrepBanner } from './components/VisitPrepBanner';
import { VisitQuestionsCard } from './components/VisitQuestionsCard';
import { useFilePreview } from './hooks/useFilePreview';
import { usePacketOptions } from './hooks/usePacketOptions';
import { useRecordPackageExport } from './hooks/useRecordPackageExport';
import { useVisitPrepPacket } from './hooks/useVisitPrepPacket';
import { useVisitQuestions } from './hooks/useVisitQuestions';
import {
  buildPacketHtml,
  buildPacketMarkdown,
  downloadBlob,
  filenameDate,
} from './utils/packetExport';

export function VisitPrepTab() {
  const user = useUser();
  const { t } = useInterfaceLanguage();
  const { packet, status } = useVisitPrepPacket();
  const { packetOptions, updatePacketOption } = usePacketOptions();
  const {
    questions,
    visitPurpose,
    updateVisitPurpose,
    questionsSavedAt,
    questionsSaveStatus,
    saveQuestions,
    updateQuestions,
  } = useVisitQuestions();
  const recordPackageExport = useRecordPackageExport();
  const { previewMode, setPreviewMode, previewFile, handlePreviewFile } =
    useFilePreview();

  useEffect(() => {
    // Printing must not inherit the app shell's fixed height or nested scroll
    // clipping. The packet portal has a normal document flow for pagination.
    document.documentElement.classList.add('visit-prep-print-view');
    return () =>
      document.documentElement.classList.remove('visit-prep-print-view');
  }, []);

  const patientName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(' ');

  function downloadMarkdownPacket() {
    if (status !== 'success') return;
    const packetText = buildPacketMarkdown({
      packet,
      questions,
      visitPurpose,
      patientName,
      generatedAt: new Date(),
      options: packetOptions,
    });
    downloadBlob(
      new Blob([packetText], { type: 'text/markdown;charset=utf-8' }),
      `visit-prep-${filenameDate(new Date())}.md`,
    );
  }

  function downloadHtmlPacket() {
    if (status !== 'success') return;
    const html = buildPacketHtml({
      packet,
      questions,
      visitPurpose,
      patientName,
      generatedAt: new Date(),
      options: packetOptions,
    });
    downloadBlob(
      new Blob([html], { type: 'text/html;charset=utf-8' }),
      `visit-prep-${filenameDate(new Date())}.html`,
    );
  }

  return (
    <AppPage banner={<VisitPrepBanner />} allowHeaderScroll>
      <div className="h-full overflow-y-auto bg-gray-50 print:h-auto print:overflow-visible print:bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
          <VisitQuestionsCard
            visitPurpose={visitPurpose}
            updateVisitPurpose={updateVisitPurpose}
            questions={questions}
            updateQuestions={updateQuestions}
            questionsSavedAt={questionsSavedAt}
            questionsSaveStatus={questionsSaveStatus}
            saveQuestions={saveQuestions}
            includeQuestions={packetOptions.includeQuestions}
          />

          <section className="print:hidden">
            <PacketContentsCard
              packetOptions={packetOptions}
              updatePacketOption={updatePacketOption}
            />
          </section>

          {status === 'success' ? (
            <PreviewCard
              previewMode={previewMode}
              setPreviewMode={setPreviewMode}
              previewFile={previewFile}
              handlePreviewFile={handlePreviewFile}
              packet={packet}
              questions={questions}
              visitPurpose={visitPurpose}
              patientName={patientName}
              packetOptions={packetOptions}
            />
          ) : (
            <p
              role={status === 'error' ? 'alert' : 'status'}
              className="rounded-md bg-white p-4 text-sm text-gray-700 print:hidden"
            >
              {status === 'error'
                ? t(
                    'Unable to load records for this profile. Reload the page to try again.',
                  )
                : t('Loading records for this profile…')}
            </p>
          )}

          <section
            className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 print:hidden"
            aria-labelledby="visit-download-heading"
          >
            <h2
              id="visit-download-heading"
              className="text-base font-semibold text-gray-900"
            >
              {t('Download or print your summary')}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {t(
                'The summary uses your current notes and selected sections. Downloading does not send it to anyone.',
              )}
            </p>
            <fieldset
              className="mt-3 flex flex-wrap gap-2 disabled:opacity-50"
              disabled={status !== 'success'}
            >
              <legend className="sr-only">{t('Summary format')}</legend>
              <RecordHeaderButton
                onClick={downloadHtmlPacket}
                label={t('Download HTML')}
                icon={DocumentTextIcon}
              />
              <RecordHeaderButton
                onClick={downloadMarkdownPacket}
                label={t('Download Markdown')}
                icon={DocumentArrowDownIcon}
              />
              <RecordHeaderButton
                onClick={() => window.print()}
                label={t('Print / PDF')}
                icon={PrinterIcon}
              />
            </fieldset>
          </section>

          <details className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 print:hidden">
            <summary className="min-h-9 cursor-pointer py-2 text-sm font-semibold text-primary-700">
              {t('Download a record package instead')}
            </summary>
            <div className="mt-2">
              <RecordPackageCard {...recordPackageExport} />
            </div>
          </details>

          {createPortal(
            <div className="visit-prep-print-packet hidden print:block">
              <ProviderPacketCard
                user={user}
                status={status}
                packet={packet}
                packetOptions={packetOptions}
                questions={questions}
                visitPurpose={visitPurpose}
              />
            </div>,
            document.body,
          )}
        </div>
      </div>
    </AppPage>
  );
}
