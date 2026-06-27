import { addRxPlugin, createRxDatabase } from 'rxdb';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { getRxStorageMemory } from 'rxdb/plugins/memory';

import { ClinicalTimelineCommentSchema } from './ClinicalTimelineComment.collection';

// dev-mode is what strictly validates the schema, exactly as in the app.
addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

describe('ClinicalTimelineComment collection', () => {
  it('passes strict dev-mode schema validation and round-trips a comment', async () => {
    const db = await createRxDatabase({
      name: `ctc-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      storage: getRxStorageMemory(),
      multiInstance: false,
      ignoreDuplicate: true,
    });

    await db.addCollections({
      clinical_timeline_comments: { schema: ClinicalTimelineCommentSchema },
    });

    const inserted = await db.clinical_timeline_comments.insert({
      id: 'abc123',
      user_id: 'user-1',
      target_key: 'labs|Hemoglobin|2024-01-02',
      category: 'labs',
      item: 'Hemoglobin',
      lane_title: 'Hemoglobin',
      day_key: '2024-01-02',
      body: 'Trending down — recheck next visit.',
      author: 'Dr. Test',
      created_at: new Date().toISOString(),
    });
    expect(inserted.id).toBe('abc123');

    const found = await db.clinical_timeline_comments
      .find({ selector: { user_id: 'user-1' } })
      .exec();
    expect(found).toHaveLength(1);
    expect(found[0].target_key).toBe('labs|Hemoglobin|2024-01-02');

    await found[0].remove();
    const afterDelete = await db.clinical_timeline_comments
      .find({ selector: { user_id: 'user-1' } })
      .exec();
    expect(afterDelete).toHaveLength(0);

    await db.destroy();
  });
});
