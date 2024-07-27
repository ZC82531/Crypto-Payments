import React, { useState, useEffect } from 'react'; // Importing React and hooks
import { createCharge } from './chargeGenerator'; // Importing the function to create a payment charge

const PaymentPage = () => {
  const [username, setUsername] = useState(''); // State to hold the username
  const [amount, setAmount] = useState(''); // State to hold the payment amount
  const [error, setError] = useState(''); // State to hold error messages
  const [loading, setLoading] = useState(false); // State to manage loading status

  // Effect to retrieve username and amount from session storage on component mount
  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username'); // Get username from session storage
    const storedAmount = sessionStorage.getItem('amount'); // Get amount from session storage

    // Check if the retrieved values are valid
    if (storedUsername && storedAmount && !isNaN(storedAmount)) {
      setUsername(storedUsername); // Set username state
      setAmount(parseFloat(storedAmount)); // Set amount state as a float
    } else {
      setError('Invalid username or amount'); // Set error if values are invalid
    }
  }, []); // Empty dependency array to run once on mount

  // Function to handle payment initiation
  const handlePayment = async () => {
    try {
      setLoading(true); // Set loading state to true

      // Create a charge using the specified amount
      const chargeData = await createCharge(username, amount); // Pass username if needed

      // Check if the payment was initiated successfully
      if (chargeData && chargeData.data && chargeData.data.hosted_url) {
        console.log('Payment initiated successfully:', chargeData); // Log success

        // Redirect the user to the payment URL
        window.location.href = chargeData.data.hosted_url;
      } else {
        console.error('Payment initiation failed:', chargeData); // Log failure
        setError('Payment failed. Please try again.'); // Set error message
      }
    } catch (error) {
      console.error('Error initiating payment:', error.message); // Log error
      setError('Failed to initiate payment'); // Set error message
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.innerContainer}>
        <h2 style={styles.title}>Confirmation Summary</h2>
        <p>Username: {username}</p> {/* Display username */}
        <p>Amount: ${amount}</p> {/* Display amount to be charged */}
        <button onClick={handlePayment} disabled={loading} style={styles.button}>
          {loading ? 'Processing...' : 'Proceed to Payment Terminal'} {/* Button text changes based on loading state */}
        </button>
        {error && <p style={styles.error}>{error}</p>} {/* Display error message if exists */}
      </div>
    </div>
  );
};

// Styles for the component
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh', // Full height of the viewport
    margin: 'auto',
    padding: '40px', // Padding for the container
    borderRadius: '20px',
    boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)', // Shadow effect for the container
    background: '#FFFFFF',
    fontFamily: 'Arial, sans-serif', // Font style for the component
  },
  innerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '400px', // Maximum width for inner container
    width: '100%', // Full width for inner container
    padding: '30px', // Padding for inner container
    background: 'linear-gradient(135deg, #6C7BD8, #7F00FF)', // Gradient background
    borderRadius: '16px',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)', // Shadow effect for the inner container
    color: '#FFFFFF', // Text color
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px', // Space below title
  },
  button: {
    backgroundColor: '#4CAF50', // Button color
    color: 'white',
    border: 'none',
    borderRadius: '50px', // Rounded button
    padding: '15px 40px', // Padding for button
    fontSize: '16px',
    cursor: 'pointer', // Pointer cursor on hover
    marginTop: '25px', // Space above button
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)', // Shadow effect for button
    transition: 'background-color 0.3s ease, transform 0.2s ease', // Button transition effects
  },
  error: {
    color: 'red', // Error message color
    marginTop: '10px', // Space above error message
  },
};

export default PaymentPage; // Exporting the PaymentPage component
