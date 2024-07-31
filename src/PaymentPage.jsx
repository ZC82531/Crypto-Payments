import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createCharge } from './chargeGenerator';
import { API_CONFIG } from './config/api.js';
import supabase from './client.jsx';

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantUserId, setMerchantUserId] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [amount, setAmount] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Validate merchant and retrieve business profile
    const validateMerchant = async () => {
      console.log('🔍 PaymentPage: Starting merchant validation');
      
      // Get data from URL parameters instead of sessionStorage
      const merchantEmailParam = searchParams.get('merchantEmail');
      const merchantUserIdParam = searchParams.get('merchantUserId');
      const businessNameParam = searchParams.get('businessName');
      const customerEmailParam = searchParams.get('customerEmail');
      const amountParam = searchParams.get('amount');

      console.log('� URL Parameters:', {
        merchantEmailParam,
        merchantUserIdParam,
        businessNameParam,
        customerEmailParam,
        amountParam
      });

      if (!merchantEmailParam || !amountParam || isNaN(amountParam) || !customerEmailParam) {
        console.log('❌ Invalid URL parameters');
        setError('Invalid payment information. Please start from the merchant page.');
        setValidating(false);
        return;
      }

      try {
        console.log('✅ URL parameters valid, validating merchant:', merchantEmailParam);
        
        // Step 1: Look up the merchant's business profile via API
        const apiUrl = API_CONFIG.endpoints.publicBusinessProfile(merchantEmailParam);
        console.log('🌐 Calling API:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        console.log('📡 API Response status:', response.status);
        console.log('📡 API Response ok:', response.ok);
        
        if (!response.ok) {
          console.log('❌ API returned error');
          if (response.status === 404) {
            console.log('404: Merchant not found');
            setError('Merchant not found. This business has not set up their profile yet.');
          } else {
            console.log('Error status:', response.status);
            setError('Unable to verify merchant. Please try again later.');
          }
          setValidating(false);
          return;
        }

        const data = await response.json();
        console.log('✅ API Response data:', data);
        
        if (!data.business_name) {
          console.log('❌ No business name in response');
          setError('Merchant business profile is incomplete.');
          setValidating(false);
          return;
        }
        
        console.log('✅ Merchant validated successfully');
        console.log('💼 Business name:', data.business_name);
        console.log('📧 Merchant email:', merchantEmailParam);
        console.log('📧 Customer email:', customerEmailParam);
        
        // Set the validated merchant info from URL params
        setMerchantEmail(merchantEmailParam);
        setMerchantUserId(merchantUserIdParam || data.user_id);
        setBusinessName(businessNameParam || data.business_name);
        setAmount(parseFloat(amountParam));
        setCustomerEmail(customerEmailParam);
        setIsValid(true);
        setValidating(false);
        
        console.log('✅ Validation complete, ready for payment');

      } catch (err) {
        console.error('💥 Error validating merchant:', err);
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
        setError('Failed to validate merchant. Please try again.');
        setValidating(false);
      }
    };

    validateMerchant();
  }, []);

  const handlePayment = async () => {
    if (!isValid) {
      setError('Cannot proceed - merchant validation failed');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('Initiating payment for merchant:', merchantEmail, 'Amount:', amount);

      const chargeData = await createCharge(amount);

      if (chargeData && chargeData.data && chargeData.data.hosted_url) {
        console.log('Payment initiated successfully:', chargeData);

        // Save payment record BEFORE redirecting so it is not lost
        await logPaymentToBackend(chargeData);

        // Redirect to payment gateway
        window.location.href = chargeData.data.hosted_url;
      } else {
        console.error('Payment initiation failed:', chargeData);
        setError('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Error initiating payment:', error.message);
      setError(error.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const logPaymentToBackend = async (chargeData) => {
    try {
      console.log('💾 Creating payment record in database');
      
      // Create payment record in our database
      const response = await fetch(API_CONFIG.endpoints.paymentsCreate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantEmail: merchantEmail,
          merchantUserId: merchantUserId,
          customerEmail: customerEmail,
          amount: amount,
          coinbaseChargeId: chargeData.data?.id
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Payment record created:', result);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to create payment record:', errorData);
      }
    } catch (error) {
      console.error('💥 Error creating payment record:', error.message);
    }
  };

  // Show loading state while validating
  if (validating) {
    return (
      <div style={styles.container}>
        <div style={styles.innerContainer}>
          <div style={styles.loadingContainer}>
            <span style={styles.spinner}></span>
            <p style={styles.loadingText}>Validating merchant...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if validation failed
  if (!isValid || error) {
    return (
      <div style={styles.container}>
        <div style={styles.innerContainer}>
          <div style={styles.errorContainer}>
            <span style={styles.errorIconLarge}>⚠️</span>
            <h2 style={styles.errorTitle}>Validation Failed</h2>
            <p style={styles.errorMessage}>{error || 'Unable to validate merchant'}</p>
            <button 
              onClick={() => window.history.back()} 
              style={styles.backButton}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.innerContainer}>
        <div style={styles.brandSection}>
          <h1 style={styles.brandTitle}>CryptoPay</h1>
          <p style={styles.subtitle}>Payment Confirmation</p>
        </div>
        
        <div style={styles.summarySection}>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Merchant</span>
            <span style={styles.summaryValue}>{businessName}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Amount</span>
            <span style={styles.summaryAmount}>${parseFloat(amount).toFixed(2)}</span>
          </div>
        </div>

        <button 
          onClick={handlePayment} 
          disabled={loading} 
          style={{
            ...styles.button,
            ...(loading ? styles.buttonDisabled : {})
          }}
        >
          {loading ? (
            <>
              <span style={styles.spinner}></span>
              Processing...
            </>
          ) : (
            <>
              Proceed to Payment
            </>
          )}
        </button>
        
        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>⚠️</span>
            <p style={styles.error}>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    padding: '20px',
    fontFamily: '"Source Sans Pro", "Helvetica Neue", Arial, sans-serif',
  },
  innerContainer: {
    background: 'rgba(255, 255, 255, 0.85)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    padding: '48px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  brandSection: {
    textAlign: 'center',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e1e5e9',
  },
  brandTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '8px',
    letterSpacing: '-0.01em',
    lineHeight: '1.2',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666666',
    fontWeight: '400',
    margin: '0',
    lineHeight: 1.5,
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#666666',
    marginTop: '20px',
    fontWeight: '400',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  errorIconLarge: {
    fontSize: '64px',
    marginBottom: '20px',
    display: 'block',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: '12px',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  errorMessage: {
    fontSize: '16px',
    color: '#666666',
    marginBottom: '24px',
    lineHeight: '1.5',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  backButton: {
    padding: '14px 24px',
    background: '#8B4513',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  summarySection: {
    background: '#f9fafb',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '32px',
    border: '1px solid #e1e5e9',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
  },
  summaryLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  summaryValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c3e50',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  summaryAmount: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#8B4513',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  button: {
    width: '100%',
    background: '#8B4513',
    color: 'white',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '20px',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderTop: '3px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    display: 'inline-block',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    marginBottom: '20px',
  },
  errorIcon: {
    fontSize: '16px',
  },
  error: {
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '500',
    margin: '0',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
};
const styleSheet = document.styleSheets[0];
const keyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
if (styleSheet) {
  try {
    styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
  } catch (e) {
    // Animation already exists
  }
}

export default PaymentPage;
