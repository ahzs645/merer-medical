import { StylizedSelect } from '../../../shared/components/StylizedSelect';
import { optometrySurgeryTypes } from '../manualRecordTypes';
import { SpecialtyTextInput } from './ManualTextInput';
import type { ManualRecordFormController } from '../hooks/useManualRecordForm';

// Show the laser-specific block for corneal laser procedures and the lens
// block for implant procedures; everything else falls back to showing both.
function isLaserSurgery(type: string) {
  return /lasik|smile|prk|lasek|cross-link/i.test(type);
}

function isLensSurgery(type: string) {
  return /iol|icl|cataract|phakic/i.test(type);
}

export function OptometrySurgeryFields({
  form,
}: {
  form: ManualRecordFormController;
}) {
  const {
    t,
    surgeryType,
    setSurgeryType,
    surgerySurgeon,
    setSurgerySurgeon,
    laserPlatform,
    setLaserPlatform,
    opticalZone,
    setOpticalZone,
    ablationDepth,
    setAblationDepth,
    flapThickness,
    setFlapThickness,
    iolModel,
    setIolModel,
    iolPower,
    setIolPower,
    targetRefraction,
    setTargetRefraction,
    surgeryComplications,
    setSurgeryComplications,
    surgeryOutcome,
    setSurgeryOutcome,
    surgeryFollowUp,
    setSurgeryFollowUp,
  } = form;

  const showLaser = !surgeryType || isLaserSurgery(surgeryType);
  const showLens = !surgeryType || isLensSurgery(surgeryType);

  return (
    <div className="grid gap-3 rounded-md bg-white p-3 ring-1 ring-gray-200">
      <p className="text-sm font-semibold text-gray-900">
        {t('Surgery details')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="manual-record-surgery-type"
            className="block text-sm font-semibold text-gray-900"
          >
            {t('Procedure type')}
          </label>
          <StylizedSelect
            id="manual-record-surgery-type"
            value={surgeryType || optometrySurgeryTypes[0]}
            onChange={setSurgeryType}
            className="mt-2"
            buttonClassName="text-base"
            options={optometrySurgeryTypes.map((type) => ({
              value: type,
              label: t(type),
            }))}
          />
        </div>
        <SpecialtyTextInput
          label={t('Surgeon / clinic')}
          value={surgerySurgeon}
          placeholder={t('e.g. Dr. Priya Shah, OD')}
          onChange={setSurgerySurgeon}
        />
      </div>

      {showLaser && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SpecialtyTextInput
            label={t('Laser platform')}
            value={laserPlatform}
            placeholder={t('e.g. VisuMax, WaveLight')}
            onChange={setLaserPlatform}
          />
          <SpecialtyTextInput
            label={t('Optical zone (mm)')}
            value={opticalZone}
            placeholder="6.5"
            onChange={setOpticalZone}
          />
          <SpecialtyTextInput
            label={t('Ablation depth (µm)')}
            value={ablationDepth}
            placeholder="65"
            onChange={setAblationDepth}
          />
          <SpecialtyTextInput
            label={t('Flap thickness (µm)')}
            value={flapThickness}
            placeholder="110"
            onChange={setFlapThickness}
          />
        </div>
      )}

      {showLens && (
        <div className="grid gap-3 sm:grid-cols-2">
          <SpecialtyTextInput
            label={t('IOL / ICL model')}
            value={iolModel}
            placeholder={t('e.g. Alcon AcrySof IQ')}
            onChange={setIolModel}
          />
          <SpecialtyTextInput
            label={t('IOL power (D)')}
            value={iolPower}
            placeholder="+21.0"
            onChange={setIolPower}
          />
        </div>
      )}

      <SpecialtyTextInput
        label={t('Target refraction')}
        value={targetRefraction}
        placeholder={t('e.g. plano / emmetropia')}
        onChange={setTargetRefraction}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <SpecialtyTextInput
          label={t('Complications')}
          value={surgeryComplications}
          placeholder={t('None')}
          onChange={setSurgeryComplications}
        />
        <SpecialtyTextInput
          label={t('Outcome')}
          value={surgeryOutcome}
          placeholder={t('e.g. UCVA 20/20')}
          onChange={setSurgeryOutcome}
        />
        <SpecialtyTextInput
          label={t('Follow-up')}
          value={surgeryFollowUp}
          placeholder={t('e.g. 1 day, 1 week, 1 month')}
          onChange={setSurgeryFollowUp}
        />
      </div>
    </div>
  );
}
