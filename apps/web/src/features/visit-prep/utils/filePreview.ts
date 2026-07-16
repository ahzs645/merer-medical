import { PreviewFile } from '../types';

export function getPreviewType(file: File): PreviewFile['previewType'] {
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (file.type.startsWith('image/')) return 'image';
  if (
    file.type.startsWith('text/') ||
    file.type === 'application/json' ||
    /\.(txt|md|csv|json)$/i.test(file.name)
  ) {
    return 'text';
  }
  return 'unsupported';
}

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
