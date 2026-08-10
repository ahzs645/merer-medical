import {
  DocumentArrowDownIcon,
  DocumentTextIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

import {
  RecordHeaderButton,
  RecordPageHeader,
} from '../../../shared/components/records/RecordPageHeader';

export function VisitPrepBanner({
  downloadMarkdownPacket,
  downloadHtmlPacket,
}: {
  downloadMarkdownPacket: () => void;
  downloadHtmlPacket: () => void;
}) {
  return (
    <RecordPageHeader
      title="Visit prep and provider packet"
      description="A printable summary and a visit-sized copy of your records, built from what is stored on this device."
      action={
        <>
          <RecordHeaderButton
            onClick={downloadMarkdownPacket}
            label="Markdown"
            icon={DocumentArrowDownIcon}
          />
          <RecordHeaderButton
            onClick={downloadHtmlPacket}
            label="HTML"
            icon={DocumentTextIcon}
          />
          <RecordHeaderButton
            onClick={() => window.print()}
            label="Print / PDF"
            icon={PrinterIcon}
          />
        </>
      }
      className="print:hidden"
    />
  );
}
