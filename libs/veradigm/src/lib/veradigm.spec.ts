import { VeradigmDSTU2TenantEndpoints } from './veradigm';

describe('veradigm', () => {
  it('should have DSTU2 endpoints', () => {
    expect(VeradigmDSTU2TenantEndpoints.length).toBeGreaterThan(0);
  });

  it('every endpoint should have an id, url, and name', () => {
    for (const endpoint of VeradigmDSTU2TenantEndpoints) {
      expect(endpoint.id).toBeTruthy();
      expect(endpoint.url).toBeTruthy();
      expect(endpoint.name).toBeTruthy();
    }
  });
});
