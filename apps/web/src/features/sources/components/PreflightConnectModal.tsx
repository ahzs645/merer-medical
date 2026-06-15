import {
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
  CheckIcon,
  LockClosedIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';

import { EMRVendor } from '../../connections/components/TenantSelectModal';
import { Modal } from '../../../shared/components/Modal';
import { ModalHeader } from '../../../shared/components/ModalHeader';

export type PendingConnection = {
  vendor: EMRVendor;
  name: string;
  fhirVersion?: 'DSTU2' | 'R4';
  /** Whether this connection will sync via the proxy. */
  useProxy: boolean;
};

const vendorLabels: Record<EMRVendor, string> = {
  epic: 'MyChart (Epic)',
  cerner: 'Cerner / Oracle Health',
  veradigm: 'Allscripts / Veradigm',
  onpatient: 'OnPatient',
  va: 'Veterans Affairs',
  healow: 'Healow (eClinicalWorks)',
  any: 'Patient portal',
};

// Most FHIR portals expose the same broad set of categories. This mirrors the
// resources the Epic R4 sync pulls (Observation, DiagnosticReport,
// MedicationRequest, Immunization, Condition, AllergyIntolerance,
// DocumentReference, Procedure, Goal, CareTeam, Coverage, Device, Encounter…).
const importedCategories = [
  'Labs & test results',
  'Medications',
  'Immunizations',
  'Conditions & problems',
  'Allergies',
  'Procedures',
  'Documents & notes',
  'Encounters & visits',
  'Insurance & coverage',
  'Care team & goals',
  'Vitals & observations',
  'Devices',
];

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-primary-600 mt-0.5 h-5 w-5 flex-shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

/**
 * Shown before redirecting a user to a patient portal's OAuth screen so they
 * understand exactly what is about to happen: which portal, FHIR version, sync
 * method, and which data categories will be pulled into the local record.
 */
export function PreflightConnectModal({
  pending,
  open,
  setOpen,
  onConfirm,
}: {
  pending: PendingConnection | null;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onConfirm: () => void;
}) {
  const vendorLabel = pending ? vendorLabels[pending.vendor] : '';
  const fhirVersion =
    pending?.fhirVersion === 'DSTU2'
      ? 'DSTU2 (legacy)'
      : pending?.fhirVersion === 'R4'
        ? 'R4 (modern)'
        : 'Determined by the portal';
  const syncMethod = pending?.useProxy
    ? 'Proxy-assisted sync'
    : 'Direct sync (browser ↔ health system)';

  return (
    <Modal open={open} setOpen={setOpen} overflowXHidden>
      <ModalHeader
        title="Before you connect"
        subtitle={
          pending
            ? `You're about to connect to ${pending.name}. Here's what to expect.`
            : ''
        }
        setClose={(x: boolean) => setOpen(x)}
      />
      <div className="px-4 pb-2">
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-4">
          <InfoRow
            icon={<ServerIcon />}
            label="Portal"
            value={vendorLabel || pending?.name || ''}
          />
          <InfoRow
            icon={<ArrowsRightLeftIcon />}
            label="FHIR version"
            value={fhirVersion}
          />
          <InfoRow
            icon={
              pending?.useProxy ? <ServerIcon /> : <ArrowTopRightOnSquareIcon />
            }
            label="Sync method"
            value={syncMethod}
          />
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-900">
            What will be imported?
          </p>
          <p className="mt-1 text-xs text-gray-500">
            The portal may not have every category. Available records are pulled
            and stored locally on this device.
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            {importedCategories.map((category) => (
              <li
                key={category}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <CheckIcon className="text-primary-600 h-4 w-4 flex-shrink-0" />
                {category}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-lg bg-primary-50 p-3">
          <p className="flex items-start gap-2 text-sm text-primary-800">
            <LockClosedIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              This app stores records locally on your device. You can disconnect
              this source or delete its records at any time.
            </span>
          </p>
        </div>
      </div>

      <div className="m-4 flex justify-end gap-3">
        <button
          type="button"
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="bg-primary hover:bg-primary-600 active:bg-primary-700 inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-bold text-white shadow-sm"
          onClick={onConfirm}
        >
          Continue to {vendorLabel || 'portal'}
        </button>
      </div>
    </Modal>
  );
}
