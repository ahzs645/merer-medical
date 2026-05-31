import { StylizedSelect } from '../../../shared/components/StylizedSelect';
import {
  ManualTextInput as PrescriptionInput,
  SpecialtyTextInput,
} from './ManualTextInput';
import {
  dentalEntryTypes,
  optometryEntryTypes,
  specialtyOptions,
  toothSurfaces,
  type DentalEntryKind,
  type EyeSide,
  type ManualSpecialty,
  type OptometryEntryKind,
} from '../manualRecordTypes';
import type { ManualRecordFormController } from '../hooks/useManualRecordForm';

export function ManualSpecialtySection({
  form,
}: {
  form: ManualRecordFormController;
}) {
  const {
    t,
    specialty,
    updateSpecialty,
    dentalEntryKind,
    applyDentalEntryKind,
    isEditing,
    optometryEntryKind,
    applyOptometryEntryKind,
    toothNumber,
    setToothNumber,
    dentalTeeth,
    setDentalTeeth,
    toothRange,
    setToothRange,
    dentalQuadrant,
    setDentalQuadrant,
    dentalArch,
    setDentalArch,
    dentition,
    setDentition,
    dentalStatus,
    setDentalStatus,
    dentalSeverity,
    setDentalSeverity,
    procedureCode,
    setProcedureCode,
    dentalProvider,
    setDentalProvider,
    dentalLocation,
    setDentalLocation,
    dentalFollowUp,
    setDentalFollowUp,
    dentalSurfaces,
    toggleDentalSurface,
    dentalRecall,
    setDentalRecall,
    isOrthodonticDentalEntry,
    orthoPhase,
    setOrthoPhase,
    orthoArch,
    setOrthoArch,
    orthoAppliance,
    setOrthoAppliance,
    orthoStatus,
    setOrthoStatus,
    alignerCurrent,
    setAlignerCurrent,
    alignerTotal,
    setAlignerTotal,
    overjet,
    setOverjet,
    overbite,
    setOverbite,
    molarClass,
    setMolarClass,
    nextVisit,
    setNextVisit,
    eyeSide,
    setEyeSide,
    examMethod,
    setExamMethod,
    odSphere,
    setOdSphere,
    odCylinder,
    setOdCylinder,
    odAxis,
    setOdAxis,
    odAdd,
    setOdAdd,
    pd,
    setPd,
    osSphere,
    setOsSphere,
    osCylinder,
    setOsCylinder,
    osAxis,
    setOsAxis,
    osAdd,
    setOsAdd,
    visualAcuityOd,
    setVisualAcuityOd,
    visualAcuityOs,
    setVisualAcuityOs,
    iopOd,
    setIopOd,
    iopOs,
    setIopOs,
    isDeviceImportType,
  } = form;

  return !isDeviceImportType ? (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="manual-record-specialty"
            className="block text-sm font-semibold text-gray-900"
          >
            {t('Section')}
          </label>
          <StylizedSelect
            id="manual-record-specialty"
            value={specialty}
            onChange={(value) => updateSpecialty(value as ManualSpecialty)}
            className="mt-2"
            buttonClassName="text-base"
            options={specialtyOptions.map((option) => ({
              value: option.value,
              label: t(option.label),
            }))}
          />
        </div>

        {specialty === 'dental' && (
          <div>
            <label
              htmlFor="manual-record-dental-kind"
              className="block text-sm font-semibold text-gray-900"
            >
              {t('Dental record')}
            </label>
            <StylizedSelect
              id="manual-record-dental-kind"
              value={dentalEntryKind}
              onChange={(value) =>
                applyDentalEntryKind(value as DentalEntryKind)
              }
              disabled={isEditing}
              className="mt-2"
              buttonClassName="text-base"
              options={dentalEntryTypes.map((entry) => ({
                value: entry.value,
                label: t(entry.label),
              }))}
            />
          </div>
        )}

        {specialty === 'optometry' && (
          <div>
            <label
              htmlFor="manual-record-optometry-kind"
              className="block text-sm font-semibold text-gray-900"
            >
              {t('Eye-care record')}
            </label>
            <StylizedSelect
              id="manual-record-optometry-kind"
              value={optometryEntryKind}
              onChange={(value) =>
                applyOptometryEntryKind(value as OptometryEntryKind)
              }
              disabled={isEditing}
              className="mt-2"
              buttonClassName="text-base"
              options={optometryEntryTypes.map((entry) => ({
                value: entry.value,
                label: t(entry.label),
              }))}
            />
          </div>
        )}
      </div>

      {specialty === 'dental' && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="manual-record-tooth"
              className="block text-sm font-semibold text-gray-900"
            >
              {t('Tooth')}
            </label>
            <input
              id="manual-record-tooth"
              type="text"
              value={toothNumber}
              placeholder={t('e.g. 14')}
              onChange={(event) => setToothNumber(event.target.value)}
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>
          <SpecialtyTextInput
            label={t('Multiple teeth')}
            value={dentalTeeth}
            placeholder={t('e.g. 3, 14, 19')}
            onChange={setDentalTeeth}
          />
          <SpecialtyTextInput
            label={t('Tooth range')}
            value={toothRange}
            placeholder={t('e.g. 12-15')}
            onChange={setToothRange}
          />
          <SpecialtyTextInput
            label={t('Quadrant')}
            value={dentalQuadrant}
            placeholder={t('UR, UL, LR, LL')}
            onChange={setDentalQuadrant}
          />
          <SpecialtyTextInput
            label={t('Arch')}
            value={dentalArch}
            placeholder={t('Maxillary, mandibular, both')}
            onChange={setDentalArch}
          />
          <SpecialtyTextInput
            label={t('Dentition')}
            value={dentition}
            placeholder={t('Permanent, primary, mixed')}
            onChange={setDentition}
          />
          <SpecialtyTextInput
            label={t('Status')}
            value={dentalStatus}
            placeholder={t('Planned, active, complete')}
            onChange={setDentalStatus}
          />
          <SpecialtyTextInput
            label={t('Severity')}
            value={dentalSeverity}
            placeholder={t('Mild, moderate, severe')}
            onChange={setDentalSeverity}
          />
          <SpecialtyTextInput
            label={t('Procedure code')}
            value={procedureCode}
            placeholder={t('CDT, ADA, clinic code')}
            onChange={setProcedureCode}
          />
          <SpecialtyTextInput
            label={t('Provider')}
            value={dentalProvider}
            placeholder={t('Dentist, hygienist, orthodontist')}
            onChange={setDentalProvider}
          />
          <SpecialtyTextInput
            label={t('Location')}
            value={dentalLocation}
            placeholder={t('Clinic, room, chair')}
            onChange={setDentalLocation}
          />
          <SpecialtyTextInput
            label={t('Follow-up')}
            value={dentalFollowUp}
            placeholder={t('e.g. restoration review in 2 weeks')}
            onChange={setDentalFollowUp}
          />
          <div className="sm:col-span-2">
            <p className="block text-sm font-semibold text-gray-900">
              {t('Surfaces')}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {toothSurfaces.map((surface) => (
                <button
                  key={surface}
                  type="button"
                  onClick={() => toggleDentalSurface(surface)}
                  className={`h-9 min-w-9 rounded-md border px-3 text-sm font-semibold ${
                    dentalSurfaces.includes(surface)
                      ? 'border-primary-600 bg-primary-50 text-primary-800'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {surface}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-3">
            <label
              htmlFor="manual-record-dental-recall"
              className="block text-sm font-semibold text-gray-900"
            >
              {t('Recall or follow-up')}
            </label>
            <input
              id="manual-record-dental-recall"
              type="text"
              value={dentalRecall}
              placeholder={t('e.g. 6-month cleaning recall')}
              onChange={(event) => setDentalRecall(event.target.value)}
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>
          {isOrthodonticDentalEntry && (
            <>
              <SpecialtyTextInput
                label={t('Phase')}
                value={orthoPhase}
                placeholder={t('Phase I, Phase II, retention')}
                onChange={setOrthoPhase}
              />
              <SpecialtyTextInput
                label={t('Arch')}
                value={orthoArch}
                placeholder={t('Upper, lower, both')}
                onChange={setOrthoArch}
              />
              <SpecialtyTextInput
                label={t('Appliance')}
                value={orthoAppliance}
                placeholder={t('Braces, aligners, expander, retainer')}
                onChange={setOrthoAppliance}
              />
              <SpecialtyTextInput
                label={t('Status')}
                value={orthoStatus}
                placeholder={t('Active, planned, complete')}
                onChange={setOrthoStatus}
              />
              <SpecialtyTextInput
                label={t('Aligner current')}
                value={alignerCurrent}
                placeholder={t('e.g. 8')}
                onChange={setAlignerCurrent}
              />
              <SpecialtyTextInput
                label={t('Aligner total')}
                value={alignerTotal}
                placeholder={t('e.g. 24')}
                onChange={setAlignerTotal}
              />
              <SpecialtyTextInput
                label={t('Overjet (mm)')}
                value={overjet}
                placeholder={t('e.g. 4')}
                onChange={setOverjet}
              />
              <SpecialtyTextInput
                label={t('Overbite (mm)')}
                value={overbite}
                placeholder={t('e.g. 3')}
                onChange={setOverbite}
              />
              <SpecialtyTextInput
                label={t('Molar / canine class')}
                value={molarClass}
                placeholder={t('Class II div 1, right Class I')}
                onChange={setMolarClass}
              />
              <SpecialtyTextInput
                label={t('Next visit')}
                value={nextVisit}
                placeholder={t('6 weeks, wire change, tray review')}
                onChange={setNextVisit}
              />
            </>
          )}
        </div>
      )}

      {specialty === 'optometry' && (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="manual-record-eye-side"
                className="block text-sm font-semibold text-gray-900"
              >
                {t('Eye')}
              </label>
              <StylizedSelect
                id="manual-record-eye-side"
                value={eyeSide}
                onChange={(value) => setEyeSide(value as EyeSide)}
                className="mt-2"
                buttonClassName="text-base"
                options={[
                  { value: 'OU', label: t('OU / both') },
                  { value: 'OD', label: t('OD / right') },
                  { value: 'OS', label: t('OS / left') },
                ]}
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="manual-record-exam-method"
                className="block text-sm font-semibold text-gray-900"
              >
                {t('Method or device')}
              </label>
              <input
                id="manual-record-exam-method"
                type="text"
                value={examMethod}
                placeholder={t('e.g. Goldmann, OCT, Snellen')}
                onChange={(event) => setExamMethod(event.target.value)}
                className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              />
            </div>
          </div>

          {(optometryEntryKind === 'glassesPrescription' ||
            optometryEntryKind === 'contactLensPrescription' ||
            optometryEntryKind === 'refraction') && (
            <div className="grid gap-3 rounded-md bg-white p-3 ring-1 ring-gray-200">
              <p className="text-sm font-semibold text-gray-900">
                {t('Refraction / Rx')}
              </p>
              <div className="grid gap-3 md:grid-cols-5">
                <PrescriptionInput
                  label={t('OD sphere')}
                  value={odSphere}
                  onChange={setOdSphere}
                />
                <PrescriptionInput
                  label={t('OD cylinder')}
                  value={odCylinder}
                  onChange={setOdCylinder}
                />
                <PrescriptionInput
                  label={t('OD axis')}
                  value={odAxis}
                  onChange={setOdAxis}
                />
                <PrescriptionInput
                  label={t('OD add')}
                  value={odAdd}
                  onChange={setOdAdd}
                />
                <PrescriptionInput
                  label={t('PD')}
                  value={pd}
                  onChange={setPd}
                />
                <PrescriptionInput
                  label={t('OS sphere')}
                  value={osSphere}
                  onChange={setOsSphere}
                />
                <PrescriptionInput
                  label={t('OS cylinder')}
                  value={osCylinder}
                  onChange={setOsCylinder}
                />
                <PrescriptionInput
                  label={t('OS axis')}
                  value={osAxis}
                  onChange={setOsAxis}
                />
                <PrescriptionInput
                  label={t('OS add')}
                  value={osAdd}
                  onChange={setOsAdd}
                />
              </div>
            </div>
          )}

          {(optometryEntryKind === 'visualAcuity' ||
            optometryEntryKind === 'checkup') && (
            <div className="grid gap-3 sm:grid-cols-2">
              <PrescriptionInput
                label={t('OD visual acuity')}
                value={visualAcuityOd}
                placeholder="20/20"
                onChange={setVisualAcuityOd}
              />
              <PrescriptionInput
                label={t('OS visual acuity')}
                value={visualAcuityOs}
                placeholder="20/25"
                onChange={setVisualAcuityOs}
              />
            </div>
          )}

          {(optometryEntryKind === 'iop' ||
            optometryEntryKind === 'checkup') && (
            <div className="grid gap-3 sm:grid-cols-2">
              <PrescriptionInput
                label={t('OD IOP')}
                value={iopOd}
                placeholder="14"
                onChange={setIopOd}
              />
              <PrescriptionInput
                label={t('OS IOP')}
                value={iopOs}
                placeholder="15"
                onChange={setIopOs}
              />
            </div>
          )}
        </div>
      )}
    </div>
  ) : null;
}
