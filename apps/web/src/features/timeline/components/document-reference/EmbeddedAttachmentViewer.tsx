import { useEffect, useState } from 'react';
import {
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import DOMPurify from 'dompurify';
import parse from 'html-react-parser';

import {
  AttachmentContent,
  attachmentMimeType,
  createAttachmentBlob,
  formatJsonAttachment,
  hasAttachmentContent,
  isJsonAttachment,
  readAttachmentText,
} from '../../../../shared/utils/attachmentContent';
import { CCDAStructureDefinitionKeys2_1 } from './CCDAStructureDefinitionKeys2_1';
import { DisplayCCDADocument } from './DisplayCCDADocument';
import { checkIfXmlIsCCDA } from './ShowDocumentReferenceAttachmentExpandable';
import { parseCCDA } from './parseCCDA/parseCCDA';

export type EmbeddedAttachment = AttachmentContent & {
  title?: string;
};

type AttachmentPreview =
  | { kind: 'loading' | 'missing' | 'unsupported' | 'error' }
  | { kind: 'text'; text: string; invalidJson?: boolean }
  | { kind: 'pdf' | 'image'; url: string }
  | { kind: 'html'; html: ReturnType<typeof parse> }
  | {
      kind: 'ccda';
      ccda: Partial<
        Record<CCDAStructureDefinitionKeys2_1, string | JSX.Element>
      >;
    };

export function EmbeddedAttachmentViewer({
  attachment,
  matchedChunks,
}: {
  attachment?: EmbeddedAttachment;
  matchedChunks?: { id: string; metadata?: any }[];
}) {
  const [preview, setPreview] = useState<AttachmentPreview>({
    kind: 'loading',
  });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;
    setPreview({ kind: 'loading' });

    async function loadPreview() {
      if (!hasAttachmentContent(attachment?.raw)) {
        setPreview({ kind: 'missing' });
        return;
      }
      const contentType = attachmentMimeType(attachment?.contentType);
      try {
        if (
          contentType === 'application/pdf' ||
          contentType.startsWith('image/')
        ) {
          const blob = createAttachmentBlob(attachment || {});
          if (!blob) return;
          objectUrl = URL.createObjectURL(blob);
          setPreview({
            kind: contentType === 'application/pdf' ? 'pdf' : 'image',
            url: objectUrl,
          });
          return;
        }

        const isXml =
          contentType === 'application/xml' || contentType.endsWith('+xml');
        if (
          !isJsonAttachment(contentType) &&
          !isXml &&
          !contentType.startsWith('text/')
        ) {
          setPreview({ kind: 'unsupported' });
          return;
        }

        const text = await readAttachmentText(attachment || {});
        if (cancelled) return;
        if (text === undefined) {
          setPreview({ kind: 'missing' });
        } else if (isJsonAttachment(contentType)) {
          const formatted = formatJsonAttachment(text);
          setPreview({
            kind: 'text',
            text: formatted.text,
            invalidJson: !formatted.valid,
          });
        } else if (
          (isXml || contentType === 'text/xml') &&
          checkIfXmlIsCCDA(text)
        ) {
          setPreview({ kind: 'ccda', ccda: parseCCDA(text) });
        } else if (contentType === 'text/html') {
          setPreview({ kind: 'html', html: parse(DOMPurify.sanitize(text)) });
        } else {
          setPreview({ kind: 'text', text });
        }
      } catch {
        if (!cancelled) setPreview({ kind: 'error' });
      }
    }
    void loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment?.contentType, attachment?.raw, attachment?.encoding]);

  if (preview.kind === 'loading') {
    return <p className="text-md p-4 text-gray-900">Loading...</p>;
  }

  if (preview.kind === 'ccda') {
    return (
      <div className="text-md min-w-0 max-w-full overflow-x-auto p-4 text-gray-900">
        <DisplayCCDADocument
          ccda={preview.ccda}
          matchedChunks={matchedChunks}
        />
      </div>
    );
  }

  if (preview.kind === 'pdf') {
    return (
      <EmbeddedPdf
        url={preview.url}
        title={attachment?.title || 'PDF Document'}
      />
    );
  }

  if (preview.kind === 'image') {
    return (
      <div className="flex max-h-[700px] min-w-0 max-w-full justify-center overflow-auto p-4">
        <img
          src={preview.url}
          alt={attachment?.title || 'Linked image'}
          className="max-h-[660px] max-w-full object-contain"
        />
      </div>
    );
  }

  if (preview.kind === 'html') {
    return (
      <div className="prose prose-sm min-w-0 max-w-full overflow-x-auto break-words p-4 [overflow-wrap:anywhere]">
        {preview.html}
      </div>
    );
  }

  if (preview.kind === 'text') {
    return (
      <div className="min-w-0 max-w-full">
        {preview.invalidJson && (
          <p className="px-4 pt-4 text-sm text-gray-700">
            This JSON could not be formatted. Showing its original text.
          </p>
        )}
        <pre className="max-h-[600px] min-w-0 max-w-full overflow-auto whitespace-pre-wrap break-words p-4 text-sm text-gray-900 [overflow-wrap:anywhere]">
          {preview.text}
        </pre>
      </div>
    );
  }

  return (
    <p className="text-md break-words p-4 text-gray-900 [overflow-wrap:anywhere]">
      {preview.kind === 'missing'
        ? 'This record has no embedded file to preview.'
        : preview.kind === 'unsupported'
          ? `This file is stored, but a preview is not available for ${attachmentMimeType(attachment?.contentType) || 'this file type'}.`
          : 'This file is stored, but its contents could not be read for preview.'}
    </p>
  );
}

/**
 * A PDF, offered rather than embedded.
 *
 * The browser's own PDF plugin fits a document to its frame once, when the
 * frame loads, and never fits again. Embedded in the document page's sidebar
 * — a five-of-twelve grid track, about 325px — it settled on a zoom that drew
 * a twelve-page screening letter as an unreadable ribbon down the left of the
 * card, which at a glance read as an empty document rather than a broken
 * viewer. Nothing available from here moves it: widening the frame afterwards,
 * remounting it at a settled width, waiting for it to be scrolled into view,
 * a `#view=FitH` fragment, absolute positioning, a full-screen overlay. The
 * same bytes render perfectly when the frame is the whole window, and on a
 * phone the plugin misreads the viewport scale on top of everything else.
 *
 * So the card says what the file is and opens it in its own tab, where the
 * viewer works — with the scroll, search, zoom and print the plugin only
 * offers at that size. Nothing was legible here before the click.
 */
function EmbeddedPdf({ url, title }: { url: string; title: string }) {
  return (
    <div className="min-w-0 max-w-full p-4">
      <button
        type="button"
        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
        className="flex min-h-[44px] w-full min-w-0 items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-start hover:bg-gray-100"
      >
        <DocumentTextIcon className="h-8 w-8 shrink-0 text-gray-500" />
        <span className="min-w-0 flex-1">
          <span className="block whitespace-normal break-words text-sm font-semibold text-gray-900 [overflow-wrap:anywhere]">
            {title}
          </span>
          <span className="block text-xs text-gray-600">
            PDF · opens in a new tab
          </span>
        </span>
        <ArrowTopRightOnSquareIcon
          className="h-5 w-5 shrink-0 text-gray-500"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
