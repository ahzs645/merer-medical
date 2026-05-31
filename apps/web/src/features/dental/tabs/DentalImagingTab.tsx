import { DentalImagingMountsPanel } from '../components/DentalImagingMountsPanel';
import { DentalImagingPanel } from '../components/DentalImagingPanel';
import { DentalScanPreview } from '../components/DentalScanPreview';
import { useDentalContext } from '../hooks/useDentalContext';

export function DentalImagingTab() {
  const { imaging, imagingMounts } = useDentalContext();

  return (
    <>
      <DentalImagingMountsPanel mounts={imagingMounts} />
      <DentalScanPreview imaging={imaging} />
      <DentalImagingPanel items={imaging} />
    </>
  );
}
