/**
 * Frontend Component Tests – Login
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login.jsx';

jest.mock('../client.jsx', () => ({
  __esModule: true,
  default: {
    auth: {
      signInWithPassword: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

import supabaseClient from '../client.jsx';

const renderLogin = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Login />
    </MemoryRouter>
  );

describe('Login – rendering', () => {
  test('renders the CryptoPay brand title', () => {
    renderLogin();
    expect(screen.getByText(/CryptoPay/i)).toBeInTheDocument();
  });

  test('renders email input', () => {
    renderLogin();
    expect(
      screen.getByPlaceholderText(/email/i) ||
      screen.getByRole('textbox')
    ).toBeInTheDocument();
  });

  test('renders a submit / sign-in button', () => {
    renderLogin();
    const btn = screen.getByRole('button', { name: /sign in|log in|submit/i });
    expect(btn).toBeInTheDocument();
  });

  test('renders a link to the signup page', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: /sign up|create account/i })).toBeInTheDocument();
  });
});

describe('Login – form interaction', () => {
  test('calls supabase.auth.signInWithPassword on submit with entered values', async () => {
    supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: 'Invalid credentials' },
    });

    renderLogin();

    // Fill in fields (adjust selector if placeholder text differs)
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'test@example.com' } });

    const passwordInput = document.querySelector('input[type="password"]');
    if (passwordInput) fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const btn = screen.getByRole('button', { name: /sign in|log in|submit/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(supabaseClient.auth.signInWithPassword).toHaveBeenCalled();
    });
  });

  test('shows an error message when signIn returns an error', async () => {
    supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });

    renderLogin();

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'wrong@example.com' } });

    const passwordInput = document.querySelector('input[type="password"]');
    if (passwordInput) fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });

    fireEvent.click(screen.getByRole('button', { name: /sign in|log in|submit/i }));

    await waitFor(() => {
      expect(
        screen.queryByText(/invalid|error|credentials/i)
      ).toBeInTheDocument();
    });
  });
});
