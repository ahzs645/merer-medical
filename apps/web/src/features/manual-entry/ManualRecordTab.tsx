import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
import { StylizedSelect } from '../../shared/components/StylizedSelect';
import { prepareLinkedAttachmentFile } from '../../repositories/AttachmentRepository';
import { TerminologySuggestions } from './TerminologyCombobox';
import { SpecialtyTextInput } from './components/ManualTextInput';
import { ManualObservationSection } from './components/ManualObservationSection';
import { ManualSpecialtySection } from './components/ManualSpecialtySection';
import { useManualRecordForm } from './hooks/useManualRecordForm';
import {
  deviceImportTypes,
  deviceReadingTemplates,
  quickTemplates,
  recordTypes,
  type DeviceImportKind,
  type ManualRecordKind,
} from './manualRecordTypes';

export function ManualRecordTab() {
  const form = useManualRecordForm();
  const {
    t,
    notifyDispatch,
    navigate,
    isEditing,
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
    canLinkSourceFile,
    titleMissing,
    fileMissing,
    terminologyProfile,
    terminologyLanguage,
    terminologyLookupMode,
    terminologyRemoteEnabled,
    applyTemplate,
    applyTerminology,
    onSubmit,
    onLibreFileSelected,
  } = form;

  return (
    <AppPage
      banner={
        <GenericBanner text={t(isEditing ? 'Edit record' : 'Add record')} />
      }
    >
      <div className="h-full overflow-y-auto bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
          >
            {recordType === 'lab' && !isEditing ? null : (
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
            )}

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

            {!isEditing && !isDeviceImportType && (
              <div>
                <p className="block text-sm font-semibold text-gray-900">
                  {t('Quick templates')}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickTemplates.map((template) => (
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

            <ManualObservationSection form={form} />

            {!isDeviceImportType && (
              <div>
                <label
                  htmlFor="manual-record-title"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t('Name')} <span className="text-red-600">*</span>
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
                  recordType !== 'device' &&
                  recordType !== 'document' &&
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
                  <p className="mt-1 text-xs font-medium text-red-600">
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
                  <p className="mt-1 text-xs font-medium text-red-600">
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
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-gray-500">
                  {savedCount > 0 &&
                    t(
                      `${savedCount} record${savedCount === 1 ? '' : 's'} added this session`,
                    )}
                </span>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(AppRoutes.Timeline)}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                  >
                    {t(savedCount > 0 && !isEditing ? 'Done' : 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate(AppRoutes.Timeline)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                >
                  {t('Cancel')}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </AppPage>
  );
}
