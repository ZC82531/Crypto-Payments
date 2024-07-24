import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from './client.jsx';
import QRCode from 'qrcode.react';
import './global.css';

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const [receivedPayments, setReceivedPayments] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [baseURL, setBaseURL] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const username = sessionStorage.getItem('username');


        const { data: userData, error: fetchUserError } = await supabase
          .from('userdata')
          .select('*')
          .eq('user', username)
          .single();

        if (fetchUserError) {
          console.error('Error fetching user data:', fetchUserError.message);
          setError('An error occurred while fetching user data');
          setLoading(false);
          return;
        }

        if (!userData) {
          setError('User data not found');
          setLoading(false);
          return;
        }

        setUserData(userData);

       
        const receivedPayments = userData.received || [];
        setReceivedPayments(receivedPayments);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error.message);
        setError('An unexpected error occurred');
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
    window.location.href = '/login'; 
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #8e2de2, #4a00e0)',
      borderRadius: '20px',
      padding: '20px',
      color: '#ffffff',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      maxWidth: '600px',
      margin: '20px auto',
      fontFamily: '"M PLUS Rounded 1c", sans-serif',
      fontWeight: 400,
      fontStyle: 'normal',
      position: 'relative',
    }}>

      <button onClick={handleSignOut} style={styles.signOutButton}>
        Sign Out
      </button>

      {loading && <p>Loading...</p>}
      {error && <p>{error}</p>}
      {userData && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <h2 style={{ textTransform: 'capitalize' }}>Welcome, {userData.user}!</h2>
          <p>Account:  &#9679;&#9679;&#9679;&#9679;{userData.account}</p>
          <p>Routing:  &#9679;&#9679;&#9679;&#9679;{userData.routing}</p>
          <h3>Received Payments</h3>
          {receivedPayments.length === 0 ? (
            <p>No expenses found yet</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {receivedPayments.map((payment, index) => (
                <li key={index} style={{
                  fontSize: '1.2em',
                  marginBottom: '10px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  padding: '10px 20px',
                  display: 'inline-block',
                  color: '#000000' 
                }}>
                  Payment {index + 1}: {payment}
                </li>
              ))}
            </ul>
          )}
          <p style={{ fontSize: '10px' }}>
  Please wait to have finance department disburse funds to listed bank account during sign up.
</p>
          <p style={{ fontSize: '20px' }}>Have customer scan QR Code:</p>
          

          <div style={{
            marginTop: '20px',
            padding: '20px', 
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            display: 'inline-block'
          }}>
            <QRCode
              value={`${baseURL}/${userData.user}`}
              size={128}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
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
};

export default Dashboard;
