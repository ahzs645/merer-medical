import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { mapDeviceDocs } from './DevicesTab';

function deviceDoc(resource: Record<string, unknown>, displayName?: string) {
  return {
    id: 'conn|user|manual:device-dexcom',
    connection_record_id: 'conn',
    user_id: 'user',
    data_record: {
      raw: { resource: { resourceType: 'Device', ...resource } },
      format: 'FHIR.DSTU2',
      content_type: 'application/json',
      resource_type: 'device',
      version_history: [],
    },
    metadata: {
      id: 'manual:device-dexcom',
      display_name: displayName,
      date: '2024-11-25T12:00:00.000Z',
    },
  } as unknown as ClinicalDocument;
}

describe('mapDeviceDocs', () => {
  it('names the device and keeps its type, maker and status', () => {
    const [item] = mapDeviceDocs([
      deviceDoc({
        status: 'active',
        deviceName: [{ name: 'Dexcom G7 CGM', type: 'user-friendly-name' }],
        type: { text: 'Continuous glucose monitor' },
        manufacturer: 'Dexcom',
      }),
    ]);
    expect(item).toMatchObject({
      name: 'Dexcom G7 CGM',
      type: 'Continuous glucose monitor',
      manufacturer: 'Dexcom',
      status: 'active',
    });
  });

  it('shows note lines but not the internal source-document pointer', () => {
    const [item] = mapDeviceDocs([
      deviceDoc({
        deviceName: [{ name: 'Dexcom G7' }],
        note: [
          {
            text: 'In use from: 2024-11-25\nSource document: manual:source-document-x',
          },
        ],
      }),
    ]);
    expect(item.notes).toEqual(['In use from: 2024-11-25']);
  });
});
