import { useMemo, useState } from 'react';

import {
  DentalActionLevel,
  DentalNumberingSystem,
  DentalRecord,
  DentalTooth,
  OdontogramToothStatus,
} from '../types';
import {
  ALL_TEETH,
  DECIDUOUS_TEETH,
  UNIVERSAL_TEETH,
  describeTooth,
} from '../utils/dentalReferenceData';
import {
  buildArchRows,
  ChartDentition,
  ChartSlot,
} from '../utils/toothChartLayout';
import { recordActionLevel } from '../utils/dentalClinicalModels';
import { useToothNumbering } from '../hooks/useToothNumbering';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { formatRecordDate } from '../../../shared/utils/dateFormatters';
import { RecordTitleLink } from './RecordTitleLink';

const DENTITION_OPTIONS: { value: ChartDentition; label: string }[] = [
  { value: 'permanent', label: 'Adult' },
  { value: 'deciduous', label: 'Baby' },
  { value: 'mixed', label: 'Both' },
];

const NUMBERING_OPTIONS: { value: DentalNumberingSystem; label: string }[] = [
  { value: 'universal', label: 'Universal (US)' },
  { value: 'fdi', label: 'FDI (international)' },
];

const TEETH_BY_DENTITION: Record<ChartDentition, DentalTooth[]> = {
  permanent: UNIVERSAL_TEETH,
  deciduous: DECIDUOUS_TEETH,
  mixed: ALL_TEETH,
};

/**
 * The four standings a tooth or a record can have, named once and used for
 * the legend, the teeth and every record row. They used to be named three
 * ways on one page (legend "Needs attention", badges "ACTIVE", and grey in
 * one panel where the chart drew blue). Each carries a mark as well as a
 * colour, so the chart does not depend on colour alone.
 */
export const TOOTH_LEVELS: Record<
  DentalActionLevel,
  { label: string; mark: string; tooth: string; badge: string; dot: string }
