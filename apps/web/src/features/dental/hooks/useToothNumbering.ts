import { useCallback } from 'react';

import {
  useLocalConfig,
  useUpdateLocalConfig,
} from '../../../app/providers/LocalConfigProvider';
import { DentalNumberingSystem } from '../types';

/**
 * Universal numbering is a US convention; FDI is the default almost
 * everywhere else, Canada included. With no choice saved, follow the
 * browser's region, and Universal when it names none.
 */
export function defaultToothNumbering(
  languages: readonly string[] = typeof navigator === 'undefined'
    ? []
    : navigator.languages || [navigator.language],
): DentalNumberingSystem {
  const region = languages
    .map((tag) => {
      try {
        return new Intl.Locale(tag).region;
      } catch {
        return undefined;
      }
    })
    .find(Boolean);
  if (!region || region === 'US') return 'universal';
  return 'fdi';
}

export function useToothNumbering(): [
  DentalNumberingSystem,
  (numbering: DentalNumberingSystem) => void,
] {
  const config = useLocalConfig();
  const update = useUpdateLocalConfig();
  const numbering = config.tooth_numbering ?? defaultToothNumbering();
  const setNumbering = useCallback(
    (value: DentalNumberingSystem) => update({ tooth_numbering: value }),
    [update],
  );
  return [numbering, setNumbering];
}
