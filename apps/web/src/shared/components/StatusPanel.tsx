import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';

export function LoadingPanel({ text }: { text: string }) {
  return (
    <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
      {text}
    </div>
  );
}

export function ErrorPanel({
  error,
  text,
}: {
  error?: Error | null;
  text?: string;
}) {
  const { t } = useInterfaceLanguage();
  const message = text || t('Something went wrong while loading records.');

  return (
    <div
      role="alert"
      className="rounded-md bg-white p-8 text-center shadow-sm ring-1 ring-red-200"
    >
      <p className="text-sm font-semibold text-red-700">{message}</p>
      {error?.message && (
        <p className="mt-1 text-xs text-gray-500">{error.message}</p>
      )}
    </div>
  );
}
