import { interfaceLanguages } from '../../../app/i18n/translations';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function InterfaceLanguageSettingsGroup() {
  const { language, setLanguage, t } = useInterfaceLanguage();

  return (
    <>
      <h1 className="py-6 text-xl font-extrabold">{t('Interface Language')}</h1>
      <div className="divide-y divide-gray-200">
        <div className="px-4 sm:px-6">
          <label className="flex flex-col gap-2 pb-4">
            <span className="text-primary-800 text-lg leading-6">
              {t('Display language')}
            </span>
            <span className="max-w-xl text-sm text-gray-700">
              {t('Choose the language used for menus, headings, and app copy.')}
            </span>
            <select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value === 'ar' ? 'ar' : 'en')
              }
              className="focus:border-primary-500 focus:ring-primary-500 max-w-xs rounded-md border-gray-300 text-sm"
            >
              {interfaceLanguages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.nativeLabel} ({item.label})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </>
  );
}
