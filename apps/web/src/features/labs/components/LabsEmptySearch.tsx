import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function LabsEmptySearch({ query }: { query: string }) {
  const { t } = useInterfaceLanguage();

  return (
    <div className="rounded-md bg-white p-10 text-center shadow-sm ring-1 ring-gray-200">
      <MagnifyingGlassIcon className="mx-auto h-10 w-10 text-primary-600" />
      <h2 className="mt-3 text-lg font-semibold text-gray-900">
        {t('No matching labs')}
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        {t('No lab groups match')} "{query}".
      </p>
    </div>
  );
}
