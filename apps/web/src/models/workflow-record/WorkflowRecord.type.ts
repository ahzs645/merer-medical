export type WorkflowRecordKind =
  | 'audit-log-entry'
  | 'care-task'
  | 'tracker-entry'
  | 'sharing-state';

export interface WorkflowRecord<TPayload = unknown> {
  id: string;
  user_id: string;
  kind: WorkflowRecordKind;
  payload: TPayload;
  created_at: string;
  updated_at: string;
}

