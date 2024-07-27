import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import supabase from './client.jsx';
import './global.css';

const FinishSignup = () => {
  // State variables
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [paymentEntered, setPaymentEntered] = useState(false);

  // Validate user with the backend
  const validateUser = async (username, accessToken) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/validate-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }), // Sending username
      });
      return response.ok;
    } catch (error) {
      console.error('Error validating user:', error);
      return false;
    }
  };

  // Refresh access token
  const refreshAccessToken = async (refreshToken) => {
    try {
      const refreshResponse = await fetch(`${process.env.REACT_APP_API_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: refreshToken }), // Sending refresh token
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh access token');
      }

      const { accessToken: newAccessToken } = await refreshResponse.json();
      sessionStorage.setItem('accessToken', newAccessToken); // Store new access token
      return newAccessToken;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Invalid Login Session');
    }
  };

  // Handle form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const username = sessionStorage.getItem('username');
    let accessToken = sessionStorage.getItem('token');

    // Validate user with the current access token
    let isValidUser = await validateUser(username, accessToken);

    // Refresh token if the user is not valid
    if (!isValidUser) {
      const refreshToken = sessionStorage.getItem('refreshToken');
      try {
        accessToken = await refreshAccessToken(refreshToken);
        // Validate again with the new access token
        isValidUser = await validateUser(username, accessToken);
        sessionStorage.setItem('token', accessToken);
      } catch (error) {
        setError('Invalid Login Session');
        setLoading(false);
        return;
      }
    }

    // If user is valid, proceed to submit account and routing numbers
    if (isValidUser) {
      const last4Account = accountNumber.slice(-4);
      const last4Routing = routingNumber.slice(-4);

      try {
        const { error: updateError } = await supabase
          .from('userdata')
          .update({ account: last4Account, routing: last4Routing })
          .eq('user', username);

        if (updateError) {
          throw new Error('Error updating user data');
        }

        setAccountNumber('');
        setRoutingNumber('');
        setPaymentEntered(true);
      } catch (error) {
        setError(error.message);
      }
    } else {
      setError('Invalid Login Session');
      handleSignOut();
    }

    setLoading(false);
  };

  // Handle sign out
  const handleSignOut = () => {
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    setSignedOut(true);
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

// Styles for the component
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
    background: 'linear-gradient(135deg, #6C7BD8, #7F00FF)', // Background gradient
    fontFamily: '"M PLUS Rounded 1c", sans-serif',
  },
  signOutButton: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    backgroundColor: '#f44336', // Red background for sign out button
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
    background: '#FFFFFF', // White background for the form
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
    backgroundColor: '#FFFFFF', // White background for input fields
  },
  button: {
    backgroundColor: '#4CAF50', // Green background for submit button
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
    color: 'red', // Red color for error messages
    marginTop: '20px',
  },
};

export default FinishSignup;
