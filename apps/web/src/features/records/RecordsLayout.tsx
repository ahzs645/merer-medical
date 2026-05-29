import { NavLink, Outlet } from 'react-router-dom';

import {
  BeakerIcon,
  DocumentTextIcon,
  DocumentPlusIcon,
  EyeIcon,
  FaceSmileIcon,
  ClipboardDocumentListIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../Routes';

const recordTabs = [
  { to: AppRoutes.Labs, label: 'Labs', icon: BeakerIcon },
  { to: AppRoutes.Documents, label: 'Documents', icon: DocumentTextIcon },
  { to: AppRoutes.Imaging, label: 'Imaging', icon: PhotoIcon },
  {
    to: AppRoutes.Medications,
    label: 'Medications',
    icon: ClipboardDocumentListIcon,
  },
  { to: AppRoutes.Dental, label: 'Dental', icon: FaceSmileIcon },
  { to: AppRoutes.Optometry, label: 'Optometry', icon: EyeIcon },
  { to: AppRoutes.AddRecord, label: 'Add record', icon: DocumentPlusIcon },
];

export function RecordsLayout() {
  const { t } = useInterfaceLanguage();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-2 sm:px-6 lg:px-8">
        <nav
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto py-2 sm:gap-2"
          aria-label="Records"
        >
          {recordTabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium sm:gap-2 sm:px-3 ${
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {t(label)}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
