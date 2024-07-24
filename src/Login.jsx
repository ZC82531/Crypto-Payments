import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from './client.jsx';
import './global.css';

function Login() {
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {

      const { data: loginUserData, error: loginError } = await supabase
        .from('login')
        .select('*')
        .eq('username', loginData.username)
        .single();

      if (loginError) {
        console.error('Error fetching user login data:', loginError.message);
        setError('An error occurred while fetching user login data');
        return;
      }

      if (!loginUserData) {
        setError('User not found');
        return;
      }

      if (loginUserData.password !== loginData.password) {
        setError('Incorrect password');
        return;
      }


      setSuccess(true);


      const { data: userData, error: userError } = await supabase
        .from('userdata')
        .select('*')
        .eq('user', loginData.username)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError.message);
        setError('An error occurred while fetching user data');
        return;
      }

      if (!userData) {
        setError('User data not found');
        return;
      }


      if (userData.account === "0" && userData.routing === "0") {
      
        sessionStorage.setItem('username', loginData.username);
        window.location.href = '/finish-signup'; 

      } else {
 
        sessionStorage.setItem('username', loginData.username);
        window.location.href = '/dashboard';
      }

    } catch (error) {
      console.error('Error logging in:', error.message);
      setError('An error occurred while logging in');
    }
  };

  return (
    <div style={styles.container}>
      {success && <p style={styles.successMessage}>Login successful!</p>}
      {error && <p style={styles.errorMessage}>{error}</p>}
      <div style={styles.innerContainer}>
        <div style={styles.formContainer}>
          <h2 style={styles.title}>Login</h2>
          <form onSubmit={handleLoginSubmit} style={styles.form}>
            <label style={styles.label}>
              Username:
              <input
                type="text"
                name="username"
                value={loginData.username}
                onChange={handleLoginChange}
                style={styles.input}
                required
              />
            </label>
            <br />
            <label style={styles.label}>
              Password:
              <input
                type="password"
                name="password"
                value={loginData.password}
                onChange={handleLoginChange}
                style={styles.input}
                required
              />
            </label>
            <br />
            <button type="submit" style={styles.button}>Login</button>
          </form>
        </div>
        <div style={styles.signupLink}>
          <p>Don't have an account? <Link to="/signup" style={styles.link}>Sign Up</Link></p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center', 
    height: '100vh', 
    margin: 'auto',
    padding: '20px',
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
    padding: '20px',
    background: 'linear-gradient(135deg, #6C7BD8, #7F00FF)', 
    borderRadius: '12px', 
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)', 
  },
  successMessage: {
    color: 'green',
    marginBottom: '10px',
    borderRadius: '8px', 
    padding: '8px', 
    backgroundColor: '#D0E9C6', 
  },
  errorMessage: {
    color: 'red',
    marginBottom: '10px',
    borderRadius: '8px', 
    padding: '8px',
    backgroundColor: '#F8D7DA', 
  },
  formContainer: {
    width: '100%',
    textAlign: 'center',
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
    alignItems: 'center',
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
    border: '1px solid #ccc',
    fontSize: '16px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    marginBottom: '15px',
    backgroundColor: '#FFFFFF', 
    fontFamily: '"M PLUS Rounded 1c", sans-serif', 
  },
  button: {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    padding: '12px 40px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '20px',
    fontFamily: '"M PLUS Rounded 1c", sans-serif', 
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)', 
  },
  signupLink: {
    marginTop: '10px',
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

export default Login;
