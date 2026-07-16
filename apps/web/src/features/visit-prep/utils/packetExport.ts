import { PacketItem, PacketOptions, PacketSections } from '../types';

export function buildPacketMarkdown({
  packet,
  questions,
  patientName,
  generatedAt,
  options,
}: {
  packet: PacketSections;
  questions: string;
  patientName: string;
  generatedAt: Date;
  options: PacketOptions;
}) {
  const sections = [
    options.includeProblems
      ? formatPacketSection('Active problems', packet.problems)
      : undefined,
    options.includeMedications
      ? formatPacketSection('Current medications', packet.medications)
      : undefined,
    options.includeAllergies
      ? formatPacketSection('Allergies', packet.allergies)
      : undefined,
    options.includeLabs
      ? formatPacketSection('Abnormal labs', packet.labs)
      : undefined,
    options.includeDocuments
      ? formatPacketSection('Recent documents', packet.documents)
      : undefined,
    options.includeImaging
      ? formatPacketSection('Recent imaging', packet.imaging)
      : undefined,
    options.includeProcedures
      ? formatPacketSection('Recent procedures', packet.procedures)
      : undefined,
    options.includeQuestions
      ? [
          '## Questions for visit',
          questions.trim() || 'No questions saved.',
        ].join('\n\n')
      : undefined,
  ].filter(Boolean);

  return [
    '# Visit prep and provider packet',
    `Patient: ${patientName || 'Unknown user'}`,
    `Generated: ${generatedAt.toLocaleString()}`,
    '',
    ...sections,
    '',
  ].join('\n\n');
}

export function buildPacketHtml({
  packet,
  questions,
  patientName,
  generatedAt,
  options,
}: {
  packet: PacketSections;
  questions: string;
  patientName: string;
  generatedAt: Date;
  options: PacketOptions;
}) {
  const sectionHtml = [
    options.includeProblems
      ? formatPacketHtmlSection('Active problems', packet.problems)
      : undefined,
    options.includeMedications
      ? formatPacketHtmlSection('Current medications', packet.medications)
      : undefined,
    options.includeAllergies
      ? formatPacketHtmlSection('Allergies', packet.allergies)
      : undefined,
    options.includeLabs
      ? formatPacketHtmlSection('Abnormal labs', packet.labs)
      : undefined,
    options.includeDocuments
      ? formatPacketHtmlSection('Recent documents', packet.documents)
      : undefined,
    options.includeImaging
      ? formatPacketHtmlSection('Recent imaging', packet.imaging)
      : undefined,
    options.includeProcedures
      ? formatPacketHtmlSection('Recent procedures', packet.procedures)
      : undefined,
    options.includeQuestions
      ? `<section><h2>Questions for visit</h2><p>${escapeHtml(
          questions.trim() || 'No questions saved.',
        ).replace(/\n/g, '<br>')}</p></section>`
      : undefined,
  ]
    .filter(Boolean)
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Visit prep and provider packet</title>
  <style>
    body { color: #111827; font-family: Arial, sans-serif; line-height: 1.45; margin: 32px; }
    header { border-bottom: 1px solid #d1d5db; margin-bottom: 24px; padding-bottom: 16px; }
    h1 { font-size: 24px; margin: 0 0 6px; }
    h2 { font-size: 16px; margin: 24px 0 8px; }
    p { margin: 0; }
    ul { border: 1px solid #d1d5db; border-radius: 6px; list-style: none; margin: 8px 0 0; padding: 0; }
    li { border-top: 1px solid #e5e7eb; padding: 10px 12px; }
    li:first-child { border-top: 0; }
    .meta { color: #4b5563; font-size: 13px; }
    .detail { color: #374151; font-size: 13px; margin-top: 4px; }
    .empty { border: 1px solid #d1d5db; border-radius: 6px; color: #6b7280; padding: 10px 12px; }
    @media print { body { margin: 20mm; } section { break-inside: avoid; } }
  </style>
</head>
<body>
  <header>
    <h1>Visit prep and provider packet</h1>
    <p class="meta">Patient: ${escapeHtml(patientName || 'Unknown user')}</p>
    <p class="meta">Generated: ${escapeHtml(generatedAt.toLocaleString())}</p>
  </header>
  ${sectionHtml}
</body>
</html>`;
}

function formatPacketHtmlSection(title: string, items: PacketItem[]) {
  if (items.length === 0) {
    return `<section><h2>${escapeHtml(title)}</h2><p class="empty">No matching records found.</p></section>`;
  }

  return `<section><h2>${escapeHtml(title)}</h2><ul>${items
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.title)}</strong>${
          item.date ? ` <span class="meta">${escapeHtml(item.date)}</span>` : ''
        }${
          item.detail ? `<p class="detail">${escapeHtml(item.detail)}</p>` : ''
        }</li>`,
    )
    .join('')}</ul></section>`;
}

function formatPacketSection(title: string, items: PacketItem[]) {
  if (items.length === 0) {
    return [`## ${title}`, 'No matching records found.'].join('\n\n');
  }

  return [
    `## ${title}`,
    items
      .map((item) =>
        [
          `- ${item.title}${item.date ? ` (${item.date})` : ''}`,
          item.detail ? `  - ${item.detail}` : undefined,
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n'),
  ].join('\n\n');
}

export function filenameDate(date: Date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
