import { useUser } from '../../app/providers/UserProvider';
import { AppPage } from '../../shared/components/AppPage';
import { PacketContentsCard } from './components/PacketContentsCard';
import { PreviewCard } from './components/PreviewCard';
import { ProviderPacketCard } from './components/ProviderPacketCard';
import { RecordPackageCard } from './components/RecordPackageCard';
import { VisitPrepBanner } from './components/VisitPrepBanner';
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
  const { packet, status } = useVisitPrepPacket();
  const { packetOptions, updatePacketOption } = usePacketOptions();
  const {
    questions,
    questionsSavedAt,
    questionsSaveStatus,
    saveQuestions,
    updateQuestions,
  } = useVisitQuestions();
  const recordPackageExport = useRecordPackageExport();
  const { previewMode, setPreviewMode, previewFile, handlePreviewFile } =
    useFilePreview();

  const patientName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(' ');

  function downloadMarkdownPacket() {
    const packetText = buildPacketMarkdown({
      packet,
      questions,
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
    const html = buildPacketHtml({
      packet,
      questions,
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
    <AppPage
      banner={
        <VisitPrepBanner
          downloadMarkdownPacket={downloadMarkdownPacket}
          downloadHtmlPacket={downloadHtmlPacket}
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50 print:h-auto print:overflow-visible print:bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.65fr)] print:hidden">
            <PacketContentsCard
              packetOptions={packetOptions}
              updatePacketOption={updatePacketOption}
            />
            <RecordPackageCard {...recordPackageExport} />
          </section>

          <PreviewCard
            previewMode={previewMode}
            setPreviewMode={setPreviewMode}
            previewFile={previewFile}
            handlePreviewFile={handlePreviewFile}
            packet={packet}
            questions={questions}
            patientName={patientName}
            packetOptions={packetOptions}
          />

          <ProviderPacketCard
            user={user}
            status={status}
            packet={packet}
            packetOptions={packetOptions}
            questions={questions}
            questionsSavedAt={questionsSavedAt}
            questionsSaveStatus={questionsSaveStatus}
            saveQuestions={saveQuestions}
            updateQuestions={updateQuestions}
          />
        </div>
      </div>
    </AppPage>
  );
}
