// ==============================================================================
// LOGIN COMPONENT - User Authentication Page
// ==============================================================================
// This component displays the login form where existing users enter their email
// and password to access their account. It handles the authentication process
// through Supabase and redirects successful logins to the dashboard.
//
// USER FLOW:
// 1. User enters email and password
// 2. Click "Sign in" button
// 3. Form submits to Supabase authentication
// 4. If successful: Redirect to dashboard
// 5. If failed: Show error message
//
// FEATURES:
// - Email/password authentication
// - Loading states during login
// - Error and success messages
// - Link to password reset
// - Link to signup for new users
// - Session storage for user data
//
// SECURITY:
// - Password fields are masked (type="password")
// - Supabase handles password hashing and verification
// - JWT tokens automatically managed by Supabase

// ------------------------------------------------------------------------------
// Required Libraries and Components
// ------------------------------------------------------------------------------
// React hooks for state management
import React, { useState } from 'react';

// React Router for navigation
// Link: Creates navigation links without page reload
// Navigate: Programmatically redirects to another route
import { Link, Navigate } from 'react-router-dom';

// Supabase client for authentication
import supabase from './client.jsx';

// Global CSS styles
import './global.css';

// ==============================================================================
// LOGIN COMPONENT
// ==============================================================================
// Main component that renders the login page
function Login() {
  // ----------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ----------------------------------------------------------------------------
  // useState creates reactive state that triggers re-renders when changed
  
  // loginData: Stores the form input values
  // Object with username (email) and password fields
  const [loginData, setLoginData] = useState({
    username: '',  // Called "username" but actually stores email
    password: '',  // User's password
  });
  
  // error: Stores error message to display to user
  // Empty string = no error, any text = error to show
  const [error, setError] = useState('');
  
  // success: Boolean indicating if login was successful
  // Used to show success message before redirect
  const [success, setSuccess] = useState(false);
  
  // loggedIn: Stores the redirect path after successful login
  // Empty string = no redirect, '/dashboard' = redirect to dashboard
  const [loggedIn, setloggedIn] = useState('');
  
  // loading: Boolean indicating if login request is in progress
  // Used to disable button and show loading text during authentication
  const [loading, setLoading] = useState(false);

  // ----------------------------------------------------------------------------
  // EVENT HANDLERS
  // ----------------------------------------------------------------------------
  
  // ==========================================================================
  // Handle Input Changes
  // ==========================================================================
  // This function runs every time user types in the email or password field
  // It updates the loginData state with the new value
  //
  // PARAMETERS:
  //   e: Event object containing information about the input change
  //      e.target.name: Which input field changed ('username' or 'password')
  //      e.target.value: The new value in that field
  //
  // HOW IT WORKS:
  // Uses "computed property names" [e.target.name] to update the correct field
  // Spread operator (...loginData) keeps existing values, then overwrites changed field
  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  // ==========================================================================
  // Handle Form Submission
  // ==========================================================================
  // This function runs when user clicks "Sign in" button
  // It sends login credentials to Supabase and handles the response
  //
  // PARAMETERS:
  //   e: Event object from form submission
  //
  // AUTHENTICATION FLOW:
  // 1. Prevent default form submission (which would reload page)
  // 2. Reset error/success states
  // 3. Set loading state
  // 4. Call Supabase authentication
  // 5. Handle response (success or error)
  // 6. Redirect on success or show error on failure
  const handleLoginSubmit = async (e) => {
    // ------------------------------------------------------------------------
    // Step 1: Prevent Default Form Behavior
    // ------------------------------------------------------------------------
    // Normally, form submission reloads the page. We prevent that
    // because we want to handle submission with JavaScript (SPA behavior)
    e.preventDefault();
    
    // ------------------------------------------------------------------------
    // Step 2: Reset State
    // ------------------------------------------------------------------------
    // Clear any previous error messages
    setError('');
    
    // Clear success state in case of re-login
    setSuccess(false);
    
    // Set loading to true (disables button, shows "Signing in...")
    setLoading(true);

    try {
      // ----------------------------------------------------------------------
      // Step 3: Call Supabase Authentication
      // ----------------------------------------------------------------------
      // signInWithPassword is Supabase's email/password authentication method
      // It verifies credentials and creates a session if valid
      //
      // WHAT SUPABASE DOES:
      // 1. Checks if email exists in database
      // 2. Verifies password hash matches stored hash
      // 3. If valid: Creates JWT session token
      // 4. If invalid: Returns error
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.username,     // User's email
        password: loginData.password,  // User's password (sent securely over HTTPS)
      });

      // ----------------------------------------------------------------------
      // Step 4: Handle Authentication Errors
      // ----------------------------------------------------------------------
      // If Supabase returns an error, authentication failed
      if (error) {
        console.error('Error logging in:', error.message);
        
        // Show user-friendly error message
        setError('Invalid credentials');
        
        // Stop loading state
        setLoading(false);
        
        // Exit function early (don't continue to success logic)
        return;
      }

      // ----------------------------------------------------------------------
      // Step 5: Verify User Data Exists
      // ----------------------------------------------------------------------
      // Extra safety check: Make sure we got user data back
      // Should always exist if no error, but good to verify
      if (!data.user) {
        setError('Login failed');
        setLoading(false);
        return;
      }

      // ----------------------------------------------------------------------
      // Step 6: Handle Successful Login
      // ----------------------------------------------------------------------
      // Authentication succeeded! Now prepare for redirect
      
      // Set success state (shows success message)
      setSuccess(true);
      
      // Store user info in session storage for quick access
      // sessionStorage persists until browser tab is closed
      // Useful for displaying user info without querying database
      sessionStorage.setItem('user_id', data.user.id);
      sessionStorage.setItem('user_email', data.user.email);
      
      // Set redirect path (triggers Navigate component to redirect)
      setloggedIn('/dashboard');

    } catch (error) {
      // ------------------------------------------------------------------------
      // Step 7: Handle Unexpected Errors
      // ------------------------------------------------------------------------
      // Catch any errors that weren't caught above
      // This includes network errors, timeouts, etc.
      console.error('Error logging in:', error.message);
      
      // Show generic error message to user
      setError('An error occurred during login');
      
      // Stop loading state
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // RENDER LOGIN FORM
  // ----------------------------------------------------------------------------
  return (
    <div style={styles.container}>
      {/* ===================================================================
          LOGIN CARD - Main Form Container
          ===================================================================
          White card with rounded corners containing the entire login form
      */}
      <div style={styles.loginCard}>
        {/* ---------------------------------------------------------------
            BRAND SECTION - App Name and Subtitle
            --------------------------------------------------------------- */}
        <div style={styles.brandSection}>
          <h1 style={styles.brandTitle}>CryptoPay</h1>
          <p style={styles.brandSubtitle}>
            Sign in to your account
          </p>
        </div>

        {/* ---------------------------------------------------------------
            ERROR ALERT - Shows if Login Fails
            ---------------------------------------------------------------
            Only displays if error state has a message
            && operator: If error is truthy, render the div
        */}
        {error && (
          <div style={styles.errorAlert}>
            <span style={styles.errorIcon}>⚠️</span>
            {error}
          </div>
        )}

        {/* ---------------------------------------------------------------
            SUCCESS ALERT - Shows on Successful Login
            ---------------------------------------------------------------
            Displays briefly before redirect to dashboard
        */}
        {success && (
          <div style={styles.successAlert}>
            <span style={styles.successIcon}>✅</span>
            Login successful!
          </div>
        )}

        {/* ---------------------------------------------------------------
            LOGIN FORM
            ---------------------------------------------------------------
            Form with email and password inputs + submit button
        */}
        <form onSubmit={handleLoginSubmit} style={styles.form}>
          {/* Email Input Field */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"                        // Browser validates email format
              name="username"                     // Field name for handleLoginChange
              value={loginData.username}          // Controlled input (React manages value)
              onChange={handleLoginChange}        // Update state on every keystroke
              style={styles.input}
              placeholder="Enter your email"
              required                            // HTML5 validation (must be filled)
            />
          </div>

          {/* Password Input Field */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"                     // Masks password characters
              name="password"                     // Field name for handleLoginChange
              value={loginData.password}          // Controlled input
              onChange={handleLoginChange}        // Update state on every keystroke
              style={styles.input}
              placeholder="Enter your password"
              required                            // HTML5 validation
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            style={{
              ...styles.button,                   // Base button styles
              opacity: loading ? 0.7 : 1,        // Dim button while loading
              cursor: loading ? 'not-allowed' : 'pointer'  // Change cursor during loading
            }}
            disabled={loading}                    // Disable button during loading
          >
            {/* Show different text based on loading state */}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* ---------------------------------------------------------------
            FORGOT PASSWORD LINK
            --------------------------------------------------------------- */}
        <div style={styles.forgotPassword}>
          <Link to="/password-reset" style={styles.forgotLink}>
            Forgot your password?
          </Link>
        </div>

        {/* ---------------------------------------------------------------
            SIGNUP PROMPT
            ---------------------------------------------------------------
            Encourages new users to create an account
        */}
        <div style={styles.signupPrompt}>
          <span style={styles.promptText}>Don't have an account?</span>
          <Link to="/signup" style={styles.signupLink}>
            Create account
          </Link>
        </div>
      </div>

      {/* ===================================================================
          REDIRECT ON SUCCESS
          ===================================================================
          When loggedIn state is set, Navigate component redirects to dashboard
          Conditional rendering: Only renders if loggedIn is truthy
      */}
      {loggedIn && <Navigate to={loggedIn} />}
    </div>
  );
}

// ==============================================================================
// COMPONENT STYLES
// ==============================================================================
// CSS-in-JS styling using JavaScript objects
// Each property corresponds to a CSS property (camelCase instead of kebab-case)
// Example: background-color becomes backgroundColor
//
// WHY CSS-IN-JS?
// - Styles are scoped to this component
// - No CSS class name conflicts
// - Easy to make styles dynamic based on state
// - All component code in one file
const styles = {
  // ----------------------------------------------------------------------------
  // Container - Full Page Background
  // ----------------------------------------------------------------------------
  // Covers entire viewport and centers the login card
  container: {
    display: 'flex',              // Use flexbox for centering
    alignItems: 'center',         // Center vertically
    justifyContent: 'center',     // Center horizontally
    minHeight: '100vh',           // Full viewport height (vh = viewport height)
    fontFamily: '"Source Sans Pro", "Helvetica Neue", Arial, sans-serif',
    background: '#ffffff',        // White background
    padding: '20px',              // Padding for mobile devices
  },
  
  // ----------------------------------------------------------------------------
  // Login Card - White Box Containing Form
  // ----------------------------------------------------------------------------
  // Centered white card with shadow for depth
  loginCard: {
    background: '#ffffff',          // White background
    borderRadius: '8px',            // Rounded corners (8 pixels)
    border: '1px solid #e1e5e9',   // Light gray border
    padding: '48px',                // Internal spacing
    width: '100%',                  // Full width of container
    maxWidth: '400px',              // But never wider than 400px
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',  // Subtle shadow for depth
  },
  
  // ----------------------------------------------------------------------------
  // Brand Section - App Name Area
  // ----------------------------------------------------------------------------
  brandSection: {
    textAlign: 'center',            // Center the text
    marginBottom: '40px',           // Space below before form
  },
  
  // Brand Title - "CryptoPay" Heading
  brandTitle: {
    fontSize: '28px',               // Large text
    fontWeight: '600',              // Semi-bold
    fontFamily: '"Source Sans Pro", sans-serif',
    margin: '0 0 8px 0',           // Only bottom margin
    color: '#2c3e50',              // Dark blue-gray
    letterSpacing: '-0.01em',      // Slightly tighter letter spacing
    lineHeight: '1.2',             // Line height (1.2x font size)
  },
  
  // Brand Subtitle - "Sign in to your account"
  brandSubtitle: {
    fontSize: '16px',
    fontWeight: '400',              // Normal weight
    fontFamily: '"Source Sans Pro", sans-serif',
    margin: 0,                      // No margin
    lineHeight: 1.5,
    color: '#666666',              // Medium gray
  },
  
  // ----------------------------------------------------------------------------
  // Form Layout
  // ----------------------------------------------------------------------------
  form: {
    display: 'flex',
    flexDirection: 'column',        // Stack children vertically
    gap: '20px',                    // Space between form elements
  },
  
  // Input Group - Container for Label + Input
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',        // Stack label above input
    gap: '6px',                     // Small space between label and input
  },
  
  // Label - "Email" and "Password" Text
  label: {
    fontSize: '14px',
    fontWeight: '600',              // Semi-bold to stand out
    color: '#374151',              // Dark gray
  },
  
  // Input Fields - Email and Password Boxes
  input: {
    padding: '14px 16px',           // Internal spacing (top/bottom left/right)
    fontSize: '16px',
    border: '1px solid #e1e5e9',   // Light gray border
    borderRadius: '4px',            // Slightly rounded corners
    transition: 'border-color 0.2s ease',  // Smooth color change on focus
    fontFamily: 'inherit',          // Use same font as parent
    background: '#ffffff',
    // Note: :focus pseudo-selector doesn't work in inline styles
    // Would need styled-components or CSS file for hover/focus effects
  },
  
  // ----------------------------------------------------------------------------
  // Submit Button
  // ----------------------------------------------------------------------------
  button: {
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',                 // White text
    background: '#8B4513',          // Brown brand color
    border: 'none',                 // Remove default button border
    borderRadius: '4px',            // Rounded corners
    cursor: 'pointer',              // Show hand cursor on hover
    transition: 'opacity 0.2s ease',  // Smooth opacity change
    fontFamily: 'inherit',
    marginTop: '8px',               // Extra space above button
  },
  
  // ----------------------------------------------------------------------------
  // Divider (currently unused but kept for potential use)
  // ----------------------------------------------------------------------------
  divider: {
    textAlign: 'center',
    margin: '32px 0',
    position: 'relative',
  },
  
  dividerText: {
    background: '#ffffff',
    padding: '0 16px',
    color: '#666666',
    fontSize: '14px',
  },
  
  // ----------------------------------------------------------------------------
  // Signup Prompt - "Don't have an account?"
  // ----------------------------------------------------------------------------
  signupPrompt: {
    textAlign: 'center',
    marginTop: '24px',              // Space above prompt
  },
  
  // "Don't have an account?" Text
  promptText: {
    color: '#666666',               // Medium gray
    fontSize: '14px',
    marginRight: '8px',             // Space before link
  },
  
  // "Create account" Link
  signupLink: {
    color: '#8B4513',               // Brown brand color
    fontSize: '14px',
    fontWeight: '600',              // Semi-bold
    textDecoration: 'none',         // Remove underline
    transition: 'opacity 0.2s ease',
  },
  
  // ----------------------------------------------------------------------------
  // Forgot Password Section
  // ----------------------------------------------------------------------------
  forgotPassword: {
    textAlign: 'center',
    marginTop: '16px',              // Space above forgot password link
  },
  
  // "Forgot your password?" Link
  forgotLink: {
    color: '#666666',               // Medium gray (less prominent than signup)
    fontSize: '14px',
    textDecoration: 'none',         // Remove underline
    transition: 'color 0.2s ease',
  },
  
  // ----------------------------------------------------------------------------
  // Error Alert - Red Error Message Box
  // ----------------------------------------------------------------------------
  errorAlert: {
    display: 'flex',
    alignItems: 'center',           // Vertically center icon and text
    gap: '8px',                     // Space between icon and message
    padding: '12px 16px',
    background: '#fef2f2',          // Very light red background
    border: '1px solid #fecaca',   // Light red border
    borderRadius: '8px',            // Rounded corners
    color: '#dc2626',              // Red text
    fontSize: '14px',
    marginBottom: '24px',           // Space below before form
  },
  
  // Warning Icon in Error Alert
  errorIcon: {
    fontSize: '16px',               // Slightly larger than text
  },
  
  // ----------------------------------------------------------------------------
  // Success Alert - Green Success Message Box
  // ----------------------------------------------------------------------------
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: '#f0fdf4',          // Very light green background
    border: '1px solid #bbf7d0',   // Light green border
    borderRadius: '8px',
    color: '#16a34a',              // Green text
    fontSize: '14px',
    marginBottom: '24px',
  },
  
  // Checkmark Icon in Success Alert
  successIcon: {
    fontSize: '16px',
  },
};

// ==============================================================================
// EXPORT COMPONENT
// ==============================================================================
// Make Login component available for import in other files (like App.jsx)
export default Login;
