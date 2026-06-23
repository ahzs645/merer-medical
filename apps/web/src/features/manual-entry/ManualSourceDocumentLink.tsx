import { MouseEvent, useState } from 'react';
import { DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { useClinicalDoc } from '../../shared/hooks/useClinicalDoc';
import { Modal } from '../../shared/components/Modal';
import { ModalHeader } from '../../shared/components/ModalHeader';
import { EmbeddedAttachmentViewer } from '../timeline/components/document-reference/EmbeddedAttachmentViewer';

function getMetaString(
  item: ClinicalDocument,
  key: string,
): string | undefined {
  const value = (item.metadata as Record<string, unknown> | undefined)?.[key];
  return typeof value === 'string' && value ? value : undefined;
}

/**
 * Opens the embedded source document (the original PDF/screenshot a transposed
 * record came from) in a modal. A record points at its source via
 * `metadata.source_attachment_id`, which is the `metadata.id` of the
 * `documentreference_attachment` clinical document holding the base64 bytes.
 *
 * Renders nothing if the record has no source pointer or the attachment is not
 * present locally, so it is safe to drop into any manual-record card.
 */
export function ManualSourceDocumentLink({ item }: { item: ClinicalDocument }) {
  const [open, setOpen] = useState(false);
  const sourceAttachmentId = getMetaString(item, 'source_attachment_id');
  const attachment = useClinicalDoc(sourceAttachmentId);

  if (!sourceAttachmentId || !attachment) return null;

  const title =
    getMetaString(item, 'source_image') ||
    attachment.get('metadata.display_name') ||
    'Source document';

  return (
    <>
      <button
        type="button"
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-md border border-primary-200 px-2 py-1 text-xs font-semibold text-primary-700 shadow-sm hover:bg-primary-50"
        title={`View source: ${title}`}
      >
        <DocumentMagnifyingGlassIcon className="h-4 w-4" />
        View source
      </button>
      <Modal open={open} setOpen={setOpen}>
        <div className="flex flex-col">
          <ModalHeader title={title} setClose={setOpen} />
          <EmbeddedAttachmentViewer
            attachment={{
              contentType: attachment.get('data_record.content_type'),
              raw: attachment.get('data_record.raw'),
              title,
            }}
          />
        </div>
      </Modal>
    </>
  );
}
