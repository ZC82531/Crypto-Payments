import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from './client.jsx';
import './global.css';

const PasswordReset = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Always show the same message for security reasons, regardless of whether email exists
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password-confirm`,
      });

      // Don't show specific error messages to prevent email enumeration
      setMessage('If an account with that email exists, a password reset link has been sent.');
      setEmailSent(true); // Hide the form after sending
      
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setMessage('If an account with that email exists, a password reset link has been sent.');
      setEmailSent(true); // Hide the form even on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.resetCard}>
        <div style={styles.brandSection}>
          <h1 style={styles.brandTitle}>CryptoPay</h1>
          <p style={styles.brandSubtitle}>
            Reset your password
          </p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <span style={styles.errorIcon}>⚠️</span>
            {error}
          </div>
        )}

        {message && (
          <div style={styles.successAlert}>
            <span style={styles.successIcon}>✅</span>
            {message}
          </div>
        )}

        {!emailSent && (
          <form onSubmit={handlePasswordReset} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="Enter your email address"
                required
              />
            </div>

            <button 
              type="submit" 
              style={{
                ...styles.button,
                opacity: (loading || !isValidEmail(email)) ? 0.5 : 1,
                cursor: (loading || !isValidEmail(email)) ? 'not-allowed' : 'pointer'
              }}
              disabled={loading || !isValidEmail(email)}
            >
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>
          </form>
        )}

        {emailSent && (
          <div style={styles.emailSentActions}>
            <button 
              onClick={() => {
                setEmailSent(false);
                setMessage('');
                setEmail('');
              }}
              style={styles.sendAnotherButton}
            >
              Send Another Reset Email
            </button>
          </div>
        )}

        <div style={styles.loginPrompt}>
          <span style={styles.promptText}>Remember your password?</span>
          <Link to="/login" style={styles.loginLink}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontFamily: '"Source Sans Pro", "Helvetica Neue", Arial, sans-serif',
    background: '#ffffff',
    padding: '20px',
  },
  resetCard: {
    background: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e1e5e9',
    padding: '48px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  brandSection: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  brandTitle: {
    fontSize: '28px',
    fontWeight: '600',
    fontFamily: '"Source Sans Pro", sans-serif',
    margin: '0 0 8px 0',
    color: '#2c3e50',
    letterSpacing: '-0.01em',
    lineHeight: '1.2',
  },
  brandSubtitle: {
    fontSize: '16px',
    fontWeight: '400',
    fontFamily: '"Source Sans Pro", sans-serif',
    margin: 0,
    lineHeight: 1.5,
    color: '#666666',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '14px 16px',
    fontSize: '16px',
    border: '1px solid #e1e5e9',
    borderRadius: '4px',
    transition: 'border-color 0.2s ease',
    fontFamily: 'inherit',
    background: '#ffffff',
    ':focus': {
      outline: 'none',
      borderColor: '#8B4513',
      boxShadow: '0 0 0 2px rgba(139, 69, 19, 0.1)',
    },
  },
  button: {
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: '#8B4513',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
    fontFamily: 'inherit',
    marginTop: '8px',
    ':hover': {
      opacity: 0.9,
    },
  },
  loginPrompt: {
    textAlign: 'center',
    marginTop: '24px',
  },
  promptText: {
    color: '#666666',
    fontSize: '14px',
    marginRight: '8px',
  },
  loginLink: {
    color: '#8B4513',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    transition: 'opacity 0.2s ease',
    ':hover': {
      opacity: 0.8,
    },
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: '16px',
  },
  successAlert: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#16a34a',
    fontSize: '14px',
    fontWeight: '500',
  },
  successIcon: {
    fontSize: '16px',
  },
  emailSentActions: {
    textAlign: 'center',
    marginTop: '24px',
  },
  sendAnotherButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#8B4513',
    background: 'transparent',
    border: '1px solid #8B4513',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    marginBottom: '16px',
  },
};

export default PasswordReset;