import { ScissorsIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../../Routes';
import { isManualRecord } from '../../../shared/utils/manualRecordUtils';
import { OptometryRecord } from '../types';
import { SurgeryDetail, buildSurgeryList } from '../utils/surgeryRecords';

export function SurgicalHistoryPanel({
  records,
}: {
  records: OptometryRecord[];
}) {
  const { t } = useInterfaceLanguage();
  const surgeries = buildSurgeryList(records);

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-gray-900">
            <ScissorsIcon className="h-5 w-5" />
            <h2 className="text-base font-semibold">{t('Surgical history')}</h2>
          </div>
          <p className="text-sm text-gray-600">
            {t(
              'Refractive and ocular surgeries — LASIK, SMILE, PRK, cataract/IOL, and more.',
            )}
          </p>
        </div>
        <span className="text-xs font-semibold uppercase text-gray-500">
          {surgeries.length} {t('surgeries')}
        </span>
      </div>

      {surgeries.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {surgeries.map((surgery) => (
            <SurgeryCard key={surgery.id} surgery={surgery} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'Eye surgeries will appear here once added or synced. Use “Surgery” in the quick-add bar to record one.',
          )}
        </p>
      )}
    </section>
  );
}

function SurgeryCard({ surgery }: { surgery: SurgeryDetail }) {
  const { t } = useInterfaceLanguage();
  const chips = [
    surgery.laserPlatform && {
      label: t('Laser'),
      value: surgery.laserPlatform,
    },
    surgery.opticalZone && {
      label: t('Optical zone'),
      value: `${surgery.opticalZone} mm`,
    },
    surgery.ablationDepth && {
      label: t('Ablation'),
      value: `${surgery.ablationDepth} µm`,
    },
    surgery.flapThickness && {
      label: t('Flap'),
      value: `${surgery.flapThickness} µm`,
    },
    surgery.iolModel && { label: t('IOL'), value: surgery.iolModel },
    surgery.iolPower && {
      label: t('IOL power'),
      value: `${surgery.iolPower} D`,
    },
    surgery.targetRefraction && {
      label: t('Target'),
      value: surgery.targetRefraction,
    },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <article className="rounded-md bg-gray-50 p-3 ring-1 ring-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">
            {surgery.title}
          </h3>
          {surgery.surgeryType && (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700 ring-1 ring-rose-200">
              {surgery.surgeryType}
            </span>
          )}
          {surgery.eye && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600 ring-1 ring-gray-200">
              {surgery.eye}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isManualRecord(surgery.document) && (
            <Link
              to={AppRoutes.EditRecord.replace(
                ':recordId',
                surgery.document.id,
              )}
              className="text-xs font-semibold text-primary-700 hover:text-primary-900"
            >
              {t('Edit')}
            </Link>
          )}
          <span className="text-xs font-medium text-gray-500">
            {surgery.date?.split('T')[0] || t('Undated')}
          </span>
        </div>
      </div>

      {surgery.surgeon && (
        <p className="mt-0.5 text-xs text-gray-500">{surgery.surgeon}</p>
      )}

      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className="rounded-md bg-white px-2 py-1 text-xs text-gray-700 ring-1 ring-gray-200"
            >
              <span className="font-semibold text-gray-900">{chip.label}</span>{' '}
              {chip.value}
            </span>
          ))}
        </div>
      )}

      {(surgery.outcome || surgery.complications) && (
        <p className="mt-2 text-xs text-gray-700">
          {[
            surgery.outcome && `${t('Outcome')}: ${surgery.outcome}`,
            surgery.complications &&
              `${t('Complications')}: ${surgery.complications}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {surgery.summary && (
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-700">
          {surgery.summary}
        </p>
      )}

      {surgery.followUp && (
        <p className="mt-1 text-xs text-gray-500">
          {t('Follow-up')}: {surgery.followUp}
        </p>
      )}
    </article>
  );
}
