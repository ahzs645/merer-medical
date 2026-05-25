export const notificationSchemaLiteral = {
  title: 'Notification Schema',
  name: 'notifications',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  description: 'Persistent, user-dismissable in-app notifications',
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
    title: {
      type: 'string',
    },
    message: {
      type: 'string',
    },
    variant: {
      type: 'string',
      maxLength: 16,
    },
    source: {
      type: 'string',
      maxLength: 64,
    },
    created_at: {
      type: 'string',
      maxLength: 40,
    },
    read: {
      type: 'boolean',
    },
    action_route: {
      type: 'string',
    },
    action_label: {
      type: 'string',
    },
  },
  required: ['id', 'user_id', 'message', 'variant', 'created_at', 'read'],
  indexes: ['created_at'],
} as const;
