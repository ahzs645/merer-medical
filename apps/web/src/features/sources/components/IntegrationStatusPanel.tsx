import { Disclosure } from '@headlessui/react';
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

import { IntegrationStatus, VendorAvailability } from '../integrationStatus';

type StatusTone = 'ok' | 'warn' | 'off';

function StatusRow({
  label,
  tone,
  detail,
}: {
  label: string;
  tone: StatusTone;
  detail?: string;
}) {
  const Icon =
    tone === 'ok'
      ? CheckCircleIcon
      : tone === 'warn'
        ? ExclamationTriangleIcon
        : XCircleIcon;
  const color =
    tone === 'ok'
      ? 'text-green-600'
      : tone === 'warn'
        ? 'text-amber-500'
        : 'text-gray-400';

  return (
    <li className="flex items-start gap-3 py-2">
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${color}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {detail ? <p className="text-xs text-gray-500">{detail}</p> : null}
      </div>
    </li>
  );
}

function vendorRow(vendor: VendorAvailability): {
  label: string;
  tone: StatusTone;
  detail?: string;
} {
  if (!vendor.enabled) {
    if (vendor.needsProxy) {
      return {
        label: vendor.label,
        tone: 'warn',
        detail: 'Ready, but the server still needs to turn syncing on.',
      };
    }
    return {
      label: vendor.label,
      tone: 'off',
      // Deployment-level: the person reading this may not run the server, so
      // say who can turn it on rather than naming the environment variable.
      detail: vendor.requiredEnv
        ? `Turned off here. Whoever runs this server can enable it (${vendor.requiredEnv}).`
        : 'Turned off on this server.',
    };
  }
  if (vendor.sandboxOnly) {
    return {
      label: vendor.label,
      tone: 'warn',
      detail: 'Test access only — you can connect, but only to sample data.',
    };
  }
  if (vendor.confidentialMode !== undefined) {
    return {
      label: vendor.label,
      tone: 'ok',
      detail: 'Ready to connect.',
    };
  }
  return { label: vendor.label, tone: 'ok', detail: 'Ready to connect.' };
}

/**
 * A user-friendly version of the integration/env-var status that previously
 * only lived behind developer mode. Explains why a given portal tile may be
 * disabled on this deployment before the user even tries to connect.
 */
export function IntegrationStatusPanel({
  status,
  defaultOpen = false,
}: {
  status: IntegrationStatus;
  defaultOpen?: boolean;
}) {
  const vendors = [
    status.epicR4,
    status.epicDstu2,
    status.cerner,
    status.healow,
    status.veradigm,
    status.va,
    status.onpatient,
  ];

  return (
    <Disclosure defaultOpen={defaultOpen}>
      {({ open }) => (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Disclosure.Button className="flex w-full items-center justify-between px-5 py-4 text-start">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Browser and portal setup
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {status.publicUrlConfigured && status.anyPortalEnabled
                  ? 'Check which patient portals are available before connecting.'
                  : 'You can add records from files and manual entry right now. Connecting a patient portal needs a setup step on the server.'}
              </p>
            </div>
            <ChevronDownIcon
              className={`h-5 w-5 flex-shrink-0 text-gray-500 transition-transform ${
                open ? 'rotate-180' : ''
              }`}
            />
          </Disclosure.Button>
          <Disclosure.Panel className="border-t border-gray-100 px-5 py-3">
            <ul className="divide-y divide-gray-100">
              <StatusRow
                label="Public URL"
                tone={status.publicUrlConfigured ? 'ok' : 'off'}
                detail={
                  status.publicUrlConfigured
                    ? 'Configured — portals can redirect back to this app.'
                    : 'Not set up, so portals cannot send you back after sign-in. Records already on this device are unaffected.'
                }
              />
              <StatusRow
                label="Sync proxy"
                tone={status.proxyEnabled ? 'warn' : 'ok'}
                detail={
                  status.proxyEnabled
                    ? 'Enabled — the proxy can access your health data during sync.'
                    : 'Disabled — connections talk directly to the health system.'
                }
              />
              {vendors.map((vendor) => {
                const row = vendorRow(vendor);
                return (
                  <StatusRow
                    key={vendor.label}
                    label={row.label}
                    tone={row.tone}
                    detail={row.detail}
                  />
                );
              })}
            </ul>
          </Disclosure.Panel>
        </div>
      )}
    </Disclosure>
  );
}
