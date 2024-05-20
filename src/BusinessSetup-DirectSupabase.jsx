import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { saveBusinessProfile } from './businessProfileService';
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
      console.log('Saving business profile via Supabase...');
      const result = await saveBusinessProfile(businessData);
      
      console.log('Business profile saved successfully:', result);
      setSetupComplete(true);
    } catch (error) {
      console.error('Error saving business profile:', error);
      setError(error.message || 'An error occurred while saving your business information');
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
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    maxWidth: '500px',
    width: '100%',
    padding: '40px',
    border: '1px solid rgba(139, 69, 19, 0.1)',
  },
  brandSection: {
    textAlign: 'center',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '2px solid rgba(139, 69, 19, 0.1)',
  },
  brandTitle: {
    fontSize: '32px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #8B4513, #CD853F)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
  },
  brandSubtitle: {
    fontSize: '18px',
    color: '#555',
    marginBottom: '16px',
    fontWeight: '500',
  },
  description: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
  },
  errorAlert: {
    background: '#fee',
    border: '1px solid #fcc',
    borderRadius: '6px',
    padding: '12px 16px',
    marginBottom: '20px',
    color: '#c33',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  errorIcon: {
    fontSize: '18px',
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
    color: '#333',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '15px',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    outline: 'none',
  },
  helperText: {
    fontSize: '12px',
    color: '#777',
    margin: '0',
  },
  button: {
    padding: '14px 24px',
    borderRadius: '6px',
    border: 'none',
    background: 'linear-gradient(135deg, #8B4513, #CD853F)',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '8px',
  },
  securityNote: {
    marginTop: '24px',
    padding: '16px',
    background: 'rgba(139, 69, 19, 0.05)',
    borderRadius: '6px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  securityIcon: {
    fontSize: '20px',
  },
  securityText: {
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.5',
    margin: '0',
  },
};

export default BusinessSetup;
