import React, { useState } from 'react';
import './global.css';

const CustomerPage = () => {

  const username = window.location.pathname.split('/')[1];

  const [amount, setAmount] = useState('');

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

    sessionStorage.setItem('username', username);
    sessionStorage.setItem('amount', amount);


    window.location.href = `/payment`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.innerContainer}>
        <h2 style={styles.title}>How much do you want to pay {username.charAt(0).toUpperCase() + username.slice(1)}?</h2>
        <form onSubmit={handlePayment} style={styles.form}>
          <label style={styles.label}>
            Enter Amount ($):
            <input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              style={styles.input}
              required
            />
          </label>
          <button type="submit" style={styles.button}>Proceed to Payment</button>
        </form>
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
    fontFamily: '"M PLUS Rounded 1c", sans-serif', 
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
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '30px', 
    color: '#FFFFFF', 
    textAlign: 'center',
  },
  form: {
    width: '100%',
    padding: '20px', 
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  label: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px', 
    color: '#FFFFFF',
  },
  input: {
    padding: '15px', 
    borderRadius: '10px', 
    border: '1px solid #ccc',
    fontSize: '16px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    marginBottom: '20px', 
    backgroundColor: '#FFFFFF',
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
    '&:hover': {
      backgroundColor: '#45A049',
      transform: 'scale(1.02)', 
    },
  },
};

export default CustomerPage;
