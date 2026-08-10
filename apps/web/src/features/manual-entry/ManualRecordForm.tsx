import { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../Routes';
import { StylizedSelect } from '../../shared/components/StylizedSelect';
import { prepareLinkedAttachmentFile } from '../../repositories/AttachmentRepository';
import { TerminologySuggestions } from './TerminologyCombobox';
import { SpecialtyTextInput } from './components/ManualTextInput';
import { ManualObservationSection } from './components/ManualObservationSection';
import { ManualSpecialtySection } from './components/ManualSpecialtySection';
import { ManualCoverageSection } from './components/ManualCoverageSection';
import { ManualRecordTypePicker } from './components/ManualRecordTypePicker';
import type { ManualRecordFormController } from './hooks/useManualRecordForm';
import {
  deviceImportTypes,
  deviceReadingTemplates,
  quickTemplates,
  recordTypes,
  type DeviceImportKind,
  type ManualRecordKind,
} from './manualRecordTypes';

// Save and Cancel were 38px tall on a form whose own banner actions, filter
// chips and back links all pin to 44px, and in the dialog Save sat several
// hundred pixels below the fold with nothing holding it there. The row sticks
// to the bottom of whichever box is scrolling — the modal's 80vh body or the
// page — and bleeds to the card's edges (`-mx-*`/`-mb-*` cancel the form's own
// padding) so the pinned bar reads as the card's footer rather than a slab
// floating over the last field.
const actionRowClass =
  'sticky bottom-0 -mx-4 -mb-4 flex items-center gap-3 rounded-b-lg border-t border-gray-200 bg-white px-4 py-3 sm:-mx-6 sm:-mb-6 sm:px-6';

const secondaryButtonClass =
  'inline-flex min-h-[44px] items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50';

export function ManualRecordForm({
  form,
  onCancel,
  embedded = false,
}: {
  form: ManualRecordFormController;
  onCancel?: () => void;
  embedded?: boolean;
}) {
  const {
    t,
    notifyDispatch,
    navigate,
    isEditing,
    hasTypePreset,
    recordType,
    setRecordType,
    imagingModality,
    setImagingModality,
    imagingBodySite,
    setImagingBodySite,
    imagingLaterality,
    setImagingLaterality,
    imagingStudyType,
    setImagingStudyType,
    imagingAccessionId,
    setImagingAccessionId,
    imagingStudyId,
    setImagingStudyId,
    deviceImportType,
    setDeviceImportType,
    title,
    setTitle,
    date,
    setDate,
    notes,
    setNotes,
    familyRelationship,
    setFamilyRelationship,
    selectedTerminology,
    setSelectedTerminology,
    dose,
    setDose,
    frequency,
    setFrequency,
    route,
    setRoute,
    fileName,
    setFileName,
    setFileContentType,
    setFileData,
    linkedFile,
    setLinkedFile,
    isSaving,
    isImportingLibre,
    keepAdding,
    setKeepAdding,
    savedCount,
    submitAttempted,
    isDeviceImportType,
    isManualDeviceReadingType,
    isLibreImportType,
    isDocumentType,
    isMedicationType,
    isCoverageType,
    isReferralType,
    isSocialHistoryType,
    isFamilyHistoryType,
    canLinkSourceFile,
    isNewLabEntry,
    titleMissing,
    fileMissing,
    isDirty,
    failedSubmitCount,
    terminologyProfile,
    terminologyLanguage,
    terminologyLookupMode,
    terminologyRemoteEnabled,
    applyTemplate,
    applyTerminology,
    onSubmit,
    onLibreFileSelected,
  } = form;

  // Every template in the list is a vital or a lab, but the row used to render
  // on every non-device form: the "Add allergy" dialog offered Blood pressure,
  // Heart rate and Body weight above the Name field, and tapping one flipped
  // the Type dropdown to Vital sign and overwrote the name without asking.
  // Matching the current type means a chip can only fill the form you are
  // already on, never redefine what you came to add.
  const templatesForType = quickTemplates.filter(
    (template) => template.kind === recordType,
  );

  // The guided picker is the first step for a fresh add with no preset; once a
  // type is chosen we switch to the tailored form. Editing or arriving with a
  // preset skips it entirely.
  const canPickType = !isEditing && !hasTypePreset;
  const [pickerOpen, setPickerOpen] = useState(canPickType);
  // A modal host passes onCancel and owns its own discard confirmation; the
  // standalone page guards the navigate-away itself.
  const handleCancel =
    onCancel ??
    (() => {
      if (isDirty() && !window.confirm(t('Discard unsaved changes?'))) {
        return;
      }
      navigate(AppRoutes.Timeline);
    });

  // A blocked submit scrolls the first invalid control into view so the
  // Save click never looks like a silent no-op.
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!failedSubmitCount || !formRef.current) return;
    const invalid = formRef.current.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-invalid="true"]',
    );
    if (!invalid) return;
    invalid.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (invalid instanceof HTMLInputElement) {
      invalid.focus({ preventScroll: true });
    }
  }, [failedSubmitCount]);

  const containerClass = embedded
    ? 'px-4 py-4'
    : 'h-full overflow-y-auto bg-slate-50 px-4 py-6 sm:px-6 lg:px-8';

  return (
    <div className={containerClass}>
      <div
        className={`mx-auto flex w-full flex-col gap-5 ${
          pickerOpen ? 'max-w-3xl' : 'max-w-2xl'
        }`}
      >
        {pickerOpen ? (
          <ManualRecordTypePicker
            form={form}
            onPick={() => setPickerOpen(false)}
          />
        ) : (
          <form
            ref={formRef}
            onSubmit={onSubmit}
            // Hosted in a dialog, the card chrome is a white bordered box
            // drawn inside a white bordered box — the sheet is already the
            // container. On its own page it sits on slate and needs to be one.
            className={`flex flex-col gap-5 ${
              embedded
                ? ''
                : 'rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6'
            }`}
          >
            {canPickType && (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                {t('Change record type')}
              </button>
            )}

            <div>
              <label
                htmlFor="manual-record-type"
                className="block text-sm font-semibold text-gray-900"
              >
                {t('Type')}
              </label>
              <StylizedSelect
                id="manual-record-type"
                value={recordType}
                onChange={(value) => setRecordType(value as ManualRecordKind)}
                disabled={isEditing}
                className="mt-2"
                buttonClassName="text-base"
                options={recordTypes.map((type) => ({
                  value: type.value,
                  label: t(type.label),
                }))}
              />
            </div>

            <ManualSpecialtySection form={form} />

            {isDocumentType && !isDeviceImportType && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {t('Imaging metadata')}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {t(
                      'Optional details used to classify and find scans, photos, imaging reports, and DICOM studies.',
                    )}
                  </p>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <SpecialtyTextInput
                    label={t('Modality')}
                    value={imagingModality}
                    placeholder={t('X-ray, CT, MRI, OCT, CBCT')}
                    onChange={setImagingModality}
                  />
                  <SpecialtyTextInput
                    label={t('Body site')}
                    value={imagingBodySite}
                    placeholder={t('Chest, mandible, retina, left knee')}
                    onChange={setImagingBodySite}
                  />
                  <SpecialtyTextInput
                    label={t('Laterality')}
                    value={imagingLaterality}
                    placeholder={t('Left, right, bilateral, OD, OS, OU')}
                    onChange={setImagingLaterality}
                  />
                  <SpecialtyTextInput
                    label={t('Study / report type')}
                    value={imagingStudyType}
                    placeholder={t('Radiology report, DICOM study, photo')}
                    onChange={setImagingStudyType}
                  />
                  <SpecialtyTextInput
                    label={t('Accession ID')}
                    value={imagingAccessionId}
                    onChange={setImagingAccessionId}
                  />
                  <SpecialtyTextInput
                    label={t('Study ID')}
                    value={imagingStudyId}
                    onChange={setImagingStudyId}
                  />
                </div>
              </div>
            )}

            {isDeviceImportType && !isEditing && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <label
                  htmlFor="manual-device-type"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t('Device')}
                </label>
                <StylizedSelect
                  id="manual-device-type"
                  value={deviceImportType}
                  onChange={(value) =>
                    setDeviceImportType(value as DeviceImportKind)
                  }
                  className="mt-2"
                  buttonClassName="text-base"
                  options={deviceImportTypes.map((device) => ({
                    value: device.value,
                    label: t(device.label),
                  }))}
                />

                {isManualDeviceReadingType && (
                  <div className="mt-4">
                    <p className="block text-sm font-semibold text-gray-900">
                      {t('Device reading templates')}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {t(
                        'Choose a common home-device reading. The form will switch to the matching vital or lab entry.',
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {deviceReadingTemplates.map((template) => (
                        <button
                          key={template.label}
                          type="button"
                          onClick={() => applyTemplate(template)}
                          className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                        >
                          {t(template.label)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isLibreImportType && (
                  <div className="mt-4">
                    <label
                      htmlFor="libre-import-file"
                      className="block text-sm font-semibold text-gray-900"
                    >
                      {t('LibreView file')}
                    </label>
                    <p className="mt-1 text-sm text-gray-600">
                      {t(
                        'Import a LibreView JSON or CSV export. Readings will appear as glucose observations in Labs.',
                      )}
                    </p>
                    <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-md bg-primary-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-800">
                      {t(isImportingLibre ? 'Importing...' : 'Choose file')}
                      <input
                        id="libre-import-file"
                        type="file"
                        accept=".json,.csv,application/json,text/csv"
                        className="sr-only"
                        disabled={isImportingLibre}
                        onChange={onLibreFileSelected}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {!isEditing && templatesForType.length > 0 && (
              <div>
                <p className="block text-sm font-semibold text-gray-900">
                  {t('Quick templates')}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {templatesForType.map((template) => (
                    <button
                      key={template.label}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                    >
                      {t(template.label)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isMedicationType && !isDeviceImportType && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="manual-record-dose"
                    className="block text-sm font-semibold text-gray-900"
                  >
                    {t('Dose')}
                  </label>
                  <input
                    id="manual-record-dose"
                    type="text"
                    value={dose}
                    placeholder={t('e.g. 10 mg')}
                    onChange={(event) => setDose(event.target.value)}
                    className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manual-record-frequency"
                    className="block text-sm font-semibold text-gray-900"
                  >
                    {t('Frequency')}
                  </label>
                  <input
                    id="manual-record-frequency"
                    type="text"
                    value={frequency}
                    placeholder={t('e.g. twice daily')}
                    onChange={(event) => setFrequency(event.target.value)}
                    className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manual-record-route"
                    className="block text-sm font-semibold text-gray-900"
                  >
                    {t('Route')}
                  </label>
                  <input
                    id="manual-record-route"
                    type="text"
                    value={route}
                    placeholder={t('e.g. oral')}
                    onChange={(event) => setRoute(event.target.value)}
                    className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                </div>
              </div>
            )}

            {isCoverageType && <ManualCoverageSection form={form} />}

            {isFamilyHistoryType && (
              <div>
                <label
                  htmlFor="manual-record-family-relationship"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t('Relationship')}
                </label>
                <input
                  id="manual-record-family-relationship"
                  type="text"
                  value={familyRelationship}
                  placeholder={t('e.g. Father, Mother, Sibling, None')}
                  onChange={(event) =>
                    setFamilyRelationship(event.target.value)
                  }
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>
            )}

            <ManualObservationSection form={form} />

            {/* New labs are named per row in the results table above, so the
                single Name field is hidden — it would be ignored on save. */}
            {!isDeviceImportType && !isNewLabEntry && (
              <div>
                <label
                  htmlFor="manual-record-title"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t(
                    isCoverageType
                      ? 'Payer / insurer'
                      : isFamilyHistoryType
                        ? 'Condition / concern'
                        : isSocialHistoryType
                          ? 'Topic'
                          : isReferralType
                            ? 'Referred to'
                            : 'Name',
                  )}{' '}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  id="manual-record-title"
                  type="text"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setSelectedTerminology(undefined);
                  }}
                  aria-invalid={submitAttempted && titleMissing}
                  className={`mt-2 block w-full rounded-md border px-3 py-2 text-base text-gray-900 shadow-sm focus:outline-none focus:ring-1 ${
                    submitAttempted && titleMissing
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-600 focus:ring-primary-600'
                  }`}
                />
                {!isDocumentType &&
                  recordType !== 'lab' &&
                  recordType !== 'careplan' &&
                  recordType !== 'goal' &&
                  recordType !== 'coverage' &&
                  recordType !== 'servicerequest' &&
                  recordType !== 'device' &&
                  recordType !== 'document' &&
                  recordType !== 'familymemberhistory' &&
                  recordType !== 'socialhistory' &&
                  recordType !== 'visionprescription' && (
                    <TerminologySuggestions
                      kind={recordType}
                      query={title}
                      selected={selectedTerminology}
                      onSelect={applyTerminology}
                      profile={terminologyProfile}
                      language={terminologyLanguage}
                      lookupMode={terminologyLookupMode}
                      remoteEnabled={terminologyRemoteEnabled}
                    />
                  )}
                {submitAttempted && titleMissing && (
                  <p
                    role="alert"
                    className="mt-1 text-xs font-medium text-red-600"
                  >
                    {t('A name is required.')}
                  </p>
                )}
              </div>
            )}

            {isDocumentType && (
              <div>
                <label
                  htmlFor="manual-record-file"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t('File')}
                </label>
                <input
                  id="manual-record-file"
                  type="file"
                  aria-invalid={submitAttempted && fileMissing}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setFileName(file.name);
                    setFileContentType(file.type || 'application/octet-stream');
                    if (
                      file.type.startsWith('text/') ||
                      file.type.includes('xml') ||
                      file.type.includes('html')
                    ) {
                      file.text().then(setFileData);
                    } else {
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = `${reader.result || ''}`;
                        setFileData(result.split(',')[1] || result);
                      };
                      reader.readAsDataURL(file);
                    }
                    if (!title.trim()) setTitle(file.name);
                  }}
                  className="mt-2 block w-full text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-700"
                />
                {fileName && (
                  <p className="mt-2 text-xs font-medium text-gray-600">
                    {fileName}
                  </p>
                )}
                {submitAttempted && fileMissing && (
                  <p
                    role="alert"
                    className="mt-1 text-xs font-medium text-red-600"
                  >
                    {t('Select a file before saving this document.')}
                  </p>
                )}
              </div>
            )}

            {!isDeviceImportType && (
              <div>
                <label
                  htmlFor="manual-record-source-file"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t('Link original document')}
                </label>
                <p className="mt-1 text-sm text-gray-600">
                  {t(
                    'Attach a scan, photo, PDF, or lab report to this record in the local database.',
                  )}
                </p>
                <input
                  id="manual-record-source-file"
                  type="file"
                  disabled={!canLinkSourceFile}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      setLinkedFile(null);
                      return;
                    }
                    prepareLinkedAttachmentFile(file)
                      .then(setLinkedFile)
                      .catch((error) => {
                        console.error(error);
                        notifyDispatch({
                          type: 'set_notification',
                          message: `Unable to read linked file: ${(error as Error).message}`,
                          variant: 'error',
                        });
                      });
                  }}
                  className="mt-2 block w-full text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 file:ring-1 file:ring-inset file:ring-primary-200 hover:file:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {linkedFile && (
                  <p className="mt-2 text-xs font-medium text-gray-600">
                    {t('Linked')}: {linkedFile.filename}
                  </p>
                )}
                {!canLinkSourceFile && (
                  <p className="mt-2 text-xs font-medium text-gray-500">
                    {t(
                      'File linking is available when the local Dexie database is enabled.',
                    )}
                  </p>
                )}
              </div>
            )}

            {!isDeviceImportType && (
              <div>
                <label
                  htmlFor="manual-record-date"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t('Date')}
                </label>
                <input
                  id="manual-record-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>
            )}

            {!isDeviceImportType && (
              <div>
                <label
                  htmlFor="manual-record-notes"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t('Notes')}
                </label>
                <textarea
                  id="manual-record-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={5}
                  className="mt-2 block w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>
            )}

            {!isEditing && !isDeviceImportType && (
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={keepAdding}
                  onChange={(event) => setKeepAdding(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                />
                {t('Keep adding more records after saving')}
              </label>
            )}

            {!isDeviceImportType && (
              <div className={`${actionRowClass} justify-between`}>
                <span className="text-xs font-medium text-gray-500">
                  {/* Keep the count outside t() — interpolated strings can
                      never match a dictionary key. */}
                  {savedCount > 0 &&
                    `${savedCount} ${t(
                      savedCount === 1
                        ? 'record added this session'
                        : 'records added this session',
                    )}`}
                </span>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className={secondaryButtonClass}
                  >
                    {t(savedCount > 0 && !isEditing ? 'Done' : 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {t(
                      isSaving
                        ? 'Saving'
                        : isEditing
                          ? 'Update record'
                          : keepAdding
                            ? 'Save & add another'
                            : 'Save record',
                    )}
                  </button>
                </div>
              </div>
            )}

            {isDeviceImportType && (
              <div className={`${actionRowClass} justify-end`}>
                <button
                  type="button"
                  onClick={handleCancel}
                  className={secondaryButtonClass}
                >
                  {t('Cancel')}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
