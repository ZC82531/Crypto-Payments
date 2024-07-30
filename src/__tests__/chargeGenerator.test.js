/**
 * Frontend Unit Tests – chargeGenerator
 * createCharge is a pure async function over fetch; we mock fetch globally.
 */
import { createCharge } from '../chargeGenerator.js';

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  delete global.fetch;
});

describe('createCharge – input validation', () => {
  test('throws when amount is undefined', async () => {
    await expect(createCharge(undefined)).rejects.toThrow('Invalid amount');
  });

  test('throws when amount is null', async () => {
    await expect(createCharge(null)).rejects.toThrow('Invalid amount');
  });

  test('throws when amount is a non-numeric string', async () => {
    await expect(createCharge('abc')).rejects.toThrow('Invalid amount');
  });

  test('throws when amount is empty string', async () => {
    await expect(createCharge('')).rejects.toThrow('Invalid amount');
  });
});

describe('createCharge – successful response', () => {
  test('calls /api/create-payment-link with POST and JSON body', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://pay.example.com/invoice/123', id: 'inv_123' }),
    });

    await createCharge(50);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/create-payment-link',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ amount: 50 }),
      })
    );
  });

  test('returns normalised { data: { hosted_url, id } } shape', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://pay.example.com/invoice/abc', id: 'inv_abc' }),
    });

    const result = await createCharge(25);

    expect(result).toEqual({
      data: {
        hosted_url: 'https://pay.example.com/invoice/abc',
        id: 'inv_abc',
      },
    });
  });
});

describe('createCharge – error responses', () => {
  test('throws with server error message when response is not ok', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ error: 'Payment provider unavailable' }),
    });

    await expect(createCharge(10)).rejects.toThrow('Payment provider unavailable');
  });

  test('throws fallback message when error body has no error field', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(createCharge(10)).rejects.toThrow('Payment provider error: 500');
  });

  test('propagates network errors (fetch throws)', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network failure'));

    await expect(createCharge(10)).rejects.toThrow('Network failure');
  });
});
