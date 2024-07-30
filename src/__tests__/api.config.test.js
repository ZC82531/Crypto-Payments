/**
 * Frontend Unit Tests – API config
 * Ensures all endpoints use relative paths (no hardcoded domain).
 */
import { API_CONFIG, getApiUrl } from '../config/api.js';

describe('API_CONFIG endpoints', () => {
  test('businessProfile is a relative path', () => {
    expect(API_CONFIG.endpoints.businessProfile).toBe('/api/business-profile');
    expect(API_CONFIG.endpoints.businessProfile).not.toMatch(/^https?:\/\//);
  });

  test('paymentsHistory is a relative path', () => {
    expect(API_CONFIG.endpoints.paymentsHistory).toBe('/api/payments/history');
    expect(API_CONFIG.endpoints.paymentsHistory).not.toMatch(/^https?:\/\//);
  });

  test('paymentsCreate is a relative path', () => {
    expect(API_CONFIG.endpoints.paymentsCreate).toBe('/api/payments/create');
    expect(API_CONFIG.endpoints.paymentsCreate).not.toMatch(/^https?:\/\//);
  });

  test('publicBusinessProfile builds a relative path for a given username', () => {
    const url = API_CONFIG.endpoints.publicBusinessProfile('acme@example.com');
    expect(url).toBe('/api/public/business-profile/acme@example.com');
    expect(url).not.toMatch(/^https?:\/\//);
  });

  test('baseURL is empty string', () => {
    expect(API_CONFIG.baseURL).toBe('');
  });
});

describe('getApiUrl helper', () => {
  test('prepends slash when path has no leading slash', () => {
    expect(getApiUrl('some/path')).toBe('/some/path');
  });

  test('does not double-slash when path already starts with slash', () => {
    expect(getApiUrl('/some/path')).toBe('/some/path');
  });
});
