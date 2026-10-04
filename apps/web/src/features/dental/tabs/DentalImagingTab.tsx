import { DentalImagingMountsPanel } from '../components/DentalImagingMountsPanel';
import { DentalImagingPanel } from '../components/DentalImagingPanel';
import { DentalScanPreview } from '../components/DentalScanPreview';
import { DentalStudiesPanel } from '../components/DentalStudiesPanel';
import { useDentalContext } from '../hooks/useDentalContext';
import { UNGROUPED_MOUNT } from '../utils/dentalClinicalModels';

export function DentalImagingTab() {
  const { imaging, imagingMounts } = useDentalContext();

  return (
    <>
      {/* Mounts group images by the mount or study they came in. With
          nothing grouped, the panel was one card reading "Ungrouped dental
          imaging · N items" — a count, not a grouping. */}
      {imagingMounts.some((mount) => mount.id !== UNGROUPED_MOUNT) && (
        <DentalImagingMountsPanel mounts={imagingMounts} />
      )}
      <DentalStudiesPanel imaging={imaging} />
      <DentalScanPreview imaging={imaging} />
      <DentalImagingPanel items={imaging} />
    </>
  );
}
