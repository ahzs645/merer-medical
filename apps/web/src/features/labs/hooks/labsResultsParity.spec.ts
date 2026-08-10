import { RxDatabase } from 'rxdb';

import { DatabaseCollections } from '../../../app/providers/DatabaseCollections';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import {
  cleanupTestDatabase,
  createTestDatabase,
  seedTestDatabase,
} from '../../../test-utils/createTestDatabase';
import { buildResultsViewModel } from '../../results/utils/resultNormalization';
import { groupLabs } from '../utils/labGrouping';
import { findLabObservations, isLaboratoryObservation } from './useLabsData';

/**
 * /records/labs and /records/results are two views of the same lab records and
 * used to disagree about how many there were (180 vs 192): the results page
 * counted twelve Epic lab *panel reports* as lab results because
 * isLaboratoryObservation only looked at the FHIR category, never at the
 * resource type. These tests pin the two surfaces to one definition.
 */
describe('labs and results agree on how many lab results there are', () => {
  let db: RxDatabase<DatabaseCollections>;
  let userId: string;

  beforeEach(async () => {
    db = await createTestDatabase();
    await seedTestDatabase(db);
    const user = await db.user_documents.findOne().exec();
    userId = user?.get('id');
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  async function countResultsPageLabs() {
    const docs = await db.clinical_documents
      .find({ selector: { user_id: userId } })
      .exec();
    const viewModel = buildResultsViewModel({
      clinicalDocuments: docs.map(
        (doc) => doc.toMutableJSON() as ClinicalDocument<any>,
      ),
    });
    return viewModel.groups
      .flatMap((group) => group.results)
      .filter((result) => result.type === 'lab').length;
  }

  it('reports the same lab count on both surfaces for the demo records', async () => {
    const labsPageCount = (await findLabObservations(db, userId)).length;

    expect(labsPageCount).toBeGreaterThan(0);
    expect(await countResultsPageLabs()).toBe(labsPageCount);
  });

  it('leaves lab-categorised diagnostic reports out of both lab counts', async () => {
    const reports = (
      await db.clinical_documents
        .find({
          selector: {
            user_id: userId,
            'data_record.resource_type': 'diagnosticreport',
          },
        })
        .exec()
    ).map((doc) => doc.toMutableJSON() as ClinicalDocument<any>);
    const labCategorised = reports.filter((report) => {
      const category = (report.data_record.raw as any)?.resource?.category;
      const codings = (Array.isArray(category) ? category : [category])
        .flatMap((entry: any) => entry?.coding || [])
        .map((coding: any) => String(coding?.code || '').toLowerCase());
      return codings.includes('lab') || codings.includes('laboratory');
    });

    // Guards the test itself: the fixture has to contain the shape that broke.
    expect(labCategorised.length).toBeGreaterThan(0);
    labCategorised.forEach((report) => {
      expect(isLaboratoryObservation(report)).toBe(false);
    });

    const viewModel = buildResultsViewModel({ clinicalDocuments: reports });
    const types = viewModel.groups
      .flatMap((group) => group.results)
      .map((result) => result.type);
    expect(types).not.toContain('lab');
  });

  it('keeps undated lab observations visible on both surfaces', async () => {
    const before = (await findLabObservations(db, userId)).length;
    await db.clinical_documents.insert(undatedLabDocument(userId) as any);

    const labs = await findLabObservations(db, userId);
    expect(labs).toHaveLength(before + 1);
    expect(labs.map((lab) => lab.metadata?.display_name)).toContain(
      'Undated Marker',
    );
    expect(await countResultsPageLabs()).toBe(labs.length);
  });

  it('sorts an undated lab last within its group and its group last overall', async () => {
    const dated = undatedLabDocument(userId, {
      metadataId: 'manual:undated-parity-dated',
      date: '2024-03-04T00:00:00.000Z',
    });
    const undated = undatedLabDocument(userId);
    const groups = groupLabs([undated, dated] as any);
    const marker = groups.find((group) => group.name === 'Undated Marker');

    expect(marker?.labs.map((lab) => lab.metadata?.date)).toEqual([
      '2024-03-04T00:00:00.000Z',
      undefined,
    ]);

    // A group with no dates at all falls to the bottom of the list.
    const ordered = groupLabs([
      undatedLabDocument(userId, {
        metadataId: 'manual:undated-parity-other',
        displayName: 'Dated Marker',
        date: '2024-03-04T00:00:00.000Z',
      }),
      undated,
    ] as any);
    expect(ordered.map((group) => group.name)).toEqual([
      'Dated Marker',
      'Undated Marker',
    ]);
  });
});

function undatedLabDocument(
  userId: string,
  {
    metadataId = 'manual:undated-parity',
    displayName = 'Undated Marker',
    date,
  }: { metadataId?: string; displayName?: string; date?: string } = {},
): ClinicalDocument<any> {
  return {
    id: `parity-connection|${userId}|${metadataId}`,
    connection_record_id: 'parity-connection',
    user_id: userId,
    data_record: {
      raw: {
        resource: {
          resourceType: 'Observation',
          id: metadataId,
          status: 'final',
          category: [{ coding: [{ code: 'laboratory' }] }],
          code: { text: displayName },
          valueQuantity: { value: 7, unit: 'mmol/L' },
        },
      },
      format: 'FHIR.DSTU2',
      content_type: 'application/json',
      resource_type: 'observation',
      version_history: [],
    },
    metadata: {
      id: metadataId,
      display_name: displayName,
      ...(date ? { date } : {}),
    },
  } as ClinicalDocument<any>;
}
