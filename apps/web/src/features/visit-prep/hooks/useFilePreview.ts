import { useEffect, useState } from 'react';

import { PreviewFile } from '../types';
import { getPreviewType } from '../utils/filePreview';

export function useFilePreview() {
  const [previewMode, setPreviewMode] = useState<'packet' | 'file'>('packet');
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  useEffect(() => {
    return () => {
      if (previewFile) URL.revokeObjectURL(previewFile.url);
    };
  }, [previewFile]);

  async function handlePreviewFile(file: File | undefined) {
    if (!file) return;
    if (previewFile) URL.revokeObjectURL(previewFile.url);
    const previewType = getPreviewType(file);
    setPreviewFile({
      name: file.name,
      type: file.type || 'Unknown type',
      size: file.size,
      url: URL.createObjectURL(file),
      previewType,
      text: previewType === 'text' ? await file.text() : undefined,
    });
    setPreviewMode('file');
  }

  return { previewMode, setPreviewMode, previewFile, handlePreviewFile };
}
