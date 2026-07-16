import { PreviewFile } from '../types';

export function FilePreviewPane({ file }: { file: PreviewFile | null }) {
  if (!file) {
    return (
      <div className="flex h-[520px] items-center justify-center rounded-md border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
        Select a PDF, image, text, Markdown, CSV, or JSON file to preview.
      </div>
    );
  }

  if (file.previewType === 'pdf') {
    return (
      <object
        data={file.url}
        type="application/pdf"
        className="h-[520px] w-full rounded-md border border-gray-200 bg-gray-50"
      >
        <div className="p-4 text-sm text-gray-600">
          PDF preview is not available in this browser. Open the downloaded file
          directly to review it.
        </div>
      </object>
    );
  }

  if (file.previewType === 'image') {
    return (
      <div className="flex h-[520px] items-center justify-center overflow-auto rounded-md border border-gray-200 bg-gray-50 p-3">
        <img
          src={file.url}
          alt={file.name}
          className="max-h-full max-w-full rounded-sm object-contain"
        />
      </div>
    );
  }

  if (file.previewType === 'text') {
    return (
      <pre className="h-[520px] overflow-auto rounded-md border border-gray-200 bg-gray-950 p-4 text-xs leading-5 text-gray-100">
        {file.text}
      </pre>
    );
  }

  return (
    <div className="flex h-[520px] items-center justify-center rounded-md border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
      This file type cannot be previewed inline.
    </div>
  );
}
