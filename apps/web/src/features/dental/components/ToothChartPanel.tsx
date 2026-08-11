import { useMemo, useState } from 'react';
import { Odontogram, ToothDetail } from 'react-odontogram';
import 'react-odontogram/style.css';

import {
  DentalActionLevel,
  DentalRecord,
  DentalTooth,
  OdontogramToothStatus,
} from '../types';
import {
  ALL_TEETH,
  DECIDUOUS_TEETH,
  UNIVERSAL_TEETH,
} from '../utils/dentalReferenceData';
import { orderArchForDisplay } from '../utils/toothChartLayout';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { formatRecordDate } from '../../../shared/utils/dateFormatters';

type Dentition = 'permanent' | 'deciduous' | 'mixed';

const DENTITION_OPTIONS: { value: Dentition; label: string }[] = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'deciduous', label: 'Deciduous' },
  { value: 'mixed', label: 'Mixed' },
];

const TEETH_BY_DENTITION: Record<Dentition, DentalTooth[]> = {
  permanent: UNIVERSAL_TEETH,
  deciduous: DECIDUOUS_TEETH,
  mixed: ALL_TEETH,
};

/**
 * Colours every tooth on the chart by the state its records put it in. The
 * odontogram only lists the groups we hand it in its legend, so this doubles
 * as the legend content — a single "Records" swatch explained nothing.
 * Fills are Tailwind's 100 shades so the swatches match the tooth buttons
 * below, which use the same scale.
 */
const TOOTH_STATES: {
  actionLevel: DentalActionLevel;
  label: string;
  fillColor: string;
  outlineColor: string;
  buttonClass: string;
}[] = [
  {
    actionLevel: 'active',
    label: 'Needs attention',
    fillColor: '#fee2e2',
    outlineColor: '#b91c1c',
    buttonClass: 'border-red-300 bg-red-100 text-red-900 hover:bg-red-200',
  },
  {
    actionLevel: 'planned',
    label: 'Treatment planned',
    fillColor: '#fef3c7',
    outlineColor: '#b45309',
    buttonClass:
      'border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200',
  },
  {
    actionLevel: 'complete',
    label: 'Treatment done',
    fillColor: '#d1fae5',
    outlineColor: '#047857',
    buttonClass:
      'border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200',
  },
  {
    actionLevel: 'watch',
    label: 'Record on file',
    fillColor: '#dbeafe',
    outlineColor: '#0369a1',
    buttonClass: 'border-sky-300 bg-sky-100 text-sky-900 hover:bg-sky-200',
  },
];

export function ToothChartPanel({
  recordsByTooth,
  statuses,
}: {
  recordsByTooth: Map<string, DentalRecord[]>;
  statuses: OdontogramToothStatus[];
}) {
  const { t } = useInterfaceLanguage();
  const [dentition, setDentition] = useState<Dentition>('permanent');
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);

  const stateByTooth = useMemo(
    () => new Map(statuses.map((status) => [status.tooth, status.actionLevel])),
    [statuses],
  );

  const teethConditions = useMemo(
    () =>
      TOOTH_STATES.map(({ actionLevel, label, fillColor, outlineColor }) => ({
        label,
        // The drawn arch is the permanent dentition, and its tooth ids are
        // `teeth-<FDI>`; deciduous statuses simply have nothing to paint.
        teeth: statuses
          .filter(
            (status) =>
              status.actionLevel === actionLevel && Number(status.fdi[0]) <= 4,
          )
          .map((status) => `teeth-${status.fdi}`),
        outlineColor,
        fillColor,
      })).filter((condition) => condition.teeth.length > 0),
    [statuses],
  );

  function handleOdontogramChange(selected: ToothDetail[]) {
    const universal = selected[selected.length - 1]?.notations.universal;
    setSelectedTooth(universal ? `${universal}` : null);
  }

  const teeth = TEETH_BY_DENTITION[dentition];
  const selectedRecords = selectedTooth
    ? recordsByTooth.get(selectedTooth) || []
    : [];

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          {t('Tooth chart')}
        </h2>
        <p className="text-sm text-gray-600">
          {t(
            'Universal numbering with FDI labels, ready for surface-level findings.',
          )}
        </p>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="self-start overflow-hidden rounded-md border border-gray-200 bg-gray-50 p-3">
          <Odontogram
            layout="square"
            notation="Universal"
            teethConditions={teethConditions}
            // The odontogram renders its legend only when labels are on.
            showLabels
            onChange={handleOdontogramChange}
            tooltip={{
              content: (tooth) =>
                tooth ? (
                  <div className="text-xs">
                    <p className="font-semibold">
                      {t('Tooth')} {tooth.notations.universal}
                    </p>
                    <p>FDI {tooth.notations.fdi}</p>
                    <p>{tooth.type}</p>
                  </div>
                ) : null,
            }}
          />
        </div>
        <div className="grid content-start gap-3">
          <DentitionToggle dentition={dentition} onChange={setDentition} />
          <ToothGrid
            teeth={teeth}
            recordsByTooth={recordsByTooth}
            stateByTooth={stateByTooth}
            selectedTooth={selectedTooth}
            onSelectTooth={(tooth) =>
              setSelectedTooth((current) => (current === tooth ? null : tooth))
            }
          />
          <SelectedToothRecords
            selectedTooth={selectedTooth}
            records={selectedRecords}
          />
        </div>
      </div>
    </section>
  );
}

