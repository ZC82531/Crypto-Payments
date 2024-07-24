import React, { useState } from 'react';
import {Navigate} from 'react-router-dom';
import supabase from './client.jsx';
import './global.css';

const FinishSignup = () => {
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signedOut, setsignedOut] = useState(false);
  const [paymentEntered, setpaymentEntered] = useState(false);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);

      const username = sessionStorage.getItem('username');


      const { data: existingUserData, error: fetchError } = await supabase
        .from('userdata')
        .select('*')
        .eq('user', username)
        .single();

      if (fetchError) {
        console.error('Error fetching user data:', fetchError.message);
        setError('An error occurred while fetching user data');
        return;
      }

      if (!existingUserData) {
        setError('User data not found');
        return;
      }

 
      const last4Account = accountNumber.slice(-4);
      const last4Routing = routingNumber.slice(-4);

      const { error: updateError } = await supabase
        .from('userdata')
        .update({ account: last4Account, routing: last4Routing })
        .eq('user', username);

      if (updateError) {
        console.error('Error updating user data:', updateError.message);
        setError('An error occurred while updating user data');
        return;
      }


      setAccountNumber('');
      setRoutingNumber('');


      setLoading(false);
      handleSuccess();

    } catch (error) {
      console.error('Error during finish signup:', error.message);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleSuccess = () => {

    console.log('Successfully updated user data');

    // window.location.href = '/dashboard';
    setpaymentEntered(true); 
  };

  const handleSignOut = () => {
  
    sessionStorage.removeItem('username');

    // window.location.href = '/login';
    setsignedOut(true);
  };

  return (
    <div style={styles.container}>
      <button onClick={handleSignOut} style={styles.signOutButton}>
        Sign Out
      </button>
      {signedOut && <Navigate to='/login' />}
      <h2 style={styles.title}>Finish Signup</h2>
      <form onSubmit={handleFormSubmit} style={styles.form}>
        <label style={styles.label}>
          Account Number:
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            style={styles.input}
            required
          />
        </label>
        <br />
        <label style={styles.label}>
          Routing Number:
          <input
            type="text"
            value={routingNumber}
            onChange={(e) => setRoutingNumber(e.target.value)}
            style={styles.input}
            required
          />
        </label>
        <br />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Loading...' : 'Submit'}
        </button>
      </form>
      {paymentEntered && <Navigate to='/dashboard' />}
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative', 
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    margin: 'auto',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
    background: 'linear-gradient(135deg, #6C7BD8, #7F00FF)',
    fontFamily: '"M PLUS Rounded 1c", sans-serif', 
  },
  signOutButton: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    backgroundColor: '#f44336', 
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '30px', 
  },
  form: {
    width: '100%',
    maxWidth: '400px',
    padding: '30px', 
    background: '#FFFFFF',
    borderRadius: '16px', 
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  label: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px', 
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
  },
  error: {
    color: 'red',
    marginTop: '20px', 
  },
};

export default FinishSignup;
