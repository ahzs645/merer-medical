import {
  useLocalConfig,
  useUpdateLocalConfig,
} from '../../../app/providers/LocalConfigProvider';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { SettingsSection } from './SettingsSection';

export function AdvancedToolsSettingsGroup() {
  const localConfig = useLocalConfig();
  const updateLocalConfig = useUpdateLocalConfig();
  const { t } = useInterfaceLanguage();

  return (
    <SettingsSection
      id="advanced-tools"
      title={t('Optional tools')}
      description={t(
        'Show additional configuration for experimental features and troubleshooting.',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          aria-pressed={localConfig.experimental_features_enabled}
          className="focus:ring-primary-500 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2"
          onClick={() =>
            updateLocalConfig({
              experimental_features_enabled:
                !localConfig.experimental_features_enabled,
            })
          }
        >
          {localConfig.experimental_features_enabled
            ? t('Hide experimental features')
            : t('Show experimental features')}
        </button>
        <button
          type="button"
          aria-pressed={localConfig.developer_mode_enabled}
          className="focus:ring-primary-500 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2"
          onClick={() =>
            updateLocalConfig({
              developer_mode_enabled: !localConfig.developer_mode_enabled,
            })
          }
        >
          {localConfig.developer_mode_enabled
            ? t('Disable developer mode')
            : t('Enable developer mode')}
        </button>
      </div>
    </SettingsSection>
  );
}
