import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import supabase from './client.jsx';
import QRCode from 'qrcode.react';
import './global.css';

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const [receivedPayments, setReceivedPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [baseURL, setBaseURL] = useState('');
  const [signedOut, setSignedOut] = useState(false);

  // Function to validate user
  const validateUser = async (username, accessToken) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/validate-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error validating user:', error);
      return false;
    }
  };

  // Function to refresh access token
  const refreshAccessToken = async (refreshToken) => {
    try {
      const refreshResponse = await fetch(`${process.env.REACT_APP_API_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: refreshToken }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh access token');
      }

      const { accessToken: newAccessToken } = await refreshResponse.json();
      sessionStorage.setItem('token', newAccessToken); // Overwrite the token in session storage
      return newAccessToken;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh session. Please log in again.');
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const username = sessionStorage.getItem('username');
        let accessToken = sessionStorage.getItem('token');

        // Validate user with the current access token
        let isValidUser = await validateUser(username, accessToken);

        // Refresh token if the user is not valid
        if (!isValidUser) {
          const refreshToken = sessionStorage.getItem('refreshToken');
          try {
            accessToken = await refreshAccessToken(refreshToken);
            isValidUser = await validateUser(username, accessToken);
            sessionStorage.setItem('token', accessToken); // Overwrite the token after refreshing
          } catch (error) {
            setError('Invalid Login Session');
            setLoading(false);
            return;
          }
        }

        if (!isValidUser) {
          throw new Error('Invalid session. Please log in again.');
        }

        const { data, error: fetchUserError } = await supabase
          .from('userdata')
          .select('*')
          .eq('user', username)
          .single();

        if (fetchUserError) {
          throw new Error('Error fetching user data: ' + fetchUserError.message);
        }

        if (!data) {
          throw new Error('User data not found');
        }

        setUserData(data);
        setReceivedPayments(data.received || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    const currentURL = window.location.href;
    const index = currentURL.indexOf('/', 8);
    const baseURL = index !== -1 ? currentURL.slice(0, index) : currentURL;
    setBaseURL(baseURL);
  }, []);

  const handleSignOut = () => {
    sessionStorage.clear();
    setSignedOut(true);
  };

  if (signedOut) {
    return <Navigate to='/login' />;
  }

  return (
    <div style={styles.container}>
      <button onClick={handleSignOut} style={styles.signOutButton}>
        Sign Out
      </button>
      {loading && <p>Loading...</p>}
      {error && <p style={styles.error}>{error}</p>}

      {userData && (
        <div style={styles.userInfo}>
          <h2 style={styles.welcomeText}>Welcome, {userData.user}!</h2>
          <p>Account: &#9679;&#9679;&#9679;&#9679;{userData.account}</p>
          <p>Routing: &#9679;&#9679;&#9679;&#9679;{userData.routing}</p>
          <h3>Received Payments</h3>
          {receivedPayments.length === 0 ? (
            <p>No expenses found yet</p>
          ) : (
            <ul style={styles.paymentList}>
              {receivedPayments.map((payment, index) => (
                <li key={index} style={styles.paymentItem}>
                  Payment {index + 1}: {payment}
                </li>
              ))}
            </ul>
          )}
          <p style={styles.disbursementNotice}>
            Please wait for the finance department to disburse funds to the listed bank account during sign up.
          </p>
          <p style={styles.qrCodeText}>Have the customer scan this QR Code:</p>
          <div style={styles.qrCodeContainer}>
            <QRCode value={`${baseURL}/${userData.user}`} size={128} />
          </div>
        </div>
      )}
    </div>
  );
};

// Styles for the component
const styles = {
  container: {
    background: 'linear-gradient(135deg, #8e2de2, #4a00e0)',
    borderRadius: '20px',
    padding: '20px',
    color: '#ffffff',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    maxWidth: '600px',
    margin: '20px auto',
    fontFamily: '"M PLUS Rounded 1c", sans-serif',
    position: 'relative',
  },
  signOutButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
    float: 'right',
    marginRight: '20px',
    marginBottom: '10px',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
  },
  error: {
    color: 'red',
    marginTop: '20px',
  },
  userInfo: {
    textAlign: 'center',
    marginTop: '20px',
  },
  welcomeText: {
    textTransform: 'capitalize',
  },
  paymentList: {
    listStyleType: 'none',
    padding: 0,
  },
  paymentItem: {
    fontSize: '1.2em',
    marginBottom: '10px',
    borderRadius: '10px',
    background: '#ffffff',
    padding: '10px 20px',
    display: 'inline-block',
    color: '#000000',
  },
  disbursementNotice: {
    fontSize: '10px',
  },
  qrCodeText: {
    fontSize: '20px',
  },
  qrCodeContainer: {
    marginTop: '20px',
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    display: 'inline-block',
  },
};

export default Dashboard;
