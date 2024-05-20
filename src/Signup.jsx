// ==============================================================================
// SIGNUP COMPONENT
// ==============================================================================
// This component handles NEW USER REGISTRATION for the application.
// It's the page where people create their account to start using CryptoPay.
//
// Key Features:
// 1. Progressive form reveal (shows password fields only after valid email entered)
// 2. Real-time email validation with visual feedback
// 3. Password confirmation to prevent typos
// 4. Supabase authentication integration
// 5. Auto-redirect to login page after successful signup
// 6. Error handling with user-friendly messages
//
// User Flow:
// 1. User enters email → System validates format
// 2. If valid → Password fields appear (smooth animation)
// 3. User creates password and confirms it
// 4. System validates (matching passwords, minimum length)
// 5. Account created in Supabase → User redirected to login
//
// Security Features:
// - Email validation before account creation
// - Password minimum length requirement (6+ characters)
// - Password confirmation prevents typos
// - Supabase handles secure password hashing
// ==============================================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';  // For navigation links (Already have account? Sign in)
import supabase from './client.jsx';       // Supabase client for authentication
import './global.css';                     // Global styles
import { Navigate } from 'react-router-dom';  // For programmatic navigation after signup

const Signup = () => {
  // ==============================================================================
  // STATE MANAGEMENT
  // ==============================================================================
  // All the data and UI state needed for the signup form
  
  // Form data states
  const [username, setUsername] = useState('');  // Actually stores email (legacy naming)
  const [password, setPassword] = useState('');  // User's chosen password
  const [confirmPassword, setConfirmPassword] = useState('');  // Password confirmation field
  
  // UI states
  const [errorText, setErrorText] = useState('');  // Error message to display
  const [signedUp, setsignedUp] = useState(false);  // True after successful signup (triggers redirect)
  const [loading, setLoading] = useState(false);  // True during API call (shows loading state)
  const [showPasswordFields, setShowPasswordFields] = useState(false);  // Controls password fields visibility

  // ==============================================================================
  // EMAIL VALIDATION FUNCTION
  // ==============================================================================
  // Checks if the entered email follows proper email format
  // Examples of valid emails: user@example.com, test@mail.co.uk
  // Examples of invalid: user@, @example.com, user@.com
  const isValidEmail = (email) => {
    // Regex pattern explained:
    // ^[^\s@]+ → Start with one or more characters that aren't spaces or @
    // @ → Must have exactly one @ symbol
    // [^\s@]+ → One or more characters after @ (domain name)
    // \. → Must have a period (dot)
    // [^\s@]+$ → End with one or more characters (TLD like com, org, net)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);  // Returns true if email matches pattern
  };

  // ==============================================================================
  // HANDLE EMAIL INPUT CHANGE
  // ==============================================================================
  // Called every time the user types in the email field
  // This function provides progressive form reveal - a modern UX pattern
  // where the form expands as the user progresses through it
  const handleEmailChange = (e) => {
    const email = e.target.value;  // Get the current value from the input field
    setUsername(email);  // Update state with the new email value
    
    // Check if email is valid
    if (isValidEmail(email)) {
      // Email is valid → Show password fields (smooth animation will play)
      setShowPasswordFields(true);
    } else {
      // Email is invalid → Hide password fields
      setShowPasswordFields(false);
      
      // Clear password fields when email becomes invalid
      // This prevents users from filling passwords before entering valid email
      // Also provides a fresh start if they need to re-enter email
      setPassword('');
      setConfirmPassword('');
    }
  };

  // ==============================================================================
  // HANDLE SIGNUP SUBMISSION
  // ==============================================================================
  // This function runs when the user clicks "Create account" button
  // It validates the form, creates the account via Supabase, and handles the response
  const handleSignup = async (event) => {
    // Prevent default form submission (which would reload the page)
    event.preventDefault();

    // ------------------------------------------------------------------------------
    // Step 1: Validate password match
    // ------------------------------------------------------------------------------
    // Check if password and confirm password fields are identical
    // This catches typos before sending data to the server
    if (password !== confirmPassword) {
      setErrorText('Passwords do not match');
      return;  // Stop execution, don't proceed with signup
    }

    // ------------------------------------------------------------------------------
    // Step 2: Validate password length
    // ------------------------------------------------------------------------------
    // Enforce minimum password length for basic security
    // 6 characters is Supabase's minimum requirement
    if (password.length < 6) {
      setErrorText('Password must be at least 6 characters');
      return;  // Stop execution
    }

    // ------------------------------------------------------------------------------
    // Step 3: Show loading state
    // ------------------------------------------------------------------------------
    // Disable the button and show "Creating account..." text
    // This prevents duplicate submissions and gives visual feedback
    setLoading(true);

    try {
      // ------------------------------------------------------------------------------
      // Step 4: Call Supabase signup API
      // ------------------------------------------------------------------------------
      // supabase.auth.signUp() creates a new user account
      // Supabase automatically:
      // - Hashes the password (never stores plain text)
      // - Sends confirmation email (if enabled)
      // - Creates user record in auth.users table
      const { data, error } = await supabase.auth.signUp({
        email: username,      // User's email (used as login username)
        password: password,   // User's chosen password (will be hashed by Supabase)
      });

      // ------------------------------------------------------------------------------
      // Step 5: Handle errors
      // ------------------------------------------------------------------------------
      if (error) {
        console.error('Error signing up:', error.message);
        setErrorText(error.message);  // Show error to user (e.g., "Email already registered")
        setLoading(false);  // Re-enable the button
        return;  // Stop execution
      }

      // Check if user object was returned (it should be)
      if (!data.user) {
        setErrorText('Signup failed');
        setLoading(false);
        return;
      }

      // ------------------------------------------------------------------------------
      // Step 6: Success! Clean up and redirect
      // ------------------------------------------------------------------------------
      console.log('User signed up successfully:', data);
      
      // Clear all form fields (good UX practice)
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setErrorText('');  // Clear any previous errors
      
      // Set signedUp to true → This triggers the Navigate component below
      // which redirects user to the login page
      setsignedUp(true);
      
    } catch (error) {
      // ------------------------------------------------------------------------------
      // Step 7: Handle unexpected errors
      // ------------------------------------------------------------------------------
      // This catch block handles network errors, timeout errors, etc.
      // (errors that aren't returned by Supabase as part of the response)
      console.error('Error signing up:', error.message);
      setErrorText('An error occurred during signup');
      setLoading(false);  // Re-enable the button
    }
  };

  // ==============================================================================
  // RENDER THE SIGNUP UI
  // ==============================================================================
  return (
    // Main container - centers the signup card on the screen
    <div style={styles.container}>
      {/* Signup card - the white box containing the form */}
      <div style={styles.signupCard}>
        {/* Brand section - app name and subtitle */}
        <div style={styles.brandSection}>
          <h1 style={styles.brandTitle}>CryptoPay</h1>
          <p style={styles.brandSubtitle}>
            Create your account
          </p>
        </div>

        {/* Error alert - only shows when errorText has a value */}
        {errorText && (
          <div style={styles.errorAlert}>
            <span style={styles.errorIcon}>⚠️</span>
            {errorText}  {/* Display the actual error message */}
          </div>
        )}

        {/* Signup form - contains all input fields and submit button */}
        <form onSubmit={handleSignup} style={styles.form}>
          {/* Email input field */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={username}
              onChange={handleEmailChange}  // Validates email and shows/hides password fields
              style={styles.input}
              placeholder="Enter your email"
              required  // HTML5 validation - browser won't submit if empty
            />
          </div>

          {/* Password fields - only visible when showPasswordFields is true */}
          {/* This creates the progressive form reveal effect */}
          {showPasswordFields && (
            <div style={styles.passwordFieldsContainer}>
              {/* Password input field */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <input
                  type="password"  // Hides characters as user types
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}  // Update password state
                  style={styles.input}
                  placeholder="Create a password"
                  required
                />
              </div>

              {/* Confirm password input field */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}  // Update confirmPassword state
                  style={styles.input}
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <button 
            type="submit" 
            style={{
              ...styles.button,  // Spread operator - copies all button styles
              // Reduce opacity when disabled (makes button look grayed out)
              opacity: loading || !showPasswordFields ? 0.7 : 1,
              // Change cursor to "not-allowed" when disabled (visual feedback)
              cursor: loading || !showPasswordFields ? 'not-allowed' : 'pointer'
            }}
            // Disable button if:
            // - loading is true (signup in progress)
            // - showPasswordFields is false (email not validated yet)
            disabled={loading || !showPasswordFields}
          >
            {/* Show different text based on loading state */}
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        {/* Login prompt - for users who already have an account */}
        <div style={styles.loginPrompt}>
          <span style={styles.promptText}>Already have an account?</span>
          {/* Link to login page */}
          <Link to="/login" style={styles.loginLink}>
            Sign in
          </Link>
        </div>
      </div>

      {/* Conditional redirect - navigates to login page after successful signup */}
      {/* When signedUp becomes true, this Navigate component renders and redirects */}
      {signedUp && <Navigate to='/login' />}
    </div>
  );
};

// ==============================================================================
// STYLES OBJECT (CSS-in-JS)
// ==============================================================================
// All styling for the Signup component defined as JavaScript objects
// This approach (CSS-in-JS) keeps styles colocated with the component
//
// Benefits:
// - No class name conflicts
// - Styles are scoped to this component
// - Can use JavaScript for dynamic styling
// - Everything in one file (easy to maintain)
// ==============================================================================
const styles = {
  // Main container - centers everything on the screen
  container: {
    display: 'flex',              // Use flexbox for centering
    alignItems: 'center',         // Vertical centering
    justifyContent: 'center',     // Horizontal centering
    minHeight: '100vh',           // Full viewport height (100% of browser window)
    fontFamily: '"Source Sans Pro", "Helvetica Neue", Arial, sans-serif',  // Professional font stack
    background: '#ffffff',        // Pure white background
    padding: '20px',              // Inner padding for mobile spacing
  },
  
  // Signup card - the white box containing the form
  signupCard: {
    background: '#ffffff',        // White background
    borderRadius: '8px',          // Rounded corners (8px radius)
    border: '1px solid #e1e5e9',  // Light gray border (subtle outline)
    padding: '48px',              // Inner spacing (generous padding for desktop)
    width: '100%',                // Full width up to maxWidth
    maxWidth: '400px',            // Maximum 400px wide (prevents stretching on large screens)
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',  // Subtle shadow for depth
  },
  
  // Brand section - app name and tagline at the top
  brandSection: {
    textAlign: 'center',          // Center-align all text
    marginBottom: '40px',         // Space below section (separation from form)
  },
  
  // Brand title - "CryptoPay" heading
  brandTitle: {
    fontSize: '28px',             // Large, prominent text
    fontWeight: '600',            // Semi-bold (between normal and bold)
    fontFamily: '"Source Sans Pro", sans-serif',
    margin: '0 0 8px 0',          // Only bottom margin (8px space below)
    color: '#2c3e50',             // Dark blue-gray (professional color)
    letterSpacing: '-0.01em',     // Slightly tighter letter spacing (modern look)
    lineHeight: '1.2',            // Tight line height for headings
  },
  
  // Brand subtitle - "Create your account" text
  brandSubtitle: {
    fontSize: '16px',             // Medium text size
    fontWeight: '400',            // Normal weight
    fontFamily: '"Source Sans Pro", sans-serif',
    margin: 0,                    // No margin
    lineHeight: 1.5,              // Standard line height for readability
    color: '#666666',             // Medium gray (less prominent than title)
  },
  
  // Form container - holds all form elements
  form: {
    display: 'flex',              // Flexbox layout
    flexDirection: 'column',      // Stack items vertically
    gap: '20px',                  // 20px space between each form element
  },
  
  // Password fields container - animates in when email is valid
  passwordFieldsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',                  // Space between password and confirm password
    animation: 'slideInFade 0.4s ease-out',  // Smooth slide-in animation
    transformOrigin: 'top',       // Animation starts from the top
  },
  
  // Input group - wraps label and input together
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',      // Stack label above input
    gap: '6px',                   // Small space between label and input
  },
  
  // Label styling - for "Email", "Password", etc.
  label: {
    fontSize: '14px',             // Small, readable size
    fontWeight: '600',            // Semi-bold for emphasis
    color: '#374151',             // Dark gray
  },
  
  // Input field styling - applies to all text inputs
  input: {
    padding: '14px 16px',         // Generous padding for easy clicking/tapping
    border: '1px solid #e1e5e9',  // Light gray border
    borderRadius: '4px',          // Slightly rounded corners
    fontSize: '16px',             // Prevents zoom on mobile devices
    fontWeight: '400',            // Normal weight
    backgroundColor: '#ffffff',   // White background
    transition: 'border-color 0.2s ease',  // Smooth transition on focus
    fontFamily: 'inherit',        // Use parent font
    ':focus': {                   // Styles when input is focused (clicked)
      outline: 'none',            // Remove default browser outline
      borderColor: '#8B4513',     // Brown brand color border
      boxShadow: '0 0 0 2px rgba(139, 69, 19, 0.1)',  // Subtle brown glow
    },
  },
  
  // Submit button styling
  button: {
    padding: '14px 24px',         // Comfortable padding
    background: '#8B4513',        // Brown brand color
    color: 'white',               // White text
    border: 'none',               // No border
    borderRadius: '4px',          // Slightly rounded corners
    fontSize: '16px',             // Readable size
    fontWeight: '600',            // Semi-bold for emphasis
    cursor: 'pointer',            // Hand cursor on hover
    transition: 'opacity 0.2s ease',  // Smooth opacity transition
    fontFamily: 'inherit',        // Use parent font
    marginTop: '8px',             // Extra space above button
    ':hover': {                   // Hover state
      opacity: 0.9,               // Slightly transparent on hover
    },
  },
  
  // Login prompt section - "Already have an account?"
  loginPrompt: {
    textAlign: 'center',          // Center-align text
    marginTop: '24px',            // Space above section
  },
  
  // Prompt text - "Already have an account?"
  promptText: {
    color: '#666666',             // Medium gray
    fontSize: '14px',             // Small size
    marginRight: '8px',           // Space before the link
    fontWeight: '400',            // Normal weight
  },
  
  // Login link - "Sign in" clickable link
  loginLink: {
    color: '#8B4513',             // Brown brand color
    fontSize: '14px',
    fontWeight: '600',            // Semi-bold for emphasis
    textDecoration: 'none',       // No underline
    transition: 'opacity 0.2s ease',  // Smooth opacity transition
    ':hover': {                   // Hover state
      opacity: 0.8,               // Slightly transparent on hover
    },
  },
  
  // Error alert box - shows validation or server errors
  errorAlert: {
    backgroundColor: '#fef2f2',   // Light red background
    border: '1px solid #fecaca',  // Light red border
    borderRadius: '12px',         // Rounded corners
    padding: '16px',              // Inner spacing
    marginBottom: '20px',         // Space below alert
    display: 'flex',              // Flexbox for icon and text alignment
    alignItems: 'center',         // Vertically center content
    gap: '12px',                  // Space between icon and text
    color: '#dc2626',             // Red text color
    fontSize: '14px',             // Readable size
    fontWeight: '500',            // Medium weight
  },
  
  // Error icon - warning emoji
  errorIcon: {
    fontSize: '16px',             // Slightly larger than text
  },
};

// ------------------------------------------------------------------------------
// Export Component
// ------------------------------------------------------------------------------
export default Signup;
