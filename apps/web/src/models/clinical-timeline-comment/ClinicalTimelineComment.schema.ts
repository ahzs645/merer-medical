export const clinicalTimelineCommentSchemaLiteral = {
  title: 'Clinical Timeline Comment Schema',
  name: 'clinical_timeline_comments',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  description:
    'User-authored notes attached to a point on the clinical timeline view',
  properties: {
    id: {
      type: 'string',
      maxLength: 64,
    },
    user_id: {
      type: 'string',
      maxLength: 128,
      ref: 'user_documents',
    },
    /** Stable identity of the commented point: `${category}|${item}|${day_key}`. */
    target_key: {
      type: 'string',
      maxLength: 512,
    },
    /** Lane category, e.g. 'labs' | 'vitals' | 'medications'. */
    category: {
      type: 'string',
      maxLength: 32,
    },
    /** Specific parameter/medication/condition the comment is about. */
    item: {
      type: 'string',
    },
    /** Human-readable lane title, kept for display convenience. */
    lane_title: {
      type: 'string',
    },
    /** ISO date (yyyy-MM-dd) of the data point. */
    day_key: {
      type: 'string',
      maxLength: 40,
    },
    body: {
      type: 'string',
    },
    author: {
      type: 'string',
    },
    created_at: {
      type: 'string',
      maxLength: 40,
    },
  },
  required: [
    'id',
    'user_id',
    'target_key',
    'category',
    'item',
    'day_key',
    'body',
    'created_at',
  ],
  indexes: ['created_at'],
} as const;
