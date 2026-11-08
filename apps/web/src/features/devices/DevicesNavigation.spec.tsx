/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { recordSearchPath } from '../../shared/utils/recordSearchPath';
import { useRecordList } from '../../shared/hooks/useRecordList';
import { DevicesTab, mapDeviceDocs } from './DevicesTab';

jest.mock('../../shared/hooks/useRecordList', () => ({
  useRecordList: jest.fn(),
}));
jest.mock('../manual-entry/ManualRecordActions', () => ({
  ManualRecordActions: () => null,
}));

function device(id: string, name: string): ClinicalDocument {
  return {
    id,
    user_id: 'synthetic-user',
    connection_record_id: 'synthetic-source',
    data_record: {
      resource_type: 'device',
      raw: {},
      format: 'FHIR.R4',
      content_type: 'application/json',
      version_history: [],
    },
    metadata: { display_name: name },
  };
}

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="device-location">
      {location.pathname}
      {location.search}
    </output>
  );
}

it('opens the matching undated device from search and permits clearing the filter', () => {
  const wanted = device('synthetic-device', 'Monitor [demo]');
  (useRecordList as jest.Mock).mockReturnValue({
    items: mapDeviceDocs([wanted, device('another-device', 'CPAP')]),
    status: 'success',
    error: null,
  });
  render(
    <MemoryRouter initialEntries={[recordSearchPath(wanted)!]}>
      <DevicesTab />
      <LocationProbe />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Monitor [demo]' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'CPAP' })).toBeNull();
  fireEvent.change(screen.getByPlaceholderText('Search devices'), {
    target: { value: '' },
  });
  expect(screen.getByRole('heading', { name: 'CPAP' })).toBeTruthy();
  expect(screen.getByTestId('device-location').textContent).toBe(
    '/records/devices',
  );
});
