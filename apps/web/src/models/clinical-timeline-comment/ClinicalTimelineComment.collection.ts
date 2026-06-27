import { RxJsonSchema, RxCollection } from 'rxdb';
import { clinicalTimelineCommentSchemaLiteral } from './ClinicalTimelineComment.schema';
import { ClinicalTimelineComment } from './ClinicalTimelineComment.type';

export const ClinicalTimelineCommentSchema: RxJsonSchema<ClinicalTimelineComment> =
  clinicalTimelineCommentSchemaLiteral;

export type ClinicalTimelineCommentCollection =
  RxCollection<ClinicalTimelineComment>;
