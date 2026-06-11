import { EpicDSTU2TenantEndpoints, EpicR4TenantEndpoints } from './epic';

describe('epic', () => {
  it('should have DSTU2 endpoints', () => {
    expect(EpicDSTU2TenantEndpoints.length).toBeGreaterThan(0);
  });

  it('should have R4 endpoints', () => {
    expect(EpicR4TenantEndpoints.length).toBeGreaterThan(0);
  });

  it('every endpoint should have the fields needed for OAuth', () => {
    for (const endpoint of [
      ...EpicDSTU2TenantEndpoints,
      ...EpicR4TenantEndpoints,
    ]) {
      expect(endpoint.id).toBeTruthy();
      expect(endpoint.url).toBeTruthy();
      expect(endpoint.name).toBeTruthy();
      expect(endpoint.token).toBeTruthy();
      expect(endpoint.authorize).toBeTruthy();
    }
  });
});
