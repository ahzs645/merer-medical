import {
  DocumentArrowDownIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

import { CheckboxField } from './CheckboxField';

export function RecordPackageCard({
  includeAttachments,
  setIncludeAttachments,
  includeAuditTrail,
  setIncludeAuditTrail,
  passwordProtect,
  setPasswordProtect,
  exportPassphrase,
  setExportPassphrase,
  exportBusy,
  downloadRecordPackage,
}: {
  includeAttachments: boolean;
  setIncludeAttachments: (checked: boolean) => void;
  includeAuditTrail: boolean;
  setIncludeAuditTrail: (checked: boolean) => void;
  passwordProtect: boolean;
  setPasswordProtect: (checked: boolean) => void;
  exportPassphrase: string;
  setExportPassphrase: (value: string) => void;
  exportBusy: boolean;
  downloadRecordPackage: () => void;
}) {
  return (
    <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center gap-2">
        <LockClosedIcon className="h-5 w-5 text-primary-700" />
        <h2 className="text-base font-semibold text-gray-900">
          Visit record package
        </h2>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        Export this user's records as a visit-scoped .emrpkg file for handoff or
        backup.
      </p>
      <div className="mt-3 grid gap-2">
        <CheckboxField
          checked={includeAttachments}
          label="Include embedded PDFs and attachments"
          onChange={setIncludeAttachments}
        />
        <CheckboxField
          checked={includeAuditTrail}
          label="Include audit trail"
          onChange={setIncludeAuditTrail}
        />
        <CheckboxField
          checked={passwordProtect}
          label="Password-protect package"
          onChange={setPasswordProtect}
        />
        {passwordProtect ? (
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Export password</span>
            <input
              type="password"
              value={exportPassphrase}
              onChange={(event) => setExportPassphrase(event.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
            />
          </label>
        ) : null}
        <button
          type="button"
          onClick={downloadRecordPackage}
          disabled={exportBusy || (passwordProtect && !exportPassphrase.trim())}
          className="mt-1 inline-flex w-fit items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <DocumentArrowDownIcon className="h-4 w-4" />
          {exportBusy ? 'Preparing...' : 'Download .emrpkg'}
        </button>
      </div>
    </div>
  );
}
