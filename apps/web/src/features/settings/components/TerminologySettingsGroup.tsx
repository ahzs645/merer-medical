import { useEffect, useState } from 'react';
import { TerminologyPack } from '@mere/domain';

import {
  useLocalConfig,
  useUpdateLocalConfig,
} from '../../../app/providers/LocalConfigProvider';
import {
  importTerminologyPackJson,
  listTerminologyPacks,
} from '../../terminology/terminologyService';
import { useNotificationDispatch } from '../../../app/providers/NotificationProvider';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { StylizedSelect } from '../../../shared/components/StylizedSelect';

export function TerminologySettingsGroup() {
  const localConfig = useLocalConfig();
  const updateLocalConfig = useUpdateLocalConfig();
  const notifyDispatch = useNotificationDispatch();
  const { t } = useInterfaceLanguage();
  const [packs, setPacks] = useState<TerminologyPack[]>([]);

  async function refreshPacks() {
    setPacks(await listTerminologyPacks());
  }

  useEffect(() => {
    let cancelled = false;
    listTerminologyPacks().then((nextPacks) => {
      if (!cancelled) setPacks(nextPacks);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="py-6 text-xl font-extrabold">{t('Terminology')}</div>
      <div className="grid gap-4 rounded border border-gray-200 bg-gray-50 p-4 text-sm">
        <label className="grid gap-1">
          <span className="font-semibold text-gray-900">{t('Profile')}</span>
          <StylizedSelect
            value={localConfig.terminology_profile ?? 'canada'}
            onChange={(value) =>
              updateLocalConfig({
                terminology_profile: value as 'canada' | 'us' | 'global',
              })
            }
            className="max-w-xs"
            options={[
              { value: 'canada', label: t('Canada') },
              { value: 'us', label: t('United States') },
              { value: 'global', label: t('Global baseline') },
            ]}
          />
        </label>

        <label className="grid gap-1">
          <span className="font-semibold text-gray-900">
            {t('Lookup mode')}
          </span>
          <StylizedSelect
            value={localConfig.terminology_lookup_mode ?? 'hybrid'}
            onChange={(value) =>
              updateLocalConfig({
                terminology_lookup_mode: value as
                  | 'local-only'
                  | 'hybrid'
                  | 'server-first',
              })
            }
            className="max-w-xs"
            options={[
              { value: 'hybrid', label: t('Hybrid local-first') },
              { value: 'local-only', label: t('Local only') },
              { value: 'server-first', label: t('Server first') },
            ]}
          />
        </label>

        <label className="grid gap-1">
          <span className="font-semibold text-gray-900">{t('Language')}</span>
          <StylizedSelect
            value={localConfig.terminology_language ?? 'en'}
            onChange={(value) =>
              updateLocalConfig({
                terminology_language: value as 'en' | 'fr',
              })
            }
            className="max-w-xs"
            options={[
              { value: 'en', label: t('English') },
              { value: 'fr', label: t('French') },
            ]}
          />
        </label>

        <label className="flex items-center gap-2 font-medium text-gray-800">
          <input
            type="checkbox"
            checked={!!localConfig.terminology_remote_enabled}
            onChange={(event) =>
              updateLocalConfig({
                terminology_remote_enabled: event.target.checked,
              })
            }
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
          />
          {t('Enable configured remote terminology lookup')}
        </label>

        <div>
          <div className="font-semibold text-gray-900">
            {t('Installed packs')}
          </div>
          <label className="mt-2 inline-flex cursor-pointer items-center rounded-md border border-primary-200 px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50">
            {t('Import terminology pack')}
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  await importTerminologyPackJson(await file.text());
                  await refreshPacks();
                  notifyDispatch({
                    type: 'set_notification',
                    message: t('Terminology pack imported'),
                    variant: 'success',
                  });
                } catch (error) {
                  notifyDispatch({
                    type: 'set_notification',
                    message: t(
                      'Unable to import terminology pack: {message}',
                    ).replace('{message}', (error as Error).message),
                    variant: 'error',
                  });
                } finally {
                  event.target.value = '';
                }
              }}
            />
          </label>
          <div className="mt-2 divide-y divide-gray-200 rounded border border-gray-200 bg-white">
            {packs.length === 0 ? (
              <div className="p-3 text-gray-600">
                {t('No packs installed.')}
              </div>
            ) : (
              packs.map((pack) => (
                <div key={pack.id} className="p-3">
                  <div className="font-medium text-gray-900">{pack.name}</div>
                  <div className="text-xs text-gray-600">
                    {pack.profile} · {pack.source} · {pack.sourceVersion}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {pack.license}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
