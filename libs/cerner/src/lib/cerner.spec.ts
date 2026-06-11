import { CernerDSTU2TenantEndpoints, CernerR4TenantEndpoints } from './cerner';

describe('cerner', () => {
  it('should have DSTU2 endpoints', () => {
    expect(CernerDSTU2TenantEndpoints.length).toBeGreaterThan(0);
  });

  it('should have R4 endpoints', () => {
    expect(CernerR4TenantEndpoints.length).toBeGreaterThan(0);
  });

  it('every endpoint should have the fields needed for OAuth', () => {
    for (const endpoint of [
      ...CernerDSTU2TenantEndpoints,
      ...CernerR4TenantEndpoints,
    ]) {
      expect(endpoint.id).toBeTruthy();
      expect(endpoint.url).toBeTruthy();
      expect(endpoint.name).toBeTruthy();
      expect(endpoint.token).toBeTruthy();
      expect(endpoint.authorize).toBeTruthy();
    }
  });
});
