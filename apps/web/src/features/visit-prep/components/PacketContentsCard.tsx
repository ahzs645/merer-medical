import { PacketOptions } from '../types';
import { CheckboxChip } from './CheckboxChip';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

/** Every selectable section of the printable summary. */
const SECTIONS: { key: keyof PacketOptions; label: string }[] = [
  { key: 'includeProblems', label: 'Problems' },
  { key: 'includeMedications', label: 'Medications' },
  { key: 'includeAllergies', label: 'Allergies' },
  { key: 'includeLabs', label: 'Abnormal labs' },
  { key: 'includeDocuments', label: 'Documents' },
  { key: 'includeImaging', label: 'Imaging' },
  { key: 'includeProcedures', label: 'Procedures' },
  { key: 'includeQuestions', label: 'Visit questions' },
];

export function PacketContentsCard({
  packetOptions,
  updatePacketOption,
}: {
  packetOptions: PacketOptions;
  updatePacketOption: (option: keyof PacketOptions, checked: boolean) => void;
}) {
  const { t } = useInterfaceLanguage();
  const selected = SECTIONS.filter(
    (section) => packetOptions[section.key],
  ).length;
  const allSelected = selected === SECTIONS.length;

  return (
    <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold text-gray-900">
          {t('Included records')}
        </h2>
        {/* Eight chips carry their state in the fill, which is quick to read
            but slow to count. The tally says how many are in without the
            reader tallying chips, and doubles as the label for the toggle. */}
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500">
            {selected} of {SECTIONS.length} included
          </p>
          <button
            type="button"
            onClick={() => {
              for (const section of SECTIONS) {
                updatePacketOption(section.key, !allSelected);
              }
            }}
            className="-me-1 inline-flex min-h-9 items-center rounded-md px-1 text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        {t(
          'Choose the sections for the printable summary. Visit questions includes your visit purpose and questions.',
        )}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <CheckboxChip
            key={section.key}
            checked={packetOptions[section.key]}
            label={section.label}
            onChange={(checked) => updatePacketOption(section.key, checked)}
          />
        ))}
      </div>
    </div>
  );
}
