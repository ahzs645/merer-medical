import { Outlet } from 'react-router-dom';

import {
  BeakerIcon,
  BuildingOffice2Icon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FaceSmileIcon,
  FlagIcon,
  HeartIcon,
  IdentificationIcon,
  ClipboardDocumentListIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  UsersIcon,
} from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../Routes';
import { ScrollableTabNav } from '../../shared/components/ScrollableTabNav';

const recordTabs = [
  { to: AppRoutes.Labs, label: 'Labs', icon: BeakerIcon },
  { to: AppRoutes.Vitals, label: 'Vitals', icon: HeartIcon },
  { to: AppRoutes.Documents, label: 'Documents', icon: DocumentTextIcon },
  { to: AppRoutes.Imaging, label: 'Imaging', icon: PhotoIcon },
  {
    to: AppRoutes.Medications,
    label: 'Medications',
    icon: ClipboardDocumentListIcon,
  },
  {
    to: AppRoutes.Immunizations,
    label: 'Immunizations',
    icon: ShieldCheckIcon,
  },
  {
    to: AppRoutes.Insurance,
    label: 'Insurance',
    icon: IdentificationIcon,
  },
  {
    to: AppRoutes.CarePlans,
    label: 'Care plans',
    icon: ClipboardDocumentCheckIcon,
  },
  { to: AppRoutes.Problems, label: 'Problems', icon: ExclamationCircleIcon },
  { to: AppRoutes.Conditions, label: 'My Conditions', icon: Squares2X2Icon },
  {
    to: AppRoutes.Allergies,
    label: 'Allergies',
    icon: ExclamationTriangleIcon,
  },
  { to: AppRoutes.Procedures, label: 'Procedures', icon: ScissorsIcon },
  { to: AppRoutes.Encounters, label: 'Visits', icon: BuildingOffice2Icon },
  { to: AppRoutes.Referrals, label: 'Referrals', icon: PaperAirplaneIcon },
  { to: AppRoutes.Goals, label: 'Goals', icon: FlagIcon },
  { to: AppRoutes.Histories, label: 'Histories', icon: UsersIcon },
  { to: AppRoutes.Directory, label: 'Providers', icon: UsersIcon },
  { to: AppRoutes.Dental, label: 'Dental', icon: FaceSmileIcon },
  { to: AppRoutes.Optometry, label: 'Optometry', icon: EyeIcon },
];

export function RecordsLayout() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-2 sm:px-6 lg:px-8">
        <ScrollableTabNav tabs={recordTabs} ariaLabel="Records" />
      </div>
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
