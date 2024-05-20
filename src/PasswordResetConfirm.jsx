import React, { useState, useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import supabase from './client.jsx';
import './global.css';

const PasswordResetConfirm = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle the password reset using Supabase's built-in session detection
    const handlePasswordResetSession = async () => {
      try {
        // First, let Supabase handle the URL automatically
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('Current session:', session);
        console.log('Session error:', error);

        if (error) {
          console.error('Session error:', error);
          setError(`Session error: ${error.message}`);
          return;
        }

        if (session) {
          console.log('Valid session found, user can reset password');
          setValidSession(true);
        } else {
          // If no session, try to get the auth event from the URL
          console.log('No session found, checking URL parameters...');
          
          const urlParams = Object.fromEntries(searchParams.entries());
          console.log('URL params:', urlParams);
          
          if (urlParams.code) {
            // Let Supabase handle the session automatically via auth event
            setError('Processing reset link... Please wait a moment and refresh if this persists.');
          } else {
            setError('Invalid reset link. Please request a new password reset.');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setError(`Error processing reset link: ${error.message}`);
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session);
      
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        console.log('Password recovery session established');
        setValidSession(true);
        setError('');
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setValidSession(false);
      }
    });

    // Check current session
    handlePasswordResetSession();

    // Cleanup subscription
    return () => {
      subscription?.unsubscribe();
    };
  }, [searchParams]);

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    
    if (!validSession) {
      setError('Invalid session. Please request a new password reset.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setError('An error occurred while updating your password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <Navigate to="/login" />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.resetCard}>
        <div style={styles.brandSection}>
          <h1 style={styles.brandTitle}>CryptoPay</h1>
          <p style={styles.brandSubtitle}>
            {validSession ? 'Set your new password' : 'Reset Link Verification'}
          </p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <span style={styles.errorIcon}>⚠️</span>
            {error}
          </div>
        )}

        {!validSession ? (
          <div style={styles.loadingContainer}>
            <p style={styles.loadingText}>Verifying reset link...</p>
            <div style={styles.actions}>
              <Link to="/password-reset" style={styles.retryLink}>
                Request New Reset Link
              </Link>
              <Link to="/login" style={styles.loginLink}>
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handlePasswordUpdate} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Enter your new password"
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Confirm your new password"
                  required
                />
              </div>

              <button 
                type="submit" 
                style={{
                  ...styles.button,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>

            <div style={styles.loginPrompt}>
              <span style={styles.promptText}>Remember your password?</span>
              <Link to="/login" style={styles.loginLinkSecondary}>
                Sign in
              </Link>
            </div>
          </>
        )}
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
  loginLinkSecondary: {
    color: '#8B4513',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    transition: 'opacity 0.2s ease',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '20px 0',
  },
  loadingText: {
    color: '#666666',
    fontSize: '16px',
    marginBottom: '24px',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  retryLink: {
    color: '#8B4513',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    padding: '12px 24px',
    border: '1px solid #8B4513',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
  },
  loginLink: {
    color: '#666666',
    fontSize: '14px',
    textDecoration: 'none',
    padding: '8px 16px',
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
};

export default PasswordResetConfirm;