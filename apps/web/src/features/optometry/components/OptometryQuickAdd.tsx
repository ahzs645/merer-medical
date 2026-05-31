import {
  BeakerIcon,
  CameraIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  PlusIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../../Routes';
import { OptometryEntryKind } from '../../manual-entry/manualRecordTypes';

type QuickAddItem = {
  kind: OptometryEntryKind;
  label: string;
  icon: typeof PlusIcon;
  primary?: boolean;
};

// The manual-entry form reads `?specialty=optometry&optometry=<kind>` and
// pre-selects the matching eye-care record type on load.
const QUICK_ADD_ITEMS: QuickAddItem[] = [
  {
    kind: 'glassesPrescription',
    label: 'Glasses Rx',
    icon: EyeIcon,
    primary: true,
  },
  {
    kind: 'contactLensPrescription',
    label: 'Contacts Rx',
    icon: SparklesIcon,
    primary: true,
  },
  { kind: 'checkup', label: 'Eye exam', icon: ClipboardDocumentListIcon },
  { kind: 'refraction', label: 'Refraction', icon: BeakerIcon },
  { kind: 'visualAcuity', label: 'Visual acuity', icon: EyeIcon },
  { kind: 'iop', label: 'IOP', icon: BeakerIcon },
  { kind: 'imaging', label: 'Eye image', icon: CameraIcon },
];

function addRecordLink(kind: OptometryEntryKind) {
  return `${AppRoutes.AddRecord}?specialty=optometry&optometry=${kind}`;
}

export function OptometryQuickAdd() {
  const { t } = useInterfaceLanguage();

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Add an eye-care record')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('Jump straight to the right form — fields are pre-selected.')}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_ADD_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.kind}
              to={addRecordLink(item.kind)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold shadow-sm ring-1 ${
                item.primary
                  ? 'bg-primary-700 text-white ring-primary-700 hover:bg-primary-800'
                  : 'bg-white text-gray-700 ring-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(item.label)}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
