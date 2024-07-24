import React, { useState, useEffect } from 'react';
import { createCharge } from './chargeGenerator'; 

const PaymentPage = () => {
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {

    const storedUsername = sessionStorage.getItem('username');
    const storedAmount = sessionStorage.getItem('amount');


    if (storedUsername && storedAmount && !isNaN(storedAmount)) {
      setUsername(storedUsername);
      setAmount(parseFloat(storedAmount)); 
    } else {
      setError('Invalid username or amount');
    }
  }, []);

  const handlePayment = async () => {
    try {
      setLoading(true);


      const chargeData = await createCharge(amount);

      if (chargeData && chargeData.data && chargeData.data.hosted_url) {
        console.log('Payment initiated successfully:', chargeData);


        window.location.href = chargeData.data.hosted_url;


        logPaymentSuccessToUsaBase(chargeData);
      } else {
        console.error('Payment initiation failed:', chargeData);
        setError('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Error initiating payment:', error.message);
      setError('Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const logPaymentSuccessToUsaBase = async (chargeData) => {
    try {
      const response = await fetch('/your-usabase-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          amount: amount,

          chargeId: chargeData.id, 
        }),
      });

      if (response.ok) {
        console.log('Payment success logged to UsaBase');
      } else {
        console.error('Failed to log payment success to UsaBase:', response.statusText);
 
      }
    } catch (error) {
      console.error('Error logging payment success to UsaBase:', error.message);
     
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.innerContainer}>
        <h2 style={styles.title}>Confirmation Summary</h2>
        <p>Username: {username}</p>
        <p>Amount: ${amount}</p>
        <button onClick={handlePayment} disabled={loading} style={styles.button}>
          {loading ? 'Processing...' : 'Proceed to Payment Terminal'}
        </button>
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    margin: 'auto',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
    background: '#FFFFFF',
    fontFamily: 'Arial, sans-serif',
  },
  innerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '400px',
    width: '100%',
    padding: '30px',
    background: 'linear-gradient(135deg, #6C7BD8, #7F00FF)',
    borderRadius: '16px',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    color: '#FFFFFF',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  button: {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    padding: '15px 40px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '25px',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
  },
  error: {
    color: 'red',
    marginTop: '10px',
  },
};

export default PaymentPage;
