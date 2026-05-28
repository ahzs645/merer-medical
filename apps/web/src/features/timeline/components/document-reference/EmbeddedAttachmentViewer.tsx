import { useEffect, useState } from 'react';
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
    } else if (contentType.includes('application/pdf') && typeof raw === 'string') {
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
      <div className="h-[600px] w-full p-4">
        <iframe
          src={pdfUrl}
          className="h-full w-full border-0"
          title={attachment?.title || 'PDF Document'}
        />
      </div>
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
