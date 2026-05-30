import { RxCollection, RxJsonSchema } from 'rxdb';

import { workflowRecordSchemaLiteral } from './WorkflowRecord.schema';
import { WorkflowRecord } from './WorkflowRecord.type';

export const WorkflowRecordSchema: RxJsonSchema<WorkflowRecord> =
  workflowRecordSchemaLiteral;

export type WorkflowRecordCollection = RxCollection<WorkflowRecord>;

