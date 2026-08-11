import { formatDateAndTime } from '../../../shared/utils/dateFormatters';

export function SaveStatus({
  savedAt,
  status,
}: {
  savedAt: string;
  status: 'idle' | 'saved' | 'error';
}) {
  if (status === 'error') {
    return (
      <span className="text-xs font-medium text-red-600">
        Unable to save locally
      </span>
    );
  }

  if (status === 'idle' && savedAt) {
    return <span className="text-xs text-amber-700">Unsaved changes</span>;
  }

  if (!savedAt) {
    return <span className="text-xs text-gray-500">Not saved yet</span>;
  }

  return (
    <span className="text-xs text-gray-500">
      Saved {formatDateAndTime(new Date(savedAt).toISOString())}
    </span>
  );
}
