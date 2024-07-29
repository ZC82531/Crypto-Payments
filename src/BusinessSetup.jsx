import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import supabase from './client.jsx';
import { API_CONFIG } from './config/api.js';
import './global.css';

const BusinessSetup = () => {
  const [businessData, setBusinessData] = useState({
    business_name: '',
    routing_number: '',
    account_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [setupComplete, setSetupComplete] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBusinessData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const { business_name, routing_number, account_number } = businessData;
    
    if (!business_name.trim()) return false;
    if (!/^\d{9}$/.test(routing_number)) return false;
    if (!/^\d{4,20}$/.test(account_number)) return false;
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    console.log('Submitting business setup form...');

    try {
      // Get the current session to get the access token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Auth session check result:', session ? 'Session found' : 'No session', 
                 sessionError ? `Error: ${sessionError.message}` : 'No auth error');
      
      if (sessionError || !session) {
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }
      
      console.log('Making API request to save business profile with token:', 
                 session.access_token ? `${session.access_token.substring(0, 10)}...` : 'No token');
                 
      console.log('Business data being sent:', {
        ...businessData,
        account_number: businessData.account_number ? '****' + businessData.account_number.slice(-4) : 'none'
      });

      const response = await fetch(API_CONFIG.endpoints.businessProfile, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(businessData)
      });

      console.log('API response status:', response.status);
      const result = await response.json();
      console.log('API response body:', result);

      if (!response.ok) {
        console.error('Business profile save error:', result);
        setError(result.error || 'Error saving business information');
        setLoading(false);
        return;
      }

      console.log('Business profile saved successfully');
      setSetupComplete(true);
    } catch (error) {
      console.error('Error saving business profile:', error);
      setError('An error occurred while saving your business information');
      setLoading(false);
    }
  };

  if (setupComplete) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.setupCard}>
        <div style={styles.brandSection}>
          <h1 style={styles.brandTitle}>CryptoPay</h1>
          <p style={styles.brandSubtitle}>
            Complete your business setup
          </p>
          <p style={styles.description}>
            We need some basic information to set up your payment processing account.
          </p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <span style={styles.errorIcon}>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Business Name</label>
            <input
              type="text"
              name="business_name"
              value={businessData.business_name}
              onChange={handleInputChange}
              style={styles.input}
              placeholder="Enter your business name"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Routing Number</label>
            <input
              type="text"
              name="routing_number"
              value={businessData.routing_number}
              onChange={handleInputChange}
              style={styles.input}
              placeholder="9-digit routing number"
              maxLength="9"
              pattern="\d{9}"
              required
            />
            <p style={styles.helperText}>
              9-digit routing number from your bank
            </p>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Account Number</label>
            <input
              type="text"
              name="account_number"
              value={businessData.account_number}
              onChange={handleInputChange}
              style={styles.input}
              placeholder="Bank account number"
              maxLength="20"
              pattern="\d{4,20}"
              required
            />
            <p style={styles.helperText}>
              Your bank account number (4-20 digits)
            </p>
          </div>

          <button 
            type="submit" 
            style={{
              ...styles.button,
              opacity: (loading || !validateForm()) ? 0.5 : 1,
              cursor: (loading || !validateForm()) ? 'not-allowed' : 'pointer'
            }}
            disabled={loading || !validateForm()}
          >
            {loading ? 'Setting up...' : 'Complete Setup'}
          </button>
        </form>

        <div style={styles.securityNote}>
          <span style={styles.securityIcon}>🔒</span>
          <p style={styles.securityText}>
            Your banking information is encrypted and securely stored. We use bank-level security to protect your data.
          </p>
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
  setupCard: {
    background: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e1e5e9',
    padding: '48px',
    width: '100%',
    maxWidth: '500px',
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
    fontSize: '18px',
    fontWeight: '500',
    fontFamily: '"Source Sans Pro", sans-serif',
    margin: '0 0 12px 0',
    lineHeight: 1.4,
    color: '#8B4513',
  },
  description: {
    fontSize: '14px',
    fontWeight: '400',
    fontFamily: '"Source Sans Pro", sans-serif',
    margin: 0,
    lineHeight: 1.5,
    color: '#666666',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
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
  helperText: {
    fontSize: '12px',
    color: '#666666',
    margin: 0,
    fontStyle: 'italic',
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
  securityNote: {
    marginTop: '24px',
    padding: '16px',
    background: 'rgba(139, 69, 19, 0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(139, 69, 19, 0.1)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  securityIcon: {
    fontSize: '16px',
    marginTop: '2px',
  },
  securityText: {
    fontSize: '12px',
    color: '#666666',
    margin: 0,
    lineHeight: 1.4,
  },
};

export default BusinessSetup;