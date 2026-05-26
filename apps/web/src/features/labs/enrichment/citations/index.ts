import { australianLabCitations } from './australian';
import { canadianLabCitations } from './canadian';
import { ukLabCitations } from './uk';
import type { LabCitation } from '../types';

export { australianLabCitations } from './australian';
export { canadianLabCitations } from './canadian';
export { ukLabCitations } from './uk';

export const labCitations: Record<string, LabCitation> = {
  ...canadianLabCitations,
  ...australianLabCitations,
  ...ukLabCitations,
};
