import React, { useState } from 'react'; // Importing React and useState hook
import { Link, Navigate } from 'react-router-dom'; // For navigation and routing
import supabase from './client.jsx'; // Supabase client to connect to the database
import './global.css'; // Import global CSS styles

function Login() {
  // State to hold login data, error messages, success status, and logged-in path
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState(''); // To store error messages
  const [success, setSuccess] = useState(false); // To indicate successful login
  const [loggedIn, setLoggedIn] = useState(''); // To determine navigation path after login

  // Handle changes in the login form inputs
  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value }); // Update state with input values
  };

  // Handle the login form submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior
    setError(''); // Reset error messages
    setSuccess(false); // Reset success status

    try {
      // Validate user credentials with the Supabase database
      const { data, error: dbError } = await supabase
        .from('userdata')
        .select('*')
        .eq('username', loginData.username)
        .eq('password', loginData.password) // Note: Use hashed password comparison in production
        .single(); // Retrieve a single record

      // Check for errors or no data returned
      if (dbError || !data) {
        setError('Invalid credentials'); // Set error if login fails
        return; // Exit the function
      }


      const response = await fetch(`${process.env.REACT_APP_API_URL}/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Specify content type
        },
        body: JSON.stringify(loginData), // Send login data as request body
      });

      const tokenData = await response.json(); // Parse the response JSON

      // Check if the response was not okay
      if (!response.ok) {
        setError(tokenData.message || 'Failed to obtain tokens'); // Set error message
        return; // Exit the function
      }

      // Store tokens and username in session storage
      sessionStorage.setItem('accessToken', tokenData.accessToken);
      sessionStorage.setItem('refreshToken', tokenData.refreshToken);
      sessionStorage.setItem('username', loginData.username);
      setSuccess(true); // Set success state to true

      // Redirect user based on their account status
      if (data.account === "0" && data.routing === "0") {
        setLoggedIn('/finish-signup'); // Redirect to finish signup if account is not set up
      } else {
        setLoggedIn('/dashboard'); // Redirect to dashboard if account is set up
      }

    } catch (error) {
      console.error('Error logging in:', error.message); // Log error to console
      setError('An error occurred. Please try again.'); // Set a generic error message
    }
  };

  return (
    <div style={styles.container}>
      {success && <p style={styles.successMessage}>Login successful!</p>} {/* Show success message */}
      {error && <p style={styles.errorMessage}>{error}</p>} {/* Show error message if any */}
      <div style={styles.innerContainer}>
        <div style={styles.formContainer}>
          <h2 style={styles.title}>Login</h2>
          <form onSubmit={handleLoginSubmit} style={styles.form}>
            {/* Username input */}
            <label style={styles.label}>
              Username:
              <input
                type="text"
                name="username"
                value={loginData.username} // Controlled input
                onChange={handleLoginChange} // Update state on change
                style={styles.input}
                required // Make this input required
              />
            </label>
            <br />
            {/* Password input */}
            <label style={styles.label}>
              Password:
              <input
                type="password"
                name="password"
                value={loginData.password} // Controlled input
                onChange={handleLoginChange} // Update state on change
                style={styles.input}
                required // Make this input required
              />
            </label>
            <br />
            <button type="submit" style={styles.button}>Login</button> {/* Submit button */}
          </form>
        </div>
        {/* Redirect to specified path if logged in */}
        {loggedIn && <Navigate to={loggedIn} />}
        <div style={styles.signupLink}>
          <p>Don't have an account? <Link to="/signup" style={styles.link}>Sign Up</Link></p> {/* Link to signup page */}
        </div>
      </div>
    </div>
  );
}

// Styles for the component
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center', 
    height: '100vh', // Full height of the viewport
    margin: 'auto',
    padding: '20px',
    borderRadius: '20px',
    boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)', // Shadow effect for the container
    background: '#FFFFFF', 
    fontFamily: '"M PLUS Rounded 1c", sans-serif', 
  },
  innerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '400px', // Maximum width for inner container
    width: '100%', // Full width
    padding: '20px',
    background: 'linear-gradient(135deg, #6C7BD8, #7F00FF)', // Gradient background
    borderRadius: '12px', 
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)', // Shadow effect for the inner container
  },
  successMessage: {
    color: 'green',
    marginBottom: '10px',
    borderRadius: '8px', 
    padding: '8px', 
    backgroundColor: '#D0E9C6', // Background for success message
  },
  errorMessage: {
    color: 'red',
    marginBottom: '10px',
    borderRadius: '8px', 
    padding: '8px',
    backgroundColor: '#F8D7DA', // Background for error message
  },
  formContainer: {
    width: '100%',
    textAlign: 'center', // Center align text in the form
    padding: '20px', 
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    fontFamily: '"M PLUS Rounded 1c", sans-serif', 
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', // Center align form elements
  },
  label: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '5px',
    fontFamily: '"M PLUS Rounded 1c", sans-serif', 
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ccc', // Border style for input
    fontSize: '16px',
    width: '100%', // Full width for input
    boxSizing: 'border-box',
    outline: 'none',
    marginBottom: '15px', // Space between inputs
    backgroundColor: '#FFFFFF', 
    fontFamily: '"M PLUS Rounded 1c", sans-serif', 
  },
  button: {
    backgroundColor: '#4CAF50', // Button color
    color: 'white',
    border: 'none',
    borderRadius: '50px', // Rounded button
    padding: '12px 40px', // Padding for button
    fontSize: '16px',
    cursor: 'pointer', // Pointer cursor on hover
    marginTop: '20px', // Space above button
    fontFamily: '"M PLUS Rounded 1c", sans-serif', 
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)', // Shadow effect for button
  },
  signupLink: {
    marginTop: '10px',
    textAlign: 'center', // Center align the signup link
    fontFamily: '"M PLUS Rounded 1c", sans-serif', 
  },
  link: {
    textDecoration: 'none',
    color: '#4CAF50', // Link color
    fontWeight: 'bold',
    fontFamily: '"M PLUS Rounded 1c", sans-serif',
  },
};

export default Login; // Exporting the Login component
