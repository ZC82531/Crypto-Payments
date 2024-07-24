import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from './client.jsx';
import './global.css';
import { Navigate } from 'react-router-dom';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorText, setErrorText] = useState('');
  const [signedUp, setsignedUp] = useState(false);

  const handleSignup = async (event) => {
    event.preventDefault();

    try {

      const { data: existingUsers, error } = await supabase
        .from('login')
        .select('username')
        .eq('username', username);

      if (error) {
        console.error('Error checking existing users:', error.message);
        return;
      }

      if (existingUsers.length > 0) {

        setErrorText('Username already exists. Please try another username.');
        return;
      }


      const { data: userData, error: insertError } = await supabase
        .from('login')
        .insert([{ username, password }]);
      
      if (insertError) {
        console.error('Error signing up:', insertError.message);
        return;
      }

      const { data: userDataInsert, error: userDataInsertError } = await supabase
        .from('userdata')
        .insert([{ 
          user: username,
          routing: "0",
          account: "0"
        }]);

      if (userDataInsertError) {
        console.error('Error inserting username into userdata table:', userDataInsertError.message);
        return;
      }

      console.log('User signed up successfully:', userData);


      setUsername('');
      setPassword('');
      setErrorText('');
      setsignedUp(true);
    } catch (error) {
      console.error('Error signing up:', error.message);
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
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          {errorText && <p style={styles.error}>{errorText}</p>}
          <button type="submit" style={styles.button}>Signup</button>
        </form>
        {signedUp && <Navigate to='/login' /> }
        <p style={styles.loginText}>Already have an account? <Link to="/login" style={styles.link}>Login</Link></p>
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
  successMessage: {
    color: 'green',
    marginBottom: '15px',
    borderRadius: '12px',
    padding: '12px', 
    backgroundColor: '#D0E9C6',
  },
  errorMessage: {
    color: 'red',
    marginBottom: '15px',
    borderRadius: '12px', 
    padding: '12px', 
    backgroundColor: '#F8D7DA',
  },
  formContainer: {
    width: '100%',
    textAlign: 'center',
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
    alignItems: 'center',
  },
  label: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px', 
    fontFamily: '"M PLUS Rounded 1c", sans-serif',
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
    fontFamily: '"M PLUS Rounded 1c", sans-serif', 
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
    fontFamily: '"M PLUS Rounded 1c", sans-serif',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
  },
  signupLink: {
    marginTop: '20px', 
    textAlign: 'center',
    fontFamily: '"M PLUS Rounded 1c", sans-serif',
  },
  link: {
    textDecoration: 'none',
    color: '#4CAF50',
    fontWeight: 'bold',
    fontFamily: '"M PLUS Rounded 1c", sans-serif',
  },
};

export default Signup;
