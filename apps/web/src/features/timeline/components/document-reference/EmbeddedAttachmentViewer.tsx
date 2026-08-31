import { useEffect, useState } from 'react';
import {
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import DOMPurify from 'dompurify';
import parse from 'html-react-parser';

import { CCDAStructureDefinitionKeys2_1 } from './CCDAStructureDefinitionKeys2_1';
import { DisplayCCDADocument } from './DisplayCCDADocument';
import { checkIfXmlIsCCDA } from './ShowDocumentReferenceAttachmentExpandable';
import { parseCCDA } from './parseCCDA/parseCCDA';

export type EmbeddedAttachment = {
  contentType?: string;
  raw?: unknown;
  title?: string;
};

export function EmbeddedAttachmentViewer({
  attachment,
  matchedChunks,
}: {
  attachment?: EmbeddedAttachment;
  matchedChunks?: { id: string; metadata?: any }[];
}) {
  const [ccda, setCCDA] = useState<
    | Partial<Record<CCDAStructureDefinitionKeys2_1, string | JSX.Element>>
    | undefined
  >(undefined);
  const [hasLoadedDocument, setHasLoadedDocument] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [textContent, setTextContent] = useState<string | undefined>(undefined);
  const [html, setHtml] = useState<
    string | JSX.Element | JSX.Element[] | undefined
  >(undefined);

  useEffect(() => {
    setCCDA(undefined);
    setHasLoadedDocument(false);
    setPdfUrl(undefined);
    setImageUrl(undefined);
    setTextContent(undefined);
    setHtml(undefined);

    const contentType = attachment?.contentType || '';
    const raw = attachment?.raw;

    if (contentType.includes('application/xml') && typeof raw === 'string') {
      if (checkIfXmlIsCCDA(raw)) {
        setCCDA(parseCCDA(raw));
      } else {
        setTextContent(raw);
      }
      setHasLoadedDocument(true);
    } else if (
      contentType.includes('application/pdf') &&
      typeof raw === 'string'
    ) {
      const url = createBlobUrlFromBase64(raw, contentType);
      setPdfUrl(url);
      setHasLoadedDocument(true);
    } else if (contentType.startsWith('image/') && typeof raw === 'string') {
      const url = createBlobUrlFromBase64(raw, contentType);
      setImageUrl(url);
      setHasLoadedDocument(true);
    } else if (contentType.includes('text/html') && typeof raw === 'string') {
      setHtml(parse(DOMPurify.sanitize(raw)));
      setHasLoadedDocument(true);
    } else if (contentType.startsWith('text/') && typeof raw === 'string') {
      setTextContent(raw);
      setHasLoadedDocument(true);
    } else {
      setHasLoadedDocument(true);
    }

    return () => {
      setPdfUrl((url) => {
        if (url) URL.revokeObjectURL(url);
        return undefined;
      });
      setImageUrl((url) => {
        if (url) URL.revokeObjectURL(url);
        return undefined;
      });
    };
  }, [attachment?.contentType, attachment?.raw]);

  if (!hasLoadedDocument) {
    return <p className="text-md p-4 text-gray-900">Loading...</p>;
  }

  if (ccda) {
    return (
      <div className="text-md whitespace-wrap overflow-x-scroll p-4 text-gray-900">
        <DisplayCCDADocument ccda={ccda} matchedChunks={matchedChunks} />
      </div>
    );
  }

  if (pdfUrl) {
    return (
      <EmbeddedPdf url={pdfUrl} title={attachment?.title || 'PDF Document'} />
    );
  }

  if (imageUrl) {
    return (
      <div className="flex max-h-[700px] justify-center overflow-auto p-4">
        <img
          src={imageUrl}
          alt={attachment?.title || 'Linked image'}
          className="max-h-[660px] max-w-full object-contain"
        />
      </div>
    );
  }

  if (html) {
    return <div className="prose prose-sm overflow-x-auto p-4">{html}</div>;
  }

  if (textContent) {
    return (
      <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap p-4 text-sm text-gray-900">
        {textContent}
      </pre>
    );
  }

  return (
    <p className="text-md p-4 text-gray-900">
      Sorry, looks like we were unable to get the linked document
    </p>
  );
}

function createBlobUrlFromBase64(base64: string, contentType: string): string {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: contentType });
  return URL.createObjectURL(blob);
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
    <div className="p-4">
      <button
        type="button"
        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
        className="flex w-full items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-start hover:bg-gray-100"
      >
        <DocumentTextIcon className="h-8 w-8 shrink-0 text-gray-500" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900">
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
