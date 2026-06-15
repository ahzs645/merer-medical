import { EyeImagingPanel } from '../components/EyeImagingPanel';
import { useOptometryContext } from '../hooks/useOptometryContext';

export function OptometryImagingTab() {
  const { imaging } = useOptometryContext();

  return <EyeImagingPanel items={imaging} />;
}