> = {
  active: {
    label: 'Needs attention',
    mark: '!',
    dot: 'bg-red-700 text-white',
    tooth: 'border-red-400 bg-red-100 text-red-900 hover:bg-red-200',
    badge: 'bg-red-50 text-red-800 ring-red-200',
  },
  planned: {
    label: 'Treatment planned',
    mark: '+',
    dot: 'bg-amber-600 text-white',
    tooth: 'border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200',
    badge: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
  complete: {
    label: 'Treatment done',
    mark: '✓',
    dot: 'bg-emerald-700 text-white',
    tooth:
      'border-emerald-400 bg-emerald-100 text-emerald-900 hover:bg-emerald-200',
    badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  },
  watch: {
    label: 'Record on file',
    mark: '•',
    dot: 'bg-sky-700 text-white',
    tooth: 'border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100',
    badge: 'bg-sky-50 text-sky-800 ring-sky-200',
  },
};

const LEVEL_ORDER: DentalActionLevel[] = [
  'active',
  'planned',
  'complete',
  'watch',
];

/**
 * The tooth chart: one chart, drawn the way a dentist charts — facing you, so
 * your right side is on the left — with the upper arch over the lower and
 * opposing teeth in the same column.
 *
 * It replaces an anatomical drawing (react-odontogram) that sat beside the
 * numbered grid and disagreed with it: the drawing's lower arch ran 38→48,
 * mirrored, so the same screen position was #19 on one chart and #30 on the
 * other. It also ignored the dentition toggle, didn't follow the grid's
 * selection, announced FDI numbers on a Universal page, and its teeth were
 * 14 × 17 px on a phone.
 */
export function ToothChartPanel({
  recordsByTooth,
  statuses,
}: {
  recordsByTooth: Map<string, DentalRecord[]>;
  statuses: OdontogramToothStatus[];
}) {
  const { t } = useInterfaceLanguage();
  const [numbering, setNumbering] = useToothNumbering();
  const [dentition, setDentition] = useState<ChartDentition>(() =>
    statuses.some((status) => /^[A-T]$/.test(status.tooth))
      ? 'mixed'
      : 'permanent',
  );
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);

  const levelByTooth = useMemo(
    () => new Map(statuses.map((status) => [status.tooth, status.actionLevel])),
    [statuses],
  );
  const teeth = TEETH_BY_DENTITION[dentition];

  return (
    <section
      aria-labelledby="dental-tooth-chart"
      className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2
            id="dental-tooth-chart"
            className="text-base font-semibold text-gray-900"
          >
            {t('Tooth chart')}
          </h2>
          <p className="text-sm text-gray-600">
            {t(
              'Drawn as your dentist sees you: your right side is on the left.',
            )}{' '}
            {numbering === 'fdi'
              ? t('The small number is the US (Universal) number.')
              : t('The small number is the international (FDI) number.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <SegmentedControl
            label={t('Numbering')}
            options={NUMBERING_OPTIONS}
            value={numbering}
            onChange={setNumbering}
          />
          <SegmentedControl
            label={t('Teeth')}
            options={DENTITION_OPTIONS}
            value={dentition}
            onChange={setDentition}
          />
        </div>
      </div>

      <Legend />

      <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {/* A mouth is a wide strip. On a phone it scrolls sideways rather
              than wrapping an arch onto a second row, which drew your upper
              left below your upper right. */}
          <div className="-mx-1 overflow-x-auto px-1 pb-2">
            <div className="min-w-[640px] sm:min-w-0">
              <SideLabels />
              <Arch
                label={t('Upper')}
                rows={buildArchRows(teeth, 'upper', dentition)}
                levelByTooth={levelByTooth}
                recordsByTooth={recordsByTooth}
                numbering={numbering}
                selectedTooth={selectedTooth}
                onSelect={setSelectedTooth}
              />
              <div className="my-2 border-t border-dashed border-gray-300" />
              <Arch
                label={t('Lower')}
                rows={buildArchRows(teeth, 'lower', dentition)}
                levelByTooth={levelByTooth}
                recordsByTooth={recordsByTooth}
                numbering={numbering}
                selectedTooth={selectedTooth}
                onSelect={setSelectedTooth}
              />
            </div>
          </div>
        </div>
        <ToothDetail
          selectedTooth={selectedTooth}
          onSelect={setSelectedTooth}
          statuses={statuses}
          recordsByTooth={recordsByTooth}
          numbering={numbering}
        />
      </div>
    </section>
  );
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { t } = useInterfaceLanguage();
  return (
    <div role="group" aria-label={label}>
      <p className="mb-1 text-xs font-medium text-gray-600">{label}</p>
      <div className="inline-flex rounded-md border border-gray-200 p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-[44px] rounded px-3 text-sm font-medium ${
              value === option.value
                ? 'bg-primary-800 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {t(option.label)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Legend() {
  const { t } = useInterfaceLanguage();
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
      {LEVEL_ORDER.map((level) => (
        <li key={level} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`relative inline-block h-5 w-5 rounded border ${TOOTH_LEVELS[level].tooth}`}
          >
            <span
              className={`absolute -end-1 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold leading-none ring-1 ring-white ${TOOTH_LEVELS[level].dot}`}
            >
              {TOOTH_LEVELS[level].mark}
            </span>
          </span>
          {t(TOOTH_LEVELS[level].label)}
        </li>
      ))}
    </ul>
  );
}

function SideLabels() {
  const { t } = useInterfaceLanguage();
  return (
    <div className="ms-14 mb-1 grid grid-cols-2 text-xs font-medium text-gray-600">
      <span>← {t('Your right')}</span>
      <span className="text-end">{t('Your left')} →</span>
    </div>
  );
}

function Arch({
  label,
  rows,
  levelByTooth,
  recordsByTooth,
  numbering,
  selectedTooth,
  onSelect,
}: {
  label: string;
  rows: ChartSlot[][];
  levelByTooth: Map<string, DentalActionLevel>;
  recordsByTooth: Map<string, DentalRecord[]>;
  numbering: DentalNumberingSystem;
  selectedTooth: string | null;
  onSelect: (tooth: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <p className="w-12 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-600">
        {label}
      </p>
      <div className="grid min-w-0 flex-1 gap-1">
        {rows.map((row, rowIndex) => {
          const half = row.length / 2;
          return (
            <div key={rowIndex} className="flex gap-1">
              {[row.slice(0, half), row.slice(half)].map((side, sideIndex) => (
                <div
                  key={sideIndex}
                  className={`grid flex-1 gap-1 ${
                    sideIndex === 0 ? 'border-e-2 border-gray-300 pe-1' : ''
                  }`}
                  style={{
                    gridTemplateColumns: `repeat(${side.length}, minmax(0, 1fr))`,
                  }}
                >
                  {side.map((slot, index) =>
                    slot ? (
                      <ToothButton
                        key={slot.universal}
                        tooth={slot}
                        level={levelByTooth.get(slot.universal)}
                        recordCount={
                          recordsByTooth.get(slot.universal)?.length || 0
                        }
                        numbering={numbering}
                        selected={selectedTooth === slot.universal}
                        onSelect={() =>
                          onSelect(
                            selectedTooth === slot.universal
                              ? null
                              : slot.universal,
                          )
                        }
                      />
                    ) : (
                      <span key={`gap-${index}`} aria-hidden="true" />
                    ),
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToothButton({
  tooth,
  level,
  recordCount,
  numbering,
  selected,
  onSelect,
}: {
  tooth: DentalTooth;
  level?: DentalActionLevel;
  recordCount: number;
  numbering: DentalNumberingSystem;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useInterfaceLanguage();
  const { primary, secondary, name } = describeTooth(
    tooth.universal,
    numbering,
  );
  // The other system's number, bare: "FDI 18" wrapped in a 28 px button.
  const other = secondary.replace(/^FDI |^#/, '');
  const style = level ? TOOTH_LEVELS[level] : undefined;
  const description = [
    `${t('Tooth')} ${primary}`,
    t(name),
    style ? t(style.label) : t('No records'),
    recordCount
      ? (recordCount === 1
          ? t('{count} record')
          : t('{count} records')
        ).replace('{count}', `${recordCount}`)
      : undefined,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={description}
      onClick={onSelect}
      className={`relative flex min-h-[44px] flex-col items-center justify-center rounded-md border text-center leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 ${
        selected
          ? 'border-primary-700 bg-primary-700 text-white'
          : style
            ? style.tooth
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {style && (
        <span
          aria-hidden="true"
          className={`absolute -end-1 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold leading-none ring-1 ring-white ${style.dot}`}
        >
          {style.mark}
        </span>
      )}
      <span className="text-xs font-semibold">{primary}</span>
      <span className="text-[10px] opacity-80">{other}</span>
    </button>
  );
}

/**
 * Beside the chart: the selected tooth's whole history, each record with its
 * own standing — or, with nothing selected, the teeth that need something.
 * This replaces two panels under the chart that listed the same teeth twice
 * (one card per tooth, then one per record per tooth) and left completed
 * work out of a panel called a timeline.
 */
function ToothDetail({
  selectedTooth,
  onSelect,
  statuses,
  recordsByTooth,
  numbering,
}: {
  selectedTooth: string | null;
  onSelect: (tooth: string | null) => void;
  statuses: OdontogramToothStatus[];
  recordsByTooth: Map<string, DentalRecord[]>;
  numbering: DentalNumberingSystem;
}) {
  const { t } = useInterfaceLanguage();

  if (!selectedTooth) {
    const flagged = statuses
      .filter(
        (status) =>
          status.actionLevel === 'active' || status.actionLevel === 'planned',
      )
      .sort(
        (a, b) =>
          LEVEL_ORDER.indexOf(a.actionLevel) -
          LEVEL_ORDER.indexOf(b.actionLevel),
      );
    return (
      <div className="rounded-md bg-gray-50 p-3">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('Teeth that need something')}
        </h3>
        {flagged.length === 0 ? (
          <p className="mt-1 text-sm text-gray-600">
            {statuses.length === 0
              ? t('No record names a tooth yet.')
              : t('Nothing open. Select a tooth to see its history.')}
          </p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {flagged.map((status) => {
              const tooth = describeTooth(status.tooth, numbering);
              const latest =
                status.activeRecords[0] || status.plannedRecords[0];
              return (
                <li key={status.tooth}>
                  <button
                    type="button"
                    onClick={() => onSelect(status.tooth)}
                    className="flex min-h-[44px] w-full flex-col items-start rounded-md bg-white p-2 text-start ring-1 ring-gray-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {t('Tooth')} {tooth.primary}
                        <span className="font-normal text-gray-600">
                          {' · '}
                          {t(tooth.name)}
                        </span>
                      </span>
                      <LevelBadge level={status.actionLevel} />
                    </span>
                    {latest && (
                      <span className="mt-0.5 text-xs text-gray-700">
                        {latest.title}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  const tooth = describeTooth(selectedTooth, numbering);
  const records = [...(recordsByTooth.get(selectedTooth) || [])]
    .filter((record) => record.status !== 'cancelled')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="rounded-md bg-gray-50 p-3" aria-live="polite">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('Tooth')} {tooth.primary}
            <span className="ms-1 text-xs font-normal text-gray-600">
              ({tooth.secondary})
            </span>
          </h3>
          <p className="text-xs text-gray-600">{t(tooth.name)}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="min-h-[44px] rounded-md px-2 text-sm font-medium text-primary-700 hover:bg-gray-100"
        >
          {t('Clear')}
        </button>
      </div>
      {records.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">
          {t('No records for this tooth.')}
        </p>
      ) : (
        <ol className="mt-2 grid gap-2">
          {records.map((record) => (
            <li key={record.id} className="rounded-md bg-white p-2">
              <div className="flex items-start justify-between gap-2">
                <RecordTitleLink
                  record={record}
                  className="text-sm font-medium text-gray-900"
                />
                <LevelBadge level={recordActionLevel(record, recordsByTooth)} />
              </div>
              <p className="mt-0.5 text-xs text-gray-600">
                {[
                  formatRecordDate(record.date, t('Undated')),
                  record.surfaces.length
                    ? `${t('Surfaces')}: ${record.surfaces.join(', ')}`
                    : undefined,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {record.summary && (
                <p className="mt-1 line-clamp-2 text-xs text-gray-700">
                  {record.summary}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function LevelBadge({ level }: { level: DentalActionLevel }) {
  const { t } = useInterfaceLanguage();
  const style = TOOTH_LEVELS[level];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${style.badge}`}
    >
      <span aria-hidden="true">{style.mark}</span>
      {t(style.label)}
    </span>
  );
}
