import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { isLaboratoryObservation } from '../labs/hooks/useLabsData';
import { mapReferralDocs } from '../referrals/referralRecords';
import {
  appendSpecialtyNotes,
  buildClinicalDocument,
  buildSpecialtyDetails,
  getManualSpecialtyDetails,
  normalizeAbsentReason,
} from './manualRecordBuilders';

/** The predicate VitalsTab selects observations with (VitalsTab.tsx). */
function isVitalSign(resource: Record<string, unknown>): boolean {
  const raw = resource['category'] as
    | Array<{ coding?: Array<{ code?: string }> }>
    | undefined;
  return (raw || []).some((category) =>
    (category.coding || []).some((coding) => coding.code === 'vital-signs'),
  );
}

function resourceOf(doc: ClinicalDocument): Record<string, any> {
  return (doc.data_record.raw as { resource: Record<string, any> }).resource;
}

describe('manual record builders', () => {
  it('builds dental specialty details from form values', () => {
    const details = buildSpecialtyDetails({
      specialty: 'dental',
      dentalEntryKind: 'procedure',
      optometryEntryKind: 'checkup',
      toothNumber: ' 12 ',
      dentalTeeth: '',
      toothRange: '',
      dentalQuadrant: ' upper right ',
      dentalArch: '',
      dentition: '',
      dentalStatus: '',
      dentalSeverity: ' moderate ',
      procedureCode: ' D1110 ',
      dentalProvider: '',
      dentalLocation: '',
      dentalFollowUp: '',
      dentalSurfaces: ['M', 'O'],
      dentalRecall: '',
      orthoPhase: '',
      orthoArch: '',
      orthoAppliance: '',
      orthoStatus: '',
      alignerCurrent: '',
      alignerTotal: '',
      overjet: '',
      overbite: '',
      molarClass: '',
      nextVisit: '',
      eyeSide: 'OU',
      odSphere: '',
      odCylinder: '',
      odAxis: '',
      odAdd: '',
      osSphere: '',
      osCylinder: '',
      osAxis: '',
      osAdd: '',
      pd: '',
      visualAcuityOd: '',
      visualAcuityOs: '',
      iopOd: '',
      iopOs: '',
      examMethod: '',
      surgeryType: '',
      surgerySurgeon: '',
      laserPlatform: '',
      opticalZone: '',
      ablationDepth: '',
      flapThickness: '',
      iolModel: '',
      iolPower: '',
      targetRefraction: '',
      surgeryComplications: '',
      surgeryOutcome: '',
      surgeryFollowUp: '',
      imagingDetails: {
        modality: '',
        bodySite: '',
        laterality: '',
        studyType: '',
        accessionId: '',
        studyId: '',
      },
    });

    expect(details).toMatchObject({
      specialty: 'dental',
      subtype: 'procedure',
      toothNumber: '12',
      dentalQuadrant: 'upper right',
      dentalSeverity: 'moderate',
      procedureCode: 'D1110',
      dentalSurfaces: ['M', 'O'],
    });
  });

  it('appends specialty notes without losing existing notes', () => {
    const notes = appendSpecialtyNotes('Existing note', {
      specialty: 'optometry',
      subtype: 'glassesPrescription',
      eyeSide: 'OU',
      odSphere: '-1.00',
      osSphere: '-1.25',
      pd: '62',
    });

    expect(notes).toContain('Existing note');
    expect(notes).toContain('Eye: OU');
    expect(notes).toContain('OD Rx: sphere -1.00');
    expect(notes).toContain('OS Rx: sphere -1.25');
    expect(notes).toContain('PD: 62');
  });

  it('builds a manual observation clinical document', () => {
    const doc = buildClinicalDocument({
      connectionId: 'conn-1',
      userId: 'user-1',
      recordType: 'vital',
      recordDate: '2024-01-01T12:00:00.000Z',
      title: 'Heart rate',
      notes: 'Resting',
      fileName: '',
      fileContentType: '',
      observation: {
        valueKind: 'quantity',
        comparator: '',
        value: '72',
        unit: 'bpm',
        rangeLow: '',
        rangeHigh: '',
        rangeText: '',
        interpretation: '',
        absentReason: 'pending',
      },
    });

    expect(doc.connection_record_id).toBe('conn-1');
    expect(doc.user_id).toBe('user-1');
    expect(doc.data_record.resource_type).toBe('observation');
    expect(doc.metadata.display_name).toBe('Heart rate');
    const raw = doc.data_record.raw as {
      resource: { valueQuantity: { value: number; unit: string } };
    };
    expect(raw.resource.valueQuantity).toMatchObject({
      value: 72,
      unit: 'bpm',
    });
  });

  it('categorises a hand-entered vital so the Vitals page can find it', () => {
    // A vital used to be written with no category at all, so "Body weight
    // 72 kg" reached the Timeline and then nothing else: Vitals selects on the
    // vital-signs coding and matched none of them.
    const doc = buildClinicalDocument({
      connectionId: 'conn-1',
      userId: 'user-1',
      recordType: 'vital',
      recordDate: '2024-01-01T12:00:00.000Z',
      title: 'Body weight',
      notes: '',
      fileName: '',
      fileContentType: '',
      observation: {
        valueKind: 'quantity',
        comparator: '',
        value: '72',
        unit: 'kg',
        rangeLow: '',
        rangeHigh: '',
        rangeText: '',
        interpretation: '',
        absentReason: 'pending',
      },
    });

    expect(resourceOf(doc).category).toEqual([
      {
        text: 'Vital Signs',
        coding: [
          {
            system:
              'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          },
        ],
      },
    ]);
    expect(isVitalSign(resourceOf(doc))).toBe(true);
    expect(isLaboratoryObservation(doc as never)).toBe(false);
  });

  it('categorises a hand-entered lab as laboratory without unseating Labs', () => {
    const doc = buildClinicalDocument({
      connectionId: 'conn-1',
      userId: 'user-1',
      recordType: 'lab',
      recordDate: '2024-01-01T12:00:00.000Z',
      title: 'Blood glucose',
      notes: '',
      fileName: '',
      fileContentType: '',
    });

    expect(resourceOf(doc).category[0].coding[0]).toMatchObject({
      code: 'laboratory',
    });
    expect(isLaboratoryObservation(doc as never)).toBe(true);
    expect(isVitalSign(resourceOf(doc))).toBe(false);
  });

  it('keeps the specialty category beside the standard coding', () => {
    // The dental and optometry pages search the serialized category, so the
    // specialty entry has to survive alongside the vital-signs coding.
    const doc = buildClinicalDocument({
      connectionId: 'conn-1',
      userId: 'user-1',
      recordType: 'vital',
      recordDate: '2024-01-01T12:00:00.000Z',
      title: 'IOP',
      notes: '',
      fileName: '',
      fileContentType: '',
      specialtyDetails: { specialty: 'optometry', subtype: 'iop' },
    });

    expect(isVitalSign(resourceOf(doc))).toBe(true);
    expect(resourceOf(doc).category).toContainEqual({ text: 'optometry' });
  });

  it('builds a referral the Referrals tab can list', () => {
    const doc = buildClinicalDocument({
      connectionId: 'conn-1',
      userId: 'user-1',
      recordType: 'servicerequest',
      recordDate: '2024-03-04T12:00:00.000Z',
      title: 'Dermatology',
      notes: 'Mole check, sent by Dr. Patel',
      fileName: '',
      fileContentType: '',
    });

    // The tab's own query selects on this resource type, and its mapper reads
    // status / code / authoredOn / note.
    expect(doc.data_record.resource_type).toBe('servicerequest');
    expect(doc.data_record.format).toBe('FHIR.R4');
    expect(resourceOf(doc)).toMatchObject({
      resourceType: 'ServiceRequest',
      status: 'active',
      intent: 'order',
      code: { text: 'Dermatology' },
      authoredOn: '2024-03-04T12:00:00.000Z',
      occurrenceDateTime: '2024-03-04T12:00:00.000Z',
    });
    expect(resourceOf(doc).category[0].coding[0].code).toBe('306206005');

    const [item] = mapReferralDocs([{ ...doc, id: 'doc-1' }], new Map());
    expect(item).toMatchObject({
      name: 'Dermatology',
      status: 'active',
      date: '2024-03-04T12:00:00.000Z',
      notes: ['Mole check, sent by Dr. Patel'],
      source: 'Manual entry',
    });
  });

  it('builds a manual family member history clinical document', () => {
    const doc = buildClinicalDocument({
      connectionId: 'conn-1',
      userId: 'user-1',
      recordType: 'familymemberhistory',
      recordDate: '2024-11-26T12:00:00.000Z',
      title: 'No family history of melanoma',
      notes: 'Reviewed at visit',
      fileName: '',
      fileContentType: '',
      familyRelationship: 'Family',
    });

    expect(doc.data_record.resource_type).toBe('familymemberhistory');
    expect(doc.metadata.display_name).toBe('No family history of melanoma');
    const raw = doc.data_record.raw as {
      manual_kind: string;
      resource: {
        resourceType: string;
        relationship: { text: string };
        condition: Array<{ code: { text: string } }>;
        note: Array<{ text: string }>;
      };
    };
    expect(raw.manual_kind).toBe('familymemberhistory');
    expect(raw.resource.resourceType).toBe('FamilyMemberHistory');
    expect(raw.resource.relationship.text).toBe('Family');
    expect(raw.resource.condition[0].code.text).toBe(
      'No family history of melanoma',
    );
    expect(raw.resource.note[0].text).toBe('Reviewed at visit');
  });

  it('builds a manual social history observation', () => {
    const doc = buildClinicalDocument({
      connectionId: 'conn-1',
      userId: 'user-1',
      recordType: 'socialhistory',
      recordDate: '2024-11-26T12:00:00.000Z',
      title: 'Tobacco use',
      notes: 'Former pipe smoker, quit',
      fileName: '',
      fileContentType: '',
      observation: {
        valueKind: 'string',
        comparator: '',
        value: 'Former smoker (pipe)',
        unit: '',
        rangeLow: '',
        rangeHigh: '',
        rangeText: '',
        interpretation: '',
        absentReason: 'pending',
      },
    });

    expect(doc.data_record.resource_type).toBe('observation');
    const raw = doc.data_record.raw as {
      manual_kind: string;
      resource: {
        resourceType: string;
        category: Array<{ coding: Array<{ code: string }> }>;
        valueString: string;
      };
    };
    expect(raw.manual_kind).toBe('socialhistory');
    expect(raw.resource.resourceType).toBe('Observation');
    expect(raw.resource.category[0].coding[0].code).toBe('social-history');
    expect(raw.resource.valueString).toBe('Former smoker (pipe)');
  });

  it('reads manual specialty details from metadata fallback', () => {
    const doc = {
      id: 'doc-1',
      user_id: 'user-1',
      connection_record_id: 'conn-1',
      data_record: {
        raw: {},
        format: 'FHIR.DSTU2',
        content_type: 'application/json',
        resource_type: 'procedure',
        version_history: [],
      },
      metadata: {
        manual_specialty: 'dental',
        manual_subtype: 'cleaning',
        manual_specialty_details: {
          specialty: 'dental',
          toothNumber: '18',
        },
      },
    } as ClinicalDocument;

    expect(getManualSpecialtyDetails(doc)).toMatchObject({
      specialty: 'dental',
      dentalEntryKind: 'cleaning',
      toothNumber: '18',
    });
  });

  it('normalizes absent reasons', () => {
    expect(normalizeAbsentReason('not performed')).toBe('not-performed');
    expect(normalizeAbsentReason('n/a')).toBe('not-applicable');
    expect(normalizeAbsentReason('unknown')).toBe('unknown');
    expect(normalizeAbsentReason(undefined)).toBe('pending');
  });
});
