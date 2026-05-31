import { DentalImagingMount } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function DentalImagingMountsPanel({
  mounts,
}: {
  mounts: DentalImagingMount[];
}) {
  const { t } = useInterfaceLanguage();

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-base font-semibold text-gray-900">
        {t('Imaging mounts')}
      </h2>
      {mounts.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {mounts.slice(0, 6).map((mount) => (
            <article key={mount.id} className="rounded-md bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  {mount.title}
                </h3>
                <span className="text-xs font-semibold uppercase text-slate-500">
                  {mount.itemCount} {t('items')}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700">
                {[
                  mount.modality,
                  mount.acquisitionDate?.split('T')[0],
                  mount.toothNumbers.length
                    ? `${t('Teeth')}: ${mount.toothNumbers.join(', ')}`
                    : undefined,
                ]
                  .filter(Boolean)
                  .join(' · ') || t('Dental image group')}
              </p>
              {(mount.dicomStudyUid || mount.dicomSeriesUid) && (
                <p className="mt-2 truncate text-xs text-slate-500">
                  {mount.dicomStudyUid || mount.dicomSeriesUid}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'Bitewings, panoramic images, CBCT, photos, and scan sets will be grouped here when mount or DICOM metadata is available.',
          )}
        </p>
      )}
    </section>
  );
}
