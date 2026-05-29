import { BundleEntry, DocumentReference } from 'fhir/r2';
import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import parse from 'html-react-parser';
import { ClinicalDocument } from '../../../../models/clinical-document/ClinicalDocument.type';
import { Modal } from '../../../../shared/components/Modal';
import { ModalHeader } from '../../../../shared/components/ModalHeader';
import { useClinicalDoc } from '../../../../shared/hooks/useClinicalDoc';
import { useConnectionDoc } from '../../../connections/hooks/useConnectionDoc';
import { CCDAStructureDefinitionKeys2_1 } from './CCDAStructureDefinitionKeys2_1';
import { DisplayCCDADocument } from './DisplayCCDADocument';
import { parseCCDA } from './parseCCDA/parseCCDA';
import { getFhirResource } from '../../../../shared/utils/fhirResource';

export const LOINC_CODE_SYSTEM = '2.16.840.1.113883.6.1';
export const SNOMED_CT_CODE_SYSTEM = '2.16.840.1.113883.6.96';

function checkIfXmlIsCCDA(xml: string): boolean {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');
    const sections = xmlDoc.getElementsByTagName('ClinicalDocument');
    return sections.length > 0;
  } catch (e) {
    return false;
  }
}

export function ShowDocumentResultsExpandable({
  item,
  expanded,
  setExpanded,
  matchedChunks,
  searchQuery,
}: {
  item: ClinicalDocument<BundleEntry<DocumentReference>>;
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  matchedChunks?: { id: string; metadata?: any }[];
  searchQuery?: string;
}) {
  const cd = useConnectionDoc(item.connection_record_id),
    [ccda, setCCDA] = useState<
      | Partial<Record<CCDAStructureDefinitionKeys2_1, string | JSX.Element>>
      | undefined
    >(undefined),
    resource = getFhirResource<any>(item),
    attachmentUrl = resource?.content?.[0]?.attachment?.url,
    attachmentMetadata = resource?.content?.[0]?.attachment,
    attachment = useClinicalDoc(attachmentUrl),
    [hasLoadedDocument, setHasLoadedDocument] = useState(false),
    [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined),
    [imageUrl, setImageUrl] = useState<string | undefined>(undefined),
    [html, setHtml] = useState<
      string | JSX.Element | JSX.Element[] | undefined
    >(undefined);

  useEffect(() => {
    if (expanded) {
      if (!attachment && attachmentMetadata?.data) {
        const embeddedContentType = attachmentMetadata.contentType || '';
        const embeddedRaw = attachmentMetadata.data;
        if (
          embeddedContentType.includes('application/xml') &&
          typeof embeddedRaw === 'string'
        ) {
          const xml = atob(embeddedRaw);
          if (checkIfXmlIsCCDA(xml)) {
            setCCDA(parseCCDA(xml));
          } else {
            setHtml(<pre>{xml}</pre>);
          }
        } else if (
          embeddedContentType.includes('application/pdf') &&
          typeof embeddedRaw === 'string'
        ) {
          setPdfUrl(createBlobUrlFromBase64(embeddedRaw, 'application/pdf'));
        } else if (
          embeddedContentType.startsWith('image/') &&
          typeof embeddedRaw === 'string'
        ) {
          setImageUrl(createBlobUrlFromBase64(embeddedRaw, embeddedContentType));
        } else if (
          embeddedContentType.includes('text/html') &&
          typeof embeddedRaw === 'string'
        ) {
          setHtml(parse(DOMPurify.sanitize(atob(embeddedRaw))));
        }
        setHasLoadedDocument(true);
      } else if (!attachment) {
        setHasLoadedDocument(true);
      } else if (
        attachment
          .get('data_record.content_type')
          ?.includes('application/xml') &&
        checkIfXmlIsCCDA(attachment.get('data_record.raw'))
      ) {
        const parsedDoc = parseCCDA(attachment.get('data_record.raw'));
        setHasLoadedDocument(true);
        setCCDA(parsedDoc);
      } else if (
        attachment
          .get('data_record.content_type')
          ?.includes('application/pdf') &&
        typeof attachment.get('data_record.raw') === 'string'
      ) {
        try {
          const base64 = attachment.get('data_record.raw');
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
          setHasLoadedDocument(true);
        } catch (error) {
          console.error(
            '[ShowDocumentResultsExpandable] Error converting base64 to Blob:',
            error,
          );
          setHasLoadedDocument(true);
        }
      } else if (
        attachment.get('data_record.content_type')?.startsWith('image/') &&
        typeof attachment.get('data_record.raw') === 'string'
      ) {
        try {
          const contentType = attachment.get('data_record.content_type');
          const base64 = attachment.get('data_record.raw');
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: contentType });
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
          setHasLoadedDocument(true);
        } catch (error) {
          console.error(
            '[ShowDocumentResultsExpandable] Error converting image base64 to Blob:',
            error,
          );
          setHasLoadedDocument(true);
        }
      } else if (
        attachment.get('data_record.content_type')?.includes('text/html') &&
        typeof attachment.get('data_record.raw') === 'string'
      ) {
        const sanitizedData = parse(
          DOMPurify.sanitize(attachment.get('data_record.raw')),
        );
        setHtml(sanitizedData);
        setHasLoadedDocument(true);
      } else {
        console.error(
          '[ShowDocumentResultsExpandable] Attachment exists but cannot be displayed:',
          {
            contentType: attachment.get('data_record.content_type'),
            hasRaw: !!attachment.get('data_record.raw'),
            rawType: typeof attachment.get('data_record.raw'),
            rawValue: attachment.get('data_record.raw'),
          },
        );
        setHasLoadedDocument(true);
      }
    }

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [expanded, cd, attachment]);

  return (
    <Modal open={expanded} setOpen={setExpanded}>
      <div className="flex flex-col">
        <ModalHeader
          title={item.metadata?.display_name || ''}
          setClose={() => setExpanded(false)}
        />
        <div className="max-h-full  scroll-py-3 p-3">
          <div
            className={`${
              expanded ? '' : 'hidden'
            } rounded-lg border border-solid border-gray-200`}
          >
            {!hasLoadedDocument && (
              <p className="text-md p-4 text-gray-900">Loading...</p>
            )}

            {/* Display CCDA Document */}
            {ccda && (
              <div className="text-md whitespace-wrap overflow-x-scroll p-4 text-gray-900">
                <DisplayCCDADocument
                  ccda={ccda}
                  matchedChunks={matchedChunks}
                />
              </div>
            )}

            {/* Display PDF Document */}
            {pdfUrl && (
              <div className="h-[600px] w-full p-4">
                <iframe
                  src={pdfUrl}
                  className="h-full w-full border-0"
                  title={item.metadata?.display_name || 'PDF Document'}
                />
              </div>
            )}

            {/* Display Image Document */}
            {imageUrl && (
              <div className="flex max-h-[700px] justify-center overflow-auto p-4">
                <img
                  src={imageUrl}
                  alt={item.metadata?.display_name || 'Linked image'}
                  className="max-h-[660px] max-w-full object-contain"
                />
              </div>
            )}

            {/* Display HTML Document */}
            {html && (
              <div className="prose prose-sm overflow-x-auto p-4">{html}</div>
            )}

            {/* Fallback when the linked binary is not stored locally */}
            {hasLoadedDocument && !ccda && !pdfUrl && !imageUrl && !html && (
              <DocumentReferenceFallback
                description={resource?.description}
                status={resource?.status}
                attachment={attachmentMetadata}
              />
            )}
          </div>
        </div>
      </div>
    </Modal>
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

function DocumentReferenceFallback({
  description,
  status,
  attachment,
}: {
  description?: string;
  status?: string;
  attachment?: {
    contentType?: string;
    title?: string;
    url?: string;
    size?: number;
  };
}) {
  const rows = [
    ['Attachment title', attachment?.title],
    ['Content type', attachment?.contentType],
    ['Attachment URL', attachment?.url],
    ['Size', formatAttachmentSize(attachment?.size)],
    ['Status', status],
  ].filter(([, value]) => Boolean(value));

  return (
    <div className="space-y-4 p-4 text-gray-900">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          Linked attachment metadata
        </h3>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          The source record points to an attachment, but the binary file is not
          stored locally.
        </p>
      </div>
      {description && (
        <p className="rounded-md bg-gray-50 p-3 text-sm leading-6 text-gray-700">
          {description}
        </p>
      )}
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-md bg-gray-50 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {label}
            </dt>
            <dd className="mt-1 break-words text-sm text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatAttachmentSize(size?: number) {
  if (!size) return undefined;
  if (size < 1024) return `${size} bytes`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
