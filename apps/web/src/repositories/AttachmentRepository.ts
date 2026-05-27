import { ClinicalDocument } from '../models/clinical-document/ClinicalDocument.type';
import { getDataClient, isDexieReposEnabled } from './dexie-bridge';

export type LinkedAttachmentFile = {
  file: File;
  filename: string;
  mime: string;
  bytes: Uint8Array;
};

export function supportsClinicalDocumentAttachments(): boolean {
  return isDexieReposEnabled();
}

export async function prepareLinkedAttachmentFile(
  file: File,
): Promise<LinkedAttachmentFile> {
  return {
    file,
    filename: file.name,
    mime: file.type || 'application/octet-stream',
    bytes: new Uint8Array(await file.arrayBuffer()),
  };
}

export async function saveClinicalDocumentAttachment(
  doc: ClinicalDocument,
  linkedFile: LinkedAttachmentFile,
): Promise<string | null> {
  if (!supportsClinicalDocumentAttachments()) return null;

  const client = getDataClient();
  const attachment = await client.attachments.put({
    ownerType: 'clinical_document',
    ownerId: doc.id,
    filename: linkedFile.filename,
    mime: linkedFile.mime,
    bytes: linkedFile.bytes,
  });

  const existingIds = doc.attachment_ids ?? [];
  const nextIds = Array.from(new Set([...existingIds, attachment.id]));
  await client.clinicalDocuments.upsertBatch([
    {
      ...clientClinicalDocumentFromLegacy(doc),
      attachmentIds: nextIds,
    },
  ]);

  return attachment.id;
}

export async function listClinicalDocumentAttachments(docId: string) {
  if (!supportsClinicalDocumentAttachments()) return [];
  return getDataClient().attachments.list('clinical_document', docId);
}

export async function openClinicalDocumentAttachment(attachmentId: string) {
  if (!supportsClinicalDocumentAttachments()) return;

  const attachment = await getDataClient().attachments.read(attachmentId);
  if (!attachment) throw new Error('Linked file not found');

  const blob = new Blob([attachment.bytes], { type: attachment.meta.mime });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadClinicalDocumentAttachment(attachmentId: string) {
  if (!supportsClinicalDocumentAttachments()) return;

  const attachment = await getDataClient().attachments.read(attachmentId);
  if (!attachment) throw new Error('Linked file not found');

  const blob = new Blob([attachment.bytes], { type: attachment.meta.mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = attachment.meta.filename || 'source-file';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function clientClinicalDocumentFromLegacy(doc: ClinicalDocument) {
  return {
    id: doc.id,
    userId: doc.user_id,
    connectionId: doc.connection_record_id,
    format: doc.data_record.format,
    contentType: doc.data_record.content_type,
    resourceType: doc.data_record.resource_type,
    raw: doc.data_record.raw,
    versionHistory: doc.data_record.version_history,
    attachmentIds: doc.attachment_ids,
    metadata: {
      sourceId: doc.metadata?.id,
      date: doc.metadata?.date,
      displayName: doc.metadata?.display_name,
      loincCoding: doc.metadata?.loinc_coding,
      terminologyProfile: doc.metadata?.terminology_profile as any,
      terminologySource: doc.metadata?.terminology_source,
      terminologySourceVersion: doc.metadata?.terminology_source_version,
      manualUncoded: doc.metadata?.manual_uncoded,
      manualSpecialty: doc.metadata?.manual_specialty,
      manualSubtype: doc.metadata?.manual_subtype,
      manualSpecialtyDetails: doc.metadata?.manual_specialty_details,
      manualImagingDetails: doc.metadata?.manual_imaging_details,
    },
  };
}
