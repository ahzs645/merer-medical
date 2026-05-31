import { DentalClaimSummary } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function DentalClaimsPanel({
  claims,
}: {
  claims: DentalClaimSummary[];
}) {
  const { t } = useInterfaceLanguage();

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-base font-semibold text-gray-900">
        {t('Claims and EOBs')}
      </h2>
      {claims.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {claims.slice(0, 5).map((claim) => (
            <article key={claim.id} className="rounded-md bg-gray-50 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  {claim.record.title}
                </h3>
                {claim.status && (
                  <span className="text-xs font-semibold uppercase text-primary-700">
                    {t(claim.status)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-700">
                {[
                  claim.carrier,
                  claim.plan,
                  claim.patientPortion &&
                    `${t('Patient portion')}: ${claim.patientPortion}`,
                  claim.deductible && `${t('Deductible')}: ${claim.deductible}`,
                  claim.annualMaximum &&
                    `${t('Annual max')}: ${claim.annualMaximum}`,
                ]
                  .filter(Boolean)
                  .join(' · ') || t('Dental claim or benefit record')}
              </p>
              {claim.eobAttachment && (
                <p className="mt-2 text-xs text-gray-500">
                  {t('EOB')}: {claim.eobAttachment}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'Coverage, claim status, EOB attachments, deductible, annual maximum, and patient responsibility will appear here.',
          )}
        </p>
      )}
    </section>
  );
}
