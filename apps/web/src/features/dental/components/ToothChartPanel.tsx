import { useMemo, useState } from 'react';
import { Odontogram, ToothDetail } from 'react-odontogram';
import 'react-odontogram/style.css';

import { DentalRecord } from '../types';
import { UNIVERSAL_TEETH } from '../utils/dentalReferenceData';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function ToothChartPanel({
  recordsByTooth,
}: {
  recordsByTooth: Map<string, DentalRecord[]>;
}) {
  const [selectedTeeth, setSelectedTeeth] = useState<ToothDetail[]>([]);
  const { t } = useInterfaceLanguage();
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
  const selectedUniversal = selectedTeeth
    .map((tooth) => tooth.notations.universal)
    .join(', ');

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
            onChange={setSelectedTeeth}
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
          <div className="rounded-md bg-gray-50 p-3">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('Selected teeth')}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {selectedUniversal || t('Select teeth on the odontogram.')}
            </p>
          </div>
          <LegacyToothGrid recordsByTooth={recordsByTooth} />
        </div>
      </div>
    </section>
  );
}

function LegacyToothGrid({
  recordsByTooth,
}: {
  recordsByTooth: Map<string, DentalRecord[]>;
}) {
  return (
    <div className="grid gap-3">
      <ToothArch
        label="Upper"
        teeth={UNIVERSAL_TEETH.filter((tooth) => tooth.arch === 'upper')}
        recordsByTooth={recordsByTooth}
      />
      <ToothArch
        label="Lower"
        teeth={UNIVERSAL_TEETH.filter((tooth) => tooth.arch === 'lower')}
        recordsByTooth={recordsByTooth}
      />
    </div>
  );
}

function ToothArch({
  label,
  teeth,
  recordsByTooth,
}: {
  label: string;
  teeth: typeof UNIVERSAL_TEETH;
  recordsByTooth: Map<string, DentalRecord[]>;
}) {
  const { t } = useInterfaceLanguage();

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {t(label)}
      </p>
      <div className="grid grid-cols-8 gap-1 sm:grid-cols-16">
        {teeth.map((tooth) => {
          const count = recordsByTooth.get(tooth.universal)?.length || 0;
          return (
            <button
              key={tooth.universal}
              type="button"
              title={`${t('Tooth')} ${tooth.universal}, FDI ${tooth.fdi}`}
              className={`aspect-square rounded-md border text-center text-xs font-semibold ${
                count > 0
                  ? 'border-primary-600 bg-primary-50 text-primary-800'
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
