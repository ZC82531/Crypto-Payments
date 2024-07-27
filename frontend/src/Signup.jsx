import React, { useState } from 'react'; // Importing React and useState hook
import { Link } from 'react-router-dom'; // For navigation links
import supabase from './client.jsx'; // Supabase client to connect to the database
import './global.css'; // Import global CSS styles
import { Navigate } from 'react-router-dom'; // For redirecting after successful signup

const Signup = () => {
  // State to hold username, password, error messages, and signup status
  const [username, setUsername] = useState(''); // Username input state
  const [password, setPassword] = useState(''); // Password input state
  const [errorText, setErrorText] = useState(''); // State to store error messages
  const [signedUp, setsignedUp] = useState(false); // State to check if signup was successful

  // Handle signup form submission
  const handleSignup = async (event) => {
    event.preventDefault(); // Prevent default form submission behavior

    try {
      // Check if the username already exists in the database
      const { data: existingUsers, error } = await supabase
        .from('login')
        .select('username')
        .eq('username', username);

      // Handle any errors from the database query
      if (error) {
        console.error('Error checking existing users:', error.message);
        return;
      }

      // Check if the username is already taken
      if (existingUsers.length > 0) {
        setErrorText('Username already exists. Please try another username.'); // Set error message
        return; // Exit the function
      }

      // Insert new user into the login table
      const { data: userData, error: insertError } = await supabase
        .from('login')
        .insert([{ username, password }]); // Note: Password should be hashed in production

      // Handle any errors from the insertion
      if (insertError) {
        console.error('Error signing up:', insertError.message);
        return; // Exit the function
      }

      // Insert additional user data into the userdata table
      const { data: userDataInsert, error: userDataInsertError } = await supabase
        .from('userdata')
        .insert([{ 
          user: username, // Set the username
          routing: "0", // Default routing value
          account: "0" // Default account value
        }]);

      // Handle any errors from the userdata insertion
      if (userDataInsertError) {
        console.error('Error inserting username into userdata table:', userDataInsertError.message);
        return; // Exit the function
      }

      console.log('User signed up successfully:', userData); // Log success message

      // Clear input fields and reset error text
      setUsername('');
      setPassword('');
      setErrorText('');
      setsignedUp(true); // Set signedUp state to true
    } catch (error) {
      console.error('Error signing up:', error.message); // Log error to console
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.innerContainer}>
        <h2 style={styles.title}>Signup</h2>
        <form onSubmit={handleSignup} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username:</label>
            <input
              type="text"
              value={username} // Controlled input for username
              onChange={(e) => setUsername(e.target.value)} // Update username state on change
              style={styles.input}
              required // Make this input required
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password:</label>
            <input
              type="password"
              value={password} // Controlled input for password
              onChange={(e) => setPassword(e.target.value)} // Update password state on change
              style={styles.input}
              required // Make this input required
            />
          </div>
          {errorText && <p style={styles.error}>{errorText}</p>} {/* Show error message if exists */}
          <button type="submit" style={styles.button}>Signup</button> {/* Signup button */}
        </form>
        {/* Redirect to login page if signup is successful */}
        {signedUp && <Navigate to='/login' />}
        <p style={styles.loginText}>
          Already have an account? <Link to="/login" style={styles.link}>Login</Link> {/* Link to login page */}
        </p>
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
    padding: '40px', // Padding around the container
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
    width: '100%', // Full width for inner container
    padding: '30px', // Padding for inner container
    background: 'linear-gradient(135deg, #6C7BD8, #7F00FF)', // Gradient background
    borderRadius: '16px', 
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)', // Shadow effect for the inner container
  },
  successMessage: {
    color: 'green',
    marginBottom: '15px',
    borderRadius: '12px',
    padding: '12px', 
    backgroundColor: '#D0E9C6', // Background for success message
  },
  errorMessage: {
    color: 'red',
    marginBottom: '15px',
    borderRadius: '12px', 
    padding: '12px', 
    backgroundColor: '#F8D7DA', // Background for error message
  },
  formContainer: {
    width: '100%',
    textAlign: 'center', // Center align text in the form
    padding: '30px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '30px', 
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
    marginBottom: '10px', // Space below label
    fontFamily: '"M PLUS Rounded 1c", sans-serif',
  },
  input: {
    padding: '15px', 
    borderRadius: '10px',
    border: '1px solid #ccc', // Border style for input
    fontSize: '16px',
    width: '100%', // Full width for input
    boxSizing: 'border-box',
    outline: 'none',
    marginBottom: '20px', // Space below input
    backgroundColor: '#FFFFFF',
    fontFamily: '"M PLUS Rounded 1c", sans-serif', 
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
    fontFamily: '"M PLUS Rounded 1c", sans-serif',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)', // Shadow effect for button
  },
  signupLink: {
    marginTop: '20px', // Space above signup link
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

export default Signup; // Exporting the Signup component
