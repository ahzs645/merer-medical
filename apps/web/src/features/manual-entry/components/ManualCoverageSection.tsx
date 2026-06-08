import { StylizedSelect } from '../../../shared/components/StylizedSelect';
import { SpecialtyTextInput } from './ManualTextInput';
import type { ManualRecordFormController } from '../hooks/useManualRecordForm';

export function ManualCoverageSection({
  form,
}: {
  form: ManualRecordFormController;
}) {
  const {
    t,
    coverageMemberId,
    setCoverageMemberId,
    coverageGroupNumber,
    setCoverageGroupNumber,
    coveragePlanType,
    setCoveragePlanType,
    coverageRelationship,
    setCoverageRelationship,
    coverageStatus,
    setCoverageStatus,
    coveragePeriodStart,
    setCoveragePeriodStart,
    coveragePeriodEnd,
    setCoveragePeriodEnd,
    coveragePhone,
    setCoveragePhone,
    coverageAddress,
    setCoverageAddress,
  } = form;

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">
          {t('Coverage details')}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {t('Use the Name field above for the payer or insurer.')}
        </p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <SpecialtyTextInput
          label={t('Member ID')}
          value={coverageMemberId}
          placeholder={t('Subscriber / member number')}
          onChange={setCoverageMemberId}
        />
        <SpecialtyTextInput
          label={t('Group number')}
          value={coverageGroupNumber}
          onChange={setCoverageGroupNumber}
        />
        <SpecialtyTextInput
          label={t('Plan type')}
          value={coveragePlanType}
          placeholder={t('PPO, HMO, dental, vision, extended health')}
          onChange={setCoveragePlanType}
        />
        <SpecialtyTextInput
          label={t('Relationship to subscriber')}
          value={coverageRelationship}
          placeholder={t('Self, spouse, child, dependent')}
          onChange={setCoverageRelationship}
        />
        <div>
          <label
            htmlFor="manual-coverage-status"
            className="block text-sm font-semibold text-gray-900"
          >
            {t('Status')}
          </label>
          <StylizedSelect
            id="manual-coverage-status"
            value={coverageStatus}
            onChange={(value) =>
              setCoverageStatus(value as 'active' | 'cancelled')
            }
            className="mt-2"
            buttonClassName="text-base"
            options={[
              { value: 'active', label: t('Active') },
              { value: 'cancelled', label: t('Inactive / cancelled') },
            ]}
          />
        </div>
        <SpecialtyTextInput
          label={t('Payer phone')}
          value={coveragePhone}
          onChange={setCoveragePhone}
        />
        <div>
          <label
            htmlFor="manual-coverage-period-start"
            className="block text-sm font-semibold text-gray-900"
          >
            {t('Coverage start')}
          </label>
          <input
            id="manual-coverage-period-start"
            type="date"
            value={coveragePeriodStart}
            onChange={(event) => setCoveragePeriodStart(event.target.value)}
            className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
          />
        </div>
        <div>
          <label
            htmlFor="manual-coverage-period-end"
            className="block text-sm font-semibold text-gray-900"
          >
            {t('Coverage end')}
          </label>
          <input
            id="manual-coverage-period-end"
            type="date"
            value={coveragePeriodEnd}
            onChange={(event) => setCoveragePeriodEnd(event.target.value)}
            className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
          />
        </div>
        <div className="sm:col-span-2">
          <SpecialtyTextInput
            label={t('Payer address')}
            value={coverageAddress}
            onChange={setCoverageAddress}
          />
        </div>
      </div>
    </div>
  );
}
