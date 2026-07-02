import { type ComponentType } from 'react';
import {
  BeakerIcon,
  BuildingOffice2Icon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FaceSmileIcon,
  FlagIcon,
  HeartIcon,
  IdentificationIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  RectangleStackIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  UsersIcon,
} from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../Routes';

export interface RecordCategory {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /**
   * FHIR resource_type(s) that back this category, used to show an approximate
   * record count on the browse hub. Left undefined where no single resource
   * type cleanly represents the category (Vitals, aggregate views, specialty
   * connections) so we show no count rather than a misleading one.
   */
  resourceTypes?: string[];
}

export interface RecordGroup {
  heading: string;
  items: RecordCategory[];
}

/**
 * Grouped record categories — the single source of truth for both the Records
 * browse hub and the desktop side navigation. Replaces the flat 19-tab strip
 * that overflowed every viewport.
 */
export const RECORD_GROUPS: RecordGroup[] = [
  {
    heading: 'Results',
    items: [
      {
        to: AppRoutes.Labs,
        label: 'Labs',
        icon: BeakerIcon,
        resourceTypes: ['diagnosticreport'],
      },
      { to: AppRoutes.Vitals, label: 'Vitals', icon: HeartIcon },
      {
        to: AppRoutes.Imaging,
        label: 'Imaging',
        icon: PhotoIcon,
        resourceTypes: ['imagingstudy', 'media'],
      },
      {
        to: AppRoutes.Results,
        label: 'All results',
        icon: RectangleStackIcon,
      },
    ],
  },
  {
    heading: 'Health profile',
    items: [
      {
        to: AppRoutes.Problems,
        label: 'Problems',
        icon: ExclamationCircleIcon,
        resourceTypes: ['condition'],
      },
      {
        to: AppRoutes.Conditions,
        label: 'My conditions',
        icon: Squares2X2Icon,
      },
      {
        to: AppRoutes.Allergies,
        label: 'Allergies',
        icon: ExclamationTriangleIcon,
        resourceTypes: ['allergyintolerance'],
      },
      {
        to: AppRoutes.Medications,
        label: 'Medications',
        icon: ClipboardDocumentListIcon,
        resourceTypes: [
          'medicationstatement',
          'medicationrequest',
          'medicationdispense',
        ],
      },
      {
        to: AppRoutes.Immunizations,
        label: 'Immunizations',
        icon: ShieldCheckIcon,
        resourceTypes: ['immunization'],
      },
    ],
  },
  {
    heading: 'Care & visits',
    items: [
      {
        to: AppRoutes.Encounters,
        label: 'Visits',
        icon: BuildingOffice2Icon,
        resourceTypes: ['encounter'],
      },
      {
        to: AppRoutes.Referrals,
        label: 'Referrals',
        icon: PaperAirplaneIcon,
        resourceTypes: ['servicerequest'],
      },
      {
        to: AppRoutes.CarePlans,
        label: 'Care plans',
        icon: ClipboardDocumentCheckIcon,
        resourceTypes: ['careplan'],
      },
      {
        to: AppRoutes.Procedures,
        label: 'Procedures',
        icon: ScissorsIcon,
        resourceTypes: ['procedure'],
      },
      {
        to: AppRoutes.Goals,
        label: 'Goals',
        icon: FlagIcon,
        resourceTypes: ['goal'],
      },
      {
        to: AppRoutes.Histories,
        label: 'Histories',
        icon: UsersIcon,
        resourceTypes: ['familymemberhistory'],
      },
    ],
  },
  {
    heading: 'Documents & admin',
    items: [
      {
        to: AppRoutes.Documents,
        label: 'Documents',
        icon: DocumentTextIcon,
        resourceTypes: ['documentreference'],
      },
      {
        to: AppRoutes.Insurance,
        label: 'Insurance',
        icon: IdentificationIcon,
        resourceTypes: ['coverage'],
      },
      {
        to: AppRoutes.Directory,
        label: 'Providers',
        icon: UsersIcon,
        resourceTypes: [
          'careteam',
          'practitioner',
          'practitionerrole',
          'organization',
        ],
      },
    ],
  },
  {
    heading: 'Specialty',
    items: [
      { to: AppRoutes.Dental, label: 'Dental', icon: FaceSmileIcon },
      { to: AppRoutes.Optometry, label: 'Optometry', icon: EyeIcon },
    ],
  },
];

/** Flat list of every category (for search / lookups). */
export const ALL_RECORD_CATEGORIES: RecordCategory[] = RECORD_GROUPS.flatMap(
  (group) => group.items,
);
