import { interfaceLanguages } from '../../../app/i18n/translations';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { StylizedSelect } from '../../../shared/components/StylizedSelect';
import { SettingsSection } from './SettingsSection';

export function InterfaceLanguageSettingsGroup() {
  const { language, setLanguage, t } = useInterfaceLanguage();

  return (
    <SettingsSection id="interface-language" title={t('Interface language')}>
      <label className="flex flex-col gap-2">
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
    </SettingsSection>
  );
}
