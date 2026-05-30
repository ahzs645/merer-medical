import { interfaceLanguages } from '../../../app/i18n/translations';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { StylizedSelect } from '../../../shared/components/StylizedSelect';

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
            <StylizedSelect
              value={language}
              onChange={(value) => setLanguage(value === 'ar' ? 'ar' : 'en')}
              className="max-w-xs"
              options={interfaceLanguages.map((item) => ({
                value: item.code,
                label: `${item.nativeLabel} (${item.label})`,
              }))}
            />
          </label>
        </div>
      </div>
    </>
  );
}
