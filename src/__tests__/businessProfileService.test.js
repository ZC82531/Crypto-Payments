/**
 * Frontend Unit Tests – businessProfileService
 * Tests getBusinessProfile, saveBusinessProfile, and deleteBusinessProfile
 * by mocking the Supabase client.
 */

// Mock the Supabase client before importing the module under test
jest.mock('../client.jsx', () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
    single: jest.fn(),
  };

  return {
    __esModule: true,
    default: {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockChain),
    },
  };
});

import supabase from '../client.jsx';
import {
  getBusinessProfile,
  saveBusinessProfile,
  deleteBusinessProfile,
} from '../businessProfileService.js';

// Helper to get the shared mock chain (same object returned by from())
const getChain = () => supabase.from();

const MOCK_USER = { id: 'user-abc-123', email: 'test@example.com' };

// ---------------------------------------------------------------------------
// getBusinessProfile
// ---------------------------------------------------------------------------
describe('getBusinessProfile', () => {
  test('throws "Not authenticated" when no user session', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'not logged in' },
    });

    await expect(getBusinessProfile()).rejects.toThrow('Not authenticated');
  });

  test('returns null when authenticated user has no profile', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: MOCK_USER },
      error: null,
    });
    getChain().maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await getBusinessProfile();
    expect(result).toBeNull();
  });

  test('returns profile data when one exists', async () => {
    const profile = {
      id: 'profile-1',
      user_id: MOCK_USER.id,
      business_name: 'ACME Corp',
      routing_number: '021000021',
      account_number: '000123456789',
    };

    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: MOCK_USER },
      error: null,
    });
    getChain().maybeSingle.mockResolvedValueOnce({ data: profile, error: null });

    const result = await getBusinessProfile();
    expect(result).toEqual(profile);
    expect(result.business_name).toBe('ACME Corp');
  });

  test('throws when database returns an error', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: MOCK_USER },
      error: null,
    });
    getChain().maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB connection failed' },
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(getBusinessProfile()).rejects.toMatchObject({
      message: 'DB connection failed',
    });
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// saveBusinessProfile – INSERT path (no existing profile)
// ---------------------------------------------------------------------------
describe('saveBusinessProfile – new profile (INSERT)', () => {
  test('throws "Not authenticated" when no user session', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'not logged in' },
    });

    await expect(
      saveBusinessProfile({ business_name: 'X', routing_number: '021000021', account_number: '1234' })
    ).rejects.toThrow('Not authenticated');
  });

  test('inserts a new profile and returns saved data', async () => {
    const saved = {
      id: 'new-profile',
      user_id: MOCK_USER.id,
      business_name: 'Fresh Biz',
      routing_number: '021000021',
      account_number: '1234567890',
    };

    // getUser → authenticated
    supabase.auth.getUser
      .mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null }) // saveBusinessProfile auth
      .mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null }); // getBusinessProfile inner auth

    // getBusinessProfile inner call → no existing profile
    getChain().maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // insert().select().single() → saved row
    getChain().single.mockResolvedValueOnce({ data: saved, error: null });

    const result = await saveBusinessProfile({
      business_name: 'Fresh Biz',
      routing_number: '021000021',
      account_number: '1234567890',
    });

    expect(result).toEqual(saved);
    expect(result.business_name).toBe('Fresh Biz');
  });
});

// ---------------------------------------------------------------------------
// saveBusinessProfile – UPDATE path (existing profile)
// ---------------------------------------------------------------------------
describe('saveBusinessProfile – existing profile (UPDATE)', () => {
  test('updates an existing profile and returns updated data', async () => {
    const existing = { id: 'profile-existing', user_id: MOCK_USER.id };
    const updated = { ...existing, business_name: 'Updated Biz', routing_number: '021000021', account_number: '0987654321' };

    supabase.auth.getUser
      .mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null }) // saveBusinessProfile auth
      .mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null }); // inner getBusinessProfile

    // Inner getBusinessProfile → existing profile found
    getChain().maybeSingle.mockResolvedValueOnce({ data: existing, error: null });
    // update().eq().select().single() → updated row
    getChain().single.mockResolvedValueOnce({ data: updated, error: null });

    const result = await saveBusinessProfile({
      business_name: 'Updated Biz',
      routing_number: '021000021',
      account_number: '0987654321',
    });

    expect(result.business_name).toBe('Updated Biz');
  });
});

// ---------------------------------------------------------------------------
// deleteBusinessProfile
// ---------------------------------------------------------------------------
describe('deleteBusinessProfile', () => {
  test('throws "Not authenticated" when no user session', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'not logged in' },
    });

    await expect(deleteBusinessProfile()).rejects.toThrow('Not authenticated');
  });

  test('returns true on successful deletion', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: MOCK_USER },
      error: null,
    });
    // delete().eq() returns { error: null }
    getChain().eq.mockResolvedValueOnce({ error: null });

    const result = await deleteBusinessProfile();
    expect(result).toBe(true);
  });

  test('throws when database returns an error on delete', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: MOCK_USER },
      error: null,
    });
    getChain().eq.mockResolvedValueOnce({ error: { message: 'Delete failed' } });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(deleteBusinessProfile()).rejects.toMatchObject({
      message: 'Delete failed',
    });
    consoleSpy.mockRestore();
  });
});
