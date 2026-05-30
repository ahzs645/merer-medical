export const workflowRecordSchemaLiteral = {
  title: 'Workflow Record Schema',
  name: 'workflow_records',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  description:
    'Durable local workflow state for patient-owned record features such as audit logs, care tasks, trackers, and sharing preferences.',
  properties: {
    id: {
      type: 'string',
      maxLength: 128,
    },
    user_id: {
      type: 'string',
      maxLength: 128,
      ref: 'user_documents',
    },
    kind: {
      type: 'string',
      maxLength: 64,
    },
    payload: {},
    created_at: {
      type: 'string',
      format: 'date-time',
      maxLength: 128,
    },
    updated_at: {
      type: 'string',
      format: 'date-time',
      maxLength: 128,
    },
  },
  required: ['id', 'user_id', 'kind', 'payload', 'created_at', 'updated_at'],
  indexes: ['user_id', 'kind', 'updated_at'],
} as const;

