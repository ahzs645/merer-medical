import { ClinicalDocument } from '../../../../models/clinical-document/ClinicalDocument.type';
import { Modal } from '../../../../shared/components/Modal';
import { ModalHeader } from '../../../../shared/components/ModalHeader';
import { EmbeddedAttachmentViewer } from './EmbeddedAttachmentViewer';

export const LOINC_CODE_SYSTEM = '2.16.840.1.113883.6.1';
export const SNOMED_CT_CODE_SYSTEM = '2.16.840.1.113883.6.96';

export function checkIfXmlIsCCDA(xml: string): boolean {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');
    const sections = xmlDoc.getElementsByTagName('ClinicalDocument');
    return sections.length > 0;
  } catch (e) {
    return false;
  }
}

export function ShowDocumentResultsAttachmentExpandable({
  item,
  expanded,
  setExpanded,
  matchedChunks,
  searchQuery,
}: {
  item: ClinicalDocument<string | Blob>; // Can be XML string or PDF Blob
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  matchedChunks?: { id: string; metadata?: any }[];
  searchQuery?: string;
}) {
  return (
    <Modal open={expanded} setOpen={setExpanded}>
      <div className="flex flex-col">
        <ModalHeader
          title={item.metadata?.display_name || ''}
          setClose={() => setExpanded(false)}
        />
        <div className="max-h-full scroll-py-3 p-3">
          <div
            className={`${
              expanded ? '' : 'hidden'
            } rounded-lg border border-solid border-gray-200`}
          >
            <EmbeddedAttachmentViewer
              attachment={{
                contentType: item.data_record.content_type,
                raw: item.data_record.raw,
                title: item.metadata?.display_name,
              }}
              matchedChunks={matchedChunks}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
