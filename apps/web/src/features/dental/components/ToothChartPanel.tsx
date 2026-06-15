import { useMemo, useState } from 'react';
import { Odontogram, ToothDetail } from 'react-odontogram';
import 'react-odontogram/style.css';

import { DentalRecord, DentalTooth } from '../types';
import {
  ALL_TEETH,
  DECIDUOUS_TEETH,
  UNIVERSAL_TEETH,
} from '../utils/dentalReferenceData';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

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

export function ToothChartPanel({
  recordsByTooth,
}: {
  recordsByTooth: Map<string, DentalRecord[]>;
}) {
  const { t } = useInterfaceLanguage();
  const [dentition, setDentition] = useState<Dentition>('permanent');
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);

  const teethConditions = useMemo(
    () => [
      {
        label: t('Records'),
        teeth: [...recordsByTooth.keys()]
          .map((tooth) =>
            UNIVERSAL_TEETH.find((item) => item.universal === tooth),
          )
          .filter(Boolean)
          .map((tooth) => `teeth-${tooth!.fdi}`),
        outlineColor: '#0369a1',
        fillColor: '#dbeafe',
      },
    ],
    [recordsByTooth, t],
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
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
        <span className="text-xs font-medium uppercase text-gray-500">
          {t('Concept based on odontogram references')}
        </span>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-md border border-gray-200 bg-gray-50 p-3">
          <Odontogram
            layout="square"
            notation="Universal"
            teethConditions={teethConditions}
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
            selectedTooth={selectedTooth}
            onSelectTooth={(tooth) =>
              setSelectedTooth((current) =>
                current === tooth ? null : tooth,
              )
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
  selectedTooth,
  onSelectTooth,
}: {
  teeth: DentalTooth[];
  recordsByTooth: Map<string, DentalRecord[]>;
  selectedTooth: string | null;
  onSelectTooth: (tooth: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <ToothArch
        label="Upper"
        teeth={teeth.filter((tooth) => tooth.arch === 'upper')}
        recordsByTooth={recordsByTooth}
        selectedTooth={selectedTooth}
        onSelectTooth={onSelectTooth}
      />
      <ToothArch
        label="Lower"
        teeth={teeth.filter((tooth) => tooth.arch === 'lower')}
        recordsByTooth={recordsByTooth}
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
  selectedTooth,
  onSelectTooth,
}: {
  label: string;
  teeth: DentalTooth[];
  recordsByTooth: Map<string, DentalRecord[]>;
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
                  : count > 0
                    ? 'border-primary-600 bg-primary-50 text-primary-800 hover:bg-primary-100'
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
                  {record.date.split('T')[0]}
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
