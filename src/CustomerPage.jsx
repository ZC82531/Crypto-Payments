import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from './config/api.js';
import './global.css';
import supabase from './client.jsx';

const CustomerPage = () => {
  const username = window.location.pathname.split('/')[1];
  const navigate = useNavigate();

  const [amount, setAmount] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentAgreed, setPaymentAgreed] = useState(false);
  const [userValid, setUserValid] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [merchantUserId, setMerchantUserId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch business profile for the merchant
    const fetchBusinessProfile = async () => {
      try {
        console.log('🔍 CustomerPage: Starting merchant lookup');
        console.log('📧 Email from URL:', username);
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!username || !emailRegex.test(username)) {
          console.log('❌ Invalid email format:', username);
          setUserValid(false);
          setLoading(false);
          return;
        }

        console.log('✅ Email format valid, calling API...');
        const apiUrl = API_CONFIG.endpoints.publicBusinessProfile(username);
        console.log('🌐 API URL:', apiUrl);
        
        // Get business profile from our backend API (includes validation)
        const response = await fetch(apiUrl);
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Merchant validated:', data);
          
          if (data.business_name) {
            console.log('💼 Business name found:', data.business_name);
            setBusinessName(data.business_name);
            setMerchantUserId(data.user_id);
            setUserValid(true);
          } else {
            console.log('⚠️ No business name, using email as fallback');
            // Fallback to email if no business name
            setBusinessName(username);
            setUserValid(true);
          }
        } else {
          console.log('❌ Merchant not found or incomplete profile');
          console.log('Response status:', response.status);
          const errorData = await response.json().catch(() => ({}));
          console.log('Error data:', errorData);
          setUserValid(false);
        }
        
        console.log('✅ Fetch complete, loading false');
        setLoading(false);
      } catch (error) {
        console.error('💥 Error fetching business profile:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        setUserValid(false);
        setLoading(false);
      }
    };

    if (username) {
      console.log('🚀 useEffect triggered with username:', username);
      fetchBusinessProfile();
    } else {
      console.log('⚠️ No username in URL path');
    }
  }, [username]); 

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  const handlePayment = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount)) {
      alert('Please enter a valid amount.');
      return;
    }

    if (!customerEmail || !customerEmail.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    if (!userValid) {
      alert('Invalid user. Cannot proceed with payment.');
      return;
    }

    // Navigate to payment page with URL parameters instead of sessionStorage
    // This is more transparent and allows for proper callback handling
    const params = new URLSearchParams({
      merchantEmail: username,
      merchantUserId: merchantUserId,
      businessName: businessName,
      customerEmail: customerEmail,
      amount: amount
    });
    
    navigate(`/payment?${params.toString()}`);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.paymentCard}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>Loading merchant information...</p>
        </div>
      </div>
    );
  }

  if (!userValid) {
    return (
      <div style={styles.container}>
        <div style={styles.paymentCard}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>Invalid Merchant</h2>
          <p style={styles.errorText}>Cannot proceed with payment. Error 401</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.paymentCard}>
        <div style={styles.brandSection}>
          <h1 style={styles.brandTitle}>CryptoPay</h1>
          <div style={styles.merchantBadge}>
            <span style={styles.merchantIcon}>🏪</span>
            <span style={styles.merchantName}>{businessName}</span>
          </div>
        </div>

        <form onSubmit={handlePayment} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Your Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              style={styles.emailInput}
              placeholder="your.email@example.com"
              required
            />
            <p style={styles.helperText}>
              We'll send your payment confirmation here
            </p>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Payment Amount</label>
            <div style={styles.amountInputWrapper}>
              <span style={styles.currencySymbol}>$</span>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                style={styles.amountInput}
                placeholder="0.00"
                required
              />
            </div>
            <p style={styles.helperText}>
              Enter the amount you wish to pay to {businessName}
            </p>
          </div>

          <button type="submit" style={styles.payButton}>
            <span style={styles.buttonIcon}>💳</span>
            Proceed to Payment
          </button>
        </form>
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
  paymentCard: {
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
    marginBottom: '36px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e1e5e9',
  },
  brandTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '16px',
    letterSpacing: '-0.01em',
    lineHeight: '1.2',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  merchantBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: '#f9fafb',
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #e1e5e9',
  },
  merchantIcon: {
    fontSize: '20px',
  },
  merchantName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c3e50',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  amountInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  currencySymbol: {
    position: 'absolute',
    left: '20px',
    fontSize: '28px',
    fontWeight: '600',
    color: '#8B4513',
    pointerEvents: 'none',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  amountInput: {
    width: '100%',
    padding: '20px 20px 20px 50px',
    fontSize: '28px',
    fontWeight: '600',
    border: '1px solid #e1e5e9',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#2c3e50',
    transition: 'border-color 0.2s ease',
    outline: 'none',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  emailInput: {
    width: '100%',
    padding: '16px 20px',
    fontSize: '16px',
    border: '1px solid #e1e5e9',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#2c3e50',
    transition: 'border-color 0.2s ease',
    outline: 'none',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  helperText: {
    fontSize: '14px',
    color: '#666666',
    margin: '0',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  payButton: {
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
    gap: '12px',
    marginTop: '12px',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  buttonIcon: {
    fontSize: '20px',
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid #e1e5e9',
    borderTop: '4px solid #8B4513',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 24px',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: '16px',
    color: '#666666',
    fontWeight: '400',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  errorIcon: {
    fontSize: '60px',
    textAlign: 'center',
    marginBottom: '20px',
  },
  errorTitle: {
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: '12px',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  errorText: {
    textAlign: 'center',
    fontSize: '16px',
    color: '#666666',
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

export default CustomerPage;
