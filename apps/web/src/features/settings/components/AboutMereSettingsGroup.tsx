import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { SettingsSection } from './SettingsSection';

export function AboutMereSettingsGroup() {
  const { t } = useInterfaceLanguage();

  return (
    <SettingsSection id="about-mere" title={t('About Mere')}>
      <div className="flex flex-col gap-2">
        {/* App version of MERE_APP_VERSION */}
        <div className="text-sm text-gray-800">
          {t('Version')} {MERE_APP_VERSION}
        </div>
        {/* Link to github */}
        <div className="text-sm text-gray-800">
          {t('Find the source code on')}{' '}
          <a
            className="text-primary-500  hover:underline"
            href="https://github.com/cfu288/mere-medical"
          >
            GitHub
          </a>
        </div>
        {/* bug report email at cfu288@meremedical.co */}
        <div className="text-sm text-gray-800">
          {t('Feature requests or bug reports')}:{' '}
          <a
            className="text-primary-500 hover:text-primary-900 hover:underline"
            href="mailto:cfu288@meremedical.co"
          >
            {t('Send an email')}
          </a>{' '}
          {t('or')}{' '}
          <a
            className="text-primary-500 hover:text-primary-900 hover:underline"
            href="https://github.com/cfu288/mere-medical/issues/new"
          >
            {t('Create an issue')}
          </a>
        </div>
        {/* Made with love by Chris Fu */}
        <div className="text-sm text-gray-800">
          {t('Made with')}
          <span className="px-1 text-red-600" role="img" aria-label="love">
            ❤️
          </span>
          by{' '}
          <a
            className="text-primary-500 hover:text-primary-900 hover:underline"
            href="https://www.cfu288.com"
          >
            Chris Fu
          </a>
        </div>
      </div>
    </SettingsSection>
  );
}
