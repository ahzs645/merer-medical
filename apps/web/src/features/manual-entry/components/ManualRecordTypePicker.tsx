import {
  BeakerIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FaceSmileIcon,
  FlagIcon,
  HeartIcon,
  HomeIcon,
  PaperAirplaneIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  UsersIcon,
} from '@heroicons/react/24/outline';

import type { ManualRecordFormController } from '../hooks/useManualRecordForm';

type PickerCard = {
  label: string;
  description: string;
  icon: typeof BeakerIcon;
  apply: (form: ManualRecordFormController) => void;
};

type PickerGroup = {
  title: string;
  cards: PickerCard[];
};

// Cards map the friendly entry point a user picks to the underlying record
// state. Selecting one scopes the form so its structured fields are shown.
const pickerGroups: PickerGroup[] = [
  {
    title: 'Results & measurements',
    cards: [
      {
        label: 'Lab / result',
        description:
          'Panels with one or more tests, units and reference ranges',
        icon: BeakerIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('lab');
        },
      },
      {
        label: 'Vital sign',
        description: 'Blood pressure, heart rate, weight, temperature, SpO₂',
        icon: HeartIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('vital');
        },
      },
    ],
  },
  {
    title: 'Medications & clinical history',
    cards: [
      {
        label: 'Medication',
        description: 'Dose, frequency and route for a medication you take',
        icon: ClipboardDocumentListIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('medicationstatement');
        },
      },
      {
        label: 'Condition / diagnosis',
        description: 'An ongoing or past health condition',
        icon: ExclamationCircleIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('condition');
        },
      },
      {
        label: 'Allergy',
        description: 'An allergy or intolerance and its reaction',
        icon: ExclamationTriangleIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('allergyintolerance');
        },
      },
      {
        label: 'Family history',
        description: 'A relative’s condition and how they’re related to you',
        icon: UsersIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('familymemberhistory');
        },
      },
      {
        label: 'Social history',
        description: 'Smoking, alcohol, substances, occupation and lifestyle',
        icon: HomeIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('socialhistory');
        },
      },
      {
        label: 'Immunization',
        description: 'A vaccine or immunization you received',
        icon: ShieldCheckIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('immunization');
        },
      },
      {
        label: 'Procedure',
        description: 'A procedure, test or operation that was performed',
        icon: ScissorsIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('procedure');
        },
      },
      {
        label: 'Encounter / visit',
        description: 'A clinic visit, appointment or hospital stay',
        icon: CalendarDaysIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('encounter');
        },
      },
      {
        label: 'Referral',
        description: 'A referral to a specialist, clinic or service',
        icon: PaperAirplaneIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('servicerequest');
        },
      },
      {
        label: 'Care plan',
        description: 'A plan of care, goals or follow-up instructions',
        icon: ClipboardDocumentCheckIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('careplan');
        },
      },
      {
        label: 'Health goal',
        description: 'A target you are working towards, and when you started',
        icon: FlagIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('goal');
        },
      },
      {
        label: 'Insurance / coverage',
        description: 'Payer, member ID, plan type and coverage period',
        icon: ShieldCheckIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('coverage');
        },
      },
    ],
  },
  {
    title: 'Specialty',
    cards: [
      {
        label: 'Dental',
        description: 'Tooth findings, procedures, cleanings and orthodontics',
        icon: FaceSmileIcon,
        apply: (form) => form.updateSpecialty('dental'),
      },
      {
        label: 'Eye care / optometry',
        description: 'Glasses & contact Rx, refraction, acuity, IOP, surgery',
        icon: EyeIcon,
        apply: (form) => form.updateSpecialty('optometry'),
      },
      {
        label: 'Vision prescription',
        description: 'A glasses or contact lens prescription, eye by eye',
        icon: Squares2X2Icon,
        // Goes through the optometry entry kind rather than setting the record
        // type directly: the lens fields only render under the optometry
        // specialty, so a bare `visionprescription` is a prescription form with
        // nowhere to type the prescription.
        apply: (form) => form.applyOptometryEntryKind('glassesPrescription'),
      },
    ],
  },
  {
    title: 'Files & devices',
    cards: [
      {
        label: 'Document / file',
        description: 'Attach a scan, photo, PDF or imaging report',
        icon: DocumentTextIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('document');
        },
      },
      {
        label: 'Device import',
        description: 'Import readings from a home device or FreeStyle Libre',
        icon: CpuChipIcon,
        apply: (form) => {
          form.updateSpecialty('general');
          form.setRecordType('device');
        },
      },
    ],
  },
];

export function ManualRecordTypePicker({
  form,
  onPick,
}: {
  form: ManualRecordFormController;
  onPick: () => void;
}) {
  const { t } = form;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-600">
        {t('What kind of record do you want to add?')}
      </p>
      {pickerGroups.map((group) => (
        <div key={group.title}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t(group.title)}
          </h2>
          {/* Only reach for the third column when the group has enough cards to
              fill it — otherwise short groups (Results, Specialty, Files) left
              an empty cell in the row. */}
          <div
            className={`mt-3 grid gap-3 sm:grid-cols-2 ${
              group.cards.length > 2 ? 'lg:grid-cols-3' : ''
            }`}
          >
            {group.cards.map((card) => {
              const Icon = card.icon;
              return (
                // The icon sits beside the title rather than on a line of its
                // own: stacked, seventeen cards ran to 3.5 phone screens of
                // scrolling before you could start typing, and a third of that
                // height was the icon row. Nothing is hidden or folded away —
                // the descriptions are what make the picker worth scrolling.
                <button
                  key={card.label}
                  type="button"
                  onClick={() => {
                    card.apply(form);
                    onPick();
                  }}
                  className="flex h-full items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-start shadow-sm transition-colors hover:border-primary-400 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-200"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">
                      {t(card.label)}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-600">
                      {t(card.description)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
