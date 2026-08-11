import { type ComponentType } from 'react';
import {
  BeakerIcon,
  BuildingOffice2Icon,
  ChartPieIcon,
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
  SparklesIcon,
  Squares2X2Icon,
  UsersIcon,
} from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../Routes';

export interface RecordSubPage {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Match this sub-page only on the exact path (for index/overview routes). */
  end?: boolean;
}

export interface RecordCategory {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /**
   * FHIR resource_type(s) that back this category, used to show a record count
   * on the browse hub and side nav. Set ONLY where the tally equals the number
   * of rows the target page actually lists (a clean 1:1 mapping). Left
   * undefined for categories whose page shows derived, filtered, de-duplicated
   * or multi-type data (Labs, Vitals, Imaging, My conditions, Providers,
   * aggregate/specialty views) rather than show a wrong number — those render
   * an explicit "not counted" state so they don't read as empty.
   */
  resourceTypes?: string[];
  /**
   * What the category holds, in three or four words. Shown on the browse hub
   * in place of a tally for the categories that have none — "Not counted" on
   * five of the most-used cards reads as something being broken, where "Blood
   * work and panels" reads as the category doing its job.
   */
  blurb?: string;
  /**
   * Sub-pages of a specialty workspace (Dental, Optometry). The desktop side
   * nav renders these as an indented list while the category is active, so
   * wide viewports don't need the second horizontal tab row inside the page.
   */
  children?: RecordSubPage[];
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
      // Labs, Vitals and Imaging show derived/filtered/multi-type data
      // (lab panels + observations, vital-sign-filtered observations, imaging
      // studies + reports), so no single resource_type tally matches the page.
      // We omit their counts rather than show a misleading number.
      {
        to: AppRoutes.Labs,
        label: 'Labs',
        icon: BeakerIcon,
        blurb: 'Blood work and panels',
      },
      {
        to: AppRoutes.Vitals,
        label: 'Vitals',
        icon: HeartIcon,
        blurb: 'Measurements over time',
      },
      {
        to: AppRoutes.Imaging,
        label: 'Imaging',
        icon: PhotoIcon,
        blurb: 'Scans and reports',
      },
      {
        to: AppRoutes.Results,
        label: 'All results',
        icon: RectangleStackIcon,
        blurb: 'Everything with a result',
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
        blurb: 'Grouped by topic',
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
        // No `resourceTypes`, on the rule stated above: this page lists four
        // sections — medical (conditions), surgical (procedures), family and
        // social — so counting only `familymemberhistory` promised "3 records"
        // and opened on a thirteen-row Medical history list. There is no single
        // tally that matches the page, so it does not claim one.
        blurb: 'Medical, surgical, family, social',
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
        resourceTypes: ['documentreference', 'documentreference_attachment'],
      },
      {
        to: AppRoutes.Insurance,
        label: 'Insurance',
        icon: IdentificationIcon,
        resourceTypes: ['coverage'],
      },
      // Providers/locations are derived and de-duplicated from CareTeam and
      // Encounter.location, so a raw resource_type tally doesn't match the
      // number of rows shown — omit the count.
      {
        to: AppRoutes.Directory,
        label: 'Providers',
        icon: UsersIcon,
        blurb: 'People and places',
      },
    ],
  },
  {
    heading: 'Specialty',
    items: [
      {
        to: AppRoutes.Dental,
        label: 'Dental',
        blurb: 'Teeth, hygiene, imaging',
        icon: FaceSmileIcon,
        children: [
          {
            to: AppRoutes.Dental,
            label: 'Overview',
            icon: ChartPieIcon,
            end: true,
          },
          {
            to: AppRoutes.DentalChart,
            label: 'Chart & teeth',
            icon: Squares2X2Icon,
          },
          {
            to: AppRoutes.DentalTreatment,
            label: 'Treatment',
            icon: ClipboardDocumentCheckIcon,
          },
          {
            to: AppRoutes.DentalHygiene,
            label: 'Hygiene & perio',
            icon: SparklesIcon,
          },
          {
            to: AppRoutes.DentalImaging,
            label: 'Imaging & scans',
            icon: PhotoIcon,
          },
          {
            to: AppRoutes.DentalRecords,
            label: 'Records & claims',
            icon: DocumentTextIcon,
          },
        ],
      },
      {
        to: AppRoutes.Optometry,
        label: 'Optometry',
        blurb: 'Eyes, prescriptions, exams',
        icon: EyeIcon,
        children: [
          {
            to: AppRoutes.Optometry,
            label: 'Overview',
            icon: ChartPieIcon,
            end: true,
          },
          {
            to: AppRoutes.OptometryPrescriptions,
            label: 'Prescriptions',
            icon: Squares2X2Icon,
          },
          {
            to: AppRoutes.OptometryExams,
            label: 'Exams & metrics',
            icon: ClipboardDocumentListIcon,
          },
          {
            to: AppRoutes.OptometrySurgery,
            label: 'Surgery & procedures',
            icon: ScissorsIcon,
          },
          {
            to: AppRoutes.OptometryImaging,
            label: 'Imaging & scans',
            icon: PhotoIcon,
          },
          {
            to: AppRoutes.OptometryRecords,
            label: 'Records',
            icon: DocumentTextIcon,
          },
        ],
      },
    ],
  },
];

/** Flat list of every category (for search / lookups). */
export const ALL_RECORD_CATEGORIES: RecordCategory[] = RECORD_GROUPS.flatMap(
  (group) => group.items,
);
