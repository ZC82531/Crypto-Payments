/**
 * Frontend Unit Tests – BusinessSetup form validation
 * Tests the pure validateForm logic and form rendering.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock supabase and the fetch call made on submit
jest.mock('../client.jsx', () => ({
  __esModule: true,
  default: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } },
        error: null,
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

global.fetch = jest.fn();

import BusinessSetup from '../BusinessSetup.jsx';

const renderSetup = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <BusinessSetup />
    </MemoryRouter>
  );

// ---------------------------------------------------------------------------
// Pure validation logic (mirrors the component's validateForm)
// ---------------------------------------------------------------------------
function validateForm({ business_name, routing_number, account_number }) {
  if (!business_name.trim()) return false;
  if (!/^\d{9}$/.test(routing_number)) return false;
  if (!/^\d{4,20}$/.test(account_number)) return false;
  return true;
}

describe('validateForm – pure logic', () => {
  test('returns false when business_name is empty', () => {
    expect(validateForm({ business_name: '', routing_number: '021000021', account_number: '1234' })).toBe(false);
  });

  test('returns false when business_name is only whitespace', () => {
    expect(validateForm({ business_name: '   ', routing_number: '021000021', account_number: '1234' })).toBe(false);
  });

  test('returns false when routing_number is not 9 digits', () => {
    expect(validateForm({ business_name: 'ACME', routing_number: '12345', account_number: '1234' })).toBe(false);
  });

  test('returns false when routing_number contains letters', () => {
    expect(validateForm({ business_name: 'ACME', routing_number: '02100002a', account_number: '1234' })).toBe(false);
  });

  test('returns false when account_number is fewer than 4 digits', () => {
    expect(validateForm({ business_name: 'ACME', routing_number: '021000021', account_number: '123' })).toBe(false);
  });

  test('returns false when account_number exceeds 20 digits', () => {
    expect(validateForm({ business_name: 'ACME', routing_number: '021000021', account_number: '123456789012345678901' })).toBe(false);
  });

  test('returns true for valid inputs (minimum account length)', () => {
    expect(validateForm({ business_name: 'ACME', routing_number: '021000021', account_number: '1234' })).toBe(true);
  });

  test('returns true for valid inputs (maximum account length)', () => {
    expect(validateForm({ business_name: 'ACME', routing_number: '021000021', account_number: '12345678901234567890' })).toBe(true);
  });

  test('returns true for a realistic business setup', () => {
    expect(validateForm({ business_name: "Alice's Bakery", routing_number: '021000021', account_number: '000123456789' })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Component rendering
// ---------------------------------------------------------------------------
describe('BusinessSetup – rendering', () => {
  test('renders the business name input', () => {
    renderSetup();
    expect(screen.getByPlaceholderText(/business name/i)).toBeInTheDocument();
  });

  test('renders the routing number input', () => {
    renderSetup();
    expect(screen.getByPlaceholderText(/routing/i)).toBeInTheDocument();
  });

  test('renders the account number input', () => {
    renderSetup();
    expect(screen.getByPlaceholderText(/account/i)).toBeInTheDocument();
  });

  test('submit button is disabled when form is empty', () => {
    renderSetup();
    const btn = screen.getByRole('button', { name: /complete setup|set up|submit/i });
    expect(btn).toBeDisabled();
  });

  test('submit button becomes enabled with valid inputs', () => {
    renderSetup();

    fireEvent.change(screen.getByPlaceholderText(/business name/i), {
      target: { value: 'ACME Corp' },
    });
    fireEvent.change(screen.getByPlaceholderText(/routing/i), {
      target: { value: '021000021' },
    });
    fireEvent.change(screen.getByPlaceholderText(/account/i), {
      target: { value: '123456789' },
    });

    const btn = screen.getByRole('button', { name: /complete setup|set up|submit/i });
    expect(btn).not.toBeDisabled();
  });
});
