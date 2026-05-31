import { useEffect, useState } from 'react';

import { useLocalConfig } from '../../../app/providers/LocalConfigProvider';
import type { MedicationViewItem } from '../medicationViewModel';
import { getMedicationInteractionEngine } from '../interactions/registry';
import type {
  MedicationInteraction,
  MedicationInteractionBundleStatus,
} from '../interactions/types';

export function useMedicationInteractions(items: MedicationViewItem[]) {
  const {
    medication_interactions_enabled,
    medication_interactions_provider = 'ddinter',
  } = useLocalConfig();
  const [interactions, setInteractions] = useState<MedicationInteraction[]>([]);
  const [bundleStatus, setBundleStatus] =
    useState<MedicationInteractionBundleStatus>({
      installed: false,
      readiness: 'missing',
      recordCount: 0,
    });
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const engine = getMedicationInteractionEngine(
      medication_interactions_provider,
    );

    async function run() {
      if (!medication_interactions_enabled || !engine) {
        setStatus('idle');
        setInteractions([]);
        setError(undefined);
        return;
      }

      try {
        setStatus('loading');
        setError(undefined);
        const nextBundleStatus = await engine.getBundleStatus();
        const nextInteractions = nextBundleStatus.installed
          ? await engine.checkInteractions(items)
          : [];

        if (cancelled) return;
        setBundleStatus(nextBundleStatus);
        setInteractions(nextInteractions);
        setStatus('success');
      } catch (error) {
        if (cancelled) return;
        setInteractions([]);
        setError((error as Error).message);
        setStatus('error');
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [
    items,
    medication_interactions_enabled,
    medication_interactions_provider,
  ]);

  return {
    bundleStatus,
    enabled: !!medication_interactions_enabled,
    error,
    interactions,
    status,
  };
}
