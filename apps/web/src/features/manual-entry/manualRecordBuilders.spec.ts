import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import {
  appendSpecialtyNotes,
  buildClinicalDocument,
  buildSpecialtyDetails,
  getManualSpecialtyDetails,
  normalizeAbsentReason,
} from './manualRecordBuilders';

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
