import { Link } from 'react-router-dom';
import {
  CloudIcon,
  ComputerDesktopIcon,
  ServerStackIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

import uuid4 from '../../../shared/utils/UUIDUtils';
import { useLocalConfig } from '../../../app/providers/LocalConfigProvider';
import {
  useRawUserPreferences,
  useUserPreferences,
} from '../../../app/providers/UserPreferencesProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { useRxDb } from '../../../app/providers/RxDbProvider';
import { Routes } from '../../../Routes';

type Mode = {
  key: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  active: boolean;
  tone: 'neutral' | 'warn';
  warning?: string;
  action?: React.ReactNode;
};

/**
 * Presents the scattered privacy-related options (proxy sync, cloud AI) as a
 * small set of named, easy-to-understand modes. The underlying toggles still
 * live in their own settings sections; this is a higher-level summary plus a
 * one-tap control for the proxy mode.
 */
export function PrivacyModesCard() {
  const db = useRxDb();
  const user = useUser();
  const userPreferences = useUserPreferences();
  const rawUserPreferences = useRawUserPreferences();
  const localConfig = useLocalConfig();

  const useProxy = !!userPreferences?.use_proxy;
  const cloudAiEnabled =
    !!localConfig.experimental__use_openai_rag &&
    localConfig.experimental__ai_provider === 'openai';

  const setProxy = (value: boolean) => {
    if (rawUserPreferences) {
      rawUserPreferences.update({ $set: { use_proxy: value } });
    } else if (db && user?.id) {
      db.user_preferences.insert({
        id: uuid4(),
        user_id: user.id,
        use_proxy: value,
      });
    }
  };

  const modes: Mode[] = [
    {
      key: 'local-only',
      title: 'Local only',
      icon: <ComputerDesktopIcon className="h-5 w-5" />,
      description:
        'Manual entry, file import, and .emrpkg backups. No portal proxy and no data leaves your device.',
      active: !useProxy && !cloudAiEnabled,
      tone: 'neutral',
    },
    {
      key: 'direct-sync',
      title: 'Direct portal sync',
      icon: <ServerStackIcon className="h-5 w-5" />,
      description:
        'Sync with health systems whose servers let this browser talk to them directly via SMART/FHIR.',
      active: !useProxy,
      tone: 'neutral',
    },
    {
      key: 'proxy-sync',
      title: 'Proxy-assisted sync',
      icon: <ServerStackIcon className="h-5 w-5" />,
      description:
        'Needed for portals that cannot talk to the browser directly. A separate proxy service handles login and sync.',
      active: useProxy,
      tone: 'warn',
      warning:
        'The proxy can access all of your health data. Only enable this if you trust the organization hosting the app.',
      action: (
        <button
          type="button"
          onClick={() => setProxy(!useProxy)}
          className={`rounded-md px-3 py-1.5 text-sm font-bold shadow-sm ${
            useProxy
              ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {useProxy ? 'Turn off proxy' : 'Enable proxy'}
        </button>
      ),
    },
    {
      key: 'cloud-ai',
      title: 'Cloud AI enabled',
      icon: <CloudIcon className="h-5 w-5" />,
      description:
        'Opt-in only. Uses OpenAI for AI features. Medical information may be sent to OpenAI servers and API keys are stored in plaintext.',
      active: cloudAiEnabled,
      tone: 'warn',
      warning: cloudAiEnabled
        ? 'Cloud AI is on. We recommend a local model (Ollama) to keep processing on-device.'
        : undefined,
      action: (
        <Link
          to={`${Routes.Settings}#experimental`}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <SparklesIcon className="h-4 w-4" />
          AI settings
        </Link>
      ),
    },
  ];

  return (
    <div className="mb-4">
      <h3 className="text-base font-bold text-gray-900">Privacy mode</h3>
      <p className="mt-0.5 text-sm text-gray-500">
        How your data moves, at a glance. Adjust the underlying options below.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {modes.map((mode) => (
          <div
            key={mode.key}
            className={`rounded-lg border p-4 ${
              mode.active
                ? mode.tone === 'warn'
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-primary-300 bg-primary-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={mode.active ? 'text-primary-700' : 'text-gray-400'}
                >
                  {mode.icon}
                </span>
                <h4 className="text-sm font-bold text-gray-900">
                  {mode.title}
                </h4>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  mode.active
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {mode.active ? 'Active' : 'Off'}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">{mode.description}</p>
            {mode.active && mode.warning ? (
              <p className="mt-2 text-xs font-medium text-amber-700">
                {mode.warning}
              </p>
            ) : null}
            {mode.action ? <div className="mt-3">{mode.action}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