function DentitionToggle({
  dentition,
  onChange,
}: {
  dentition: Dentition;
  onChange: (dentition: Dentition) => void;
}) {
  const { t } = useInterfaceLanguage();

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {t('Dentition')}
      </p>
      <div
        className="inline-flex rounded-md border border-gray-200 p-0.5"
        role="group"
      >
        {DENTITION_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={dentition === value}
            onClick={() => onChange(value)}
            className={`rounded px-2.5 py-1 text-xs font-medium ${
              dentition === value
                ? 'bg-primary-800 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToothGrid({
  teeth,
  recordsByTooth,
  stateByTooth,
  selectedTooth,
  onSelectTooth,
}: {
  teeth: DentalTooth[];
  recordsByTooth: Map<string, DentalRecord[]>;
  stateByTooth: Map<string, DentalActionLevel>;
  selectedTooth: string | null;
  onSelectTooth: (tooth: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <ToothArch
        label="Upper"
        teeth={orderArchForDisplay(teeth, 'upper')}
        recordsByTooth={recordsByTooth}
        stateByTooth={stateByTooth}
        selectedTooth={selectedTooth}
        onSelectTooth={onSelectTooth}
      />
      <ToothArch
        label="Lower"
        teeth={orderArchForDisplay(teeth, 'lower')}
        recordsByTooth={recordsByTooth}
        stateByTooth={stateByTooth}
        selectedTooth={selectedTooth}
        onSelectTooth={onSelectTooth}
      />
    </div>
  );
}

function ToothArch({
  label,
  teeth,
  recordsByTooth,
  stateByTooth,
  selectedTooth,
  onSelectTooth,
}: {
  label: string;
  teeth: DentalTooth[];
  recordsByTooth: Map<string, DentalRecord[]>;
  stateByTooth: Map<string, DentalActionLevel>;
  selectedTooth: string | null;
  onSelectTooth: (tooth: string) => void;
}) {
  const { t } = useInterfaceLanguage();

  if (teeth.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {t(label)}
      </p>
      <div className="grid grid-cols-8 gap-1 sm:grid-cols-16">
        {teeth.map((tooth) => {
          const count = recordsByTooth.get(tooth.universal)?.length || 0;
          const isSelected = selectedTooth === tooth.universal;
          const state = TOOTH_STATES.find(
            (item) => item.actionLevel === stateByTooth.get(tooth.universal),
          );
          return (
            <button
              key={tooth.universal}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectTooth(tooth.universal)}
              title={`${t('Tooth')} ${tooth.universal}, FDI ${tooth.fdi}`}
              className={`aspect-square rounded-md border text-center text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                isSelected
                  ? 'border-primary-700 bg-primary-700 text-white'
                  : count > 0 && state
                    ? state.buttonClass
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="block">{tooth.universal}</span>
              <span className="block text-[10px] font-normal">{tooth.fdi}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectedToothRecords({
  selectedTooth,
  records,
}: {
  selectedTooth: string | null;
  records: DentalRecord[];
}) {
  const { t } = useInterfaceLanguage();

  return (
    <div className="rounded-md bg-gray-50 p-3">
      <h3 className="text-sm font-semibold text-gray-900">
        {selectedTooth
          ? `${t('Records for tooth')} ${selectedTooth}`
          : t('Selected tooth')}
      </h3>
      {!selectedTooth ? (
        <p className="mt-1 text-sm text-gray-600">
          {t('Select a tooth to view its records.')}
        </p>
      ) : records.length > 0 ? (
        <ul className="mt-2 grid gap-2">
          {records.slice(0, 8).map((record) => (
            <li key={record.id} className="rounded-md bg-white p-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">
                  {record.title}
                </p>
                <span className="shrink-0 text-xs font-medium uppercase text-gray-500">
                  {record.kind}
                </span>
              </div>
              {record.date && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatRecordDate(record.date)}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-gray-600">
          {t('No records for this tooth.')}
        </p>
      )}
    </div>
  );
}
