// ==============================================================================
// FINISH SIGNUP COMPONENT (Bank Account Setup)
// ==============================================================================
// This component allows new users to complete their registration by adding
// their bank account details (account number and routing number).
//
// Purpose:
// - Collect bank account information after initial signup
// - Store only last 4 digits for security (PCI compliance)
// - Verify user is authenticated before accepting data
// - Redirect to dashboard after successful submission
//
// Security Notes:
// - Only stores LAST 4 DIGITS of account/routing numbers
// - Requires active authentication session
// - Full account numbers are NOT stored in the database
// - This is a basic implementation - production would use encrypted storage
//
// User Flow:
// 1. User lands here after initial signup
// 2. Enters bank account and routing number
// 3. System validates authentication
// 4. System stores last 4 digits only
// 5. User redirected to dashboard
// ==============================================================================

import React, { useState } from 'react';
import {Navigate} from 'react-router-dom';  // For programmatic navigation
import supabase from './client.jsx';         // Supabase client for database and auth
import './global.css';                       // Global styles

const FinishSignup = () => {
  // ==============================================================================
  // STATE MANAGEMENT
  // ==============================================================================
  
  // Form data states
  const [accountNumber, setAccountNumber] = useState('');  // User's bank account number (temporary)
  const [routingNumber, setRoutingNumber] = useState('');  // User's bank routing number (temporary)
  
  // UI states
  const [error, setError] = useState('');                 // Error message to display
  const [loading, setLoading] = useState(false);          // Loading state during submission
  const [signedOut, setsignedOut] = useState(false);      // True after logout (triggers redirect)
  const [paymentEntered, setpaymentEntered] = useState(false);  // True after successful submission

  // ==============================================================================
  // HANDLE FORM SUBMISSION
  // ==============================================================================
  // This function processes the bank account information and stores it securely
  const handleFormSubmit = async (e) => {
    // Prevent default form submission (no page reload)
    e.preventDefault();
    setError('');  // Clear any previous errors

    try {
      setLoading(true);  // Show loading state

      // ------------------------------------------------------------------------------
      // Step 1: Verify user authentication
      // ------------------------------------------------------------------------------
      // Check if user has an active session (is logged in)
      // This prevents unauthorized access to this form
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        // No valid session → User must log in first
        setError('Please log in to continue');
        setLoading(false);
        setsignedOut(true);  // Trigger redirect to login
        return;
      }

      const user = session.user;  // Extract user object from session

      // ------------------------------------------------------------------------------
      // Step 2: Fetch existing user data
      // ------------------------------------------------------------------------------
      // Check if user already has a record in the userdata table
      // This table stores user-specific information (created during signup)
      const { data: existingUserData, error: fetchError } = await supabase
        .from('userdata')           // Query the userdata table
        .select('*')                 // Select all columns
        .eq('user_id', user.id)      // Filter by user ID
        .single();                   // Expect exactly one result

      if (fetchError) {
        console.error('Error fetching user data:', fetchError.message);
        setError('An error occurred while fetching user data');
        setLoading(false);
        return;
      }

      if (!existingUserData) {
        // User record doesn't exist (shouldn't happen in normal flow)
        setError('User data not found');
        setLoading(false);
        return;
      }

      // ------------------------------------------------------------------------------
      // Step 3: Extract last 4 digits only (SECURITY MEASURE)
      // ------------------------------------------------------------------------------
      // We NEVER store full account numbers in the database
      // Only store last 4 digits for:
      // - User verification ("ending in 1234")
      // - Display purposes
      // - PCI compliance (Payment Card Industry standards)
      //
      // Example: "123456789" → "6789"
      const last4Account = accountNumber.slice(-4);  // Get last 4 characters
      const last4Routing = routingNumber.slice(-4);  // Get last 4 characters

      // ------------------------------------------------------------------------------
      // Step 4: Update database with last 4 digits
      // ------------------------------------------------------------------------------
      // Store the last 4 digits in the userdata table
      const { error: updateError } = await supabase
        .from('userdata')                                // Update userdata table
        .update({ account: last4Account, routing: last4Routing })  // Set account and routing columns
        .eq('user_id', user.id);                         // Only update this user's record

      if (updateError) {
        console.error('Error updating user data:', updateError.message);
        setError('An error occurred while updating user data');
        setLoading(false);
        return;
      }

      // ------------------------------------------------------------------------------
      // Step 5: Success! Clean up and redirect
      // ------------------------------------------------------------------------------
      // Clear the form fields (removes sensitive data from memory)
      setAccountNumber('');
      setRoutingNumber('');
      setLoading(false);  // Stop loading state
      handleSuccess();    // Call success handler (sets redirect flag)

    } catch (error) {
      // ------------------------------------------------------------------------------
      // Handle unexpected errors
      // ------------------------------------------------------------------------------
      console.error('Error during finish signup:', error.message);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  // ==============================================================================
  // HANDLE SUCCESS
  // ==============================================================================
  // Called after successful database update
  // Sets the flag that triggers navigation to dashboard
  const handleSuccess = () => {
    console.log('Successfully updated user data');
    
    // Set paymentEntered to true → This triggers the Navigate component below
    // User will be redirected to dashboard
    setpaymentEntered(true); 
  };

  // ==============================================================================
  // HANDLE SIGN OUT
  // ==============================================================================
  // Logs user out and redirects to login page
  // Useful if user wants to switch accounts or log out before completing setup
  const handleSignOut = async () => {
    // Sign out from Supabase Auth (destroys session)
    await supabase.auth.signOut();
    
    // Clear session storage (removes any cached data)
    sessionStorage.clear();
    
    // Set signedOut flag → Triggers redirect to login
    setsignedOut(true);
  };

  // ==============================================================================
  // RENDER THE FINISH SIGNUP UI
  // ==============================================================================
  return (
    // Main container - centered with gradient background
    <div style={styles.container}>
      {/* Sign Out button - positioned in top-right corner */}
      <button onClick={handleSignOut} style={styles.signOutButton}>
        Sign Out
      </button>
      
      {/* Conditional redirect - navigates to login if user signs out */}
      {signedOut && <Navigate to='/login' />}
      
      {/* Page title */}
      <h2 style={styles.title}>Finish Signup</h2>
      
      {/* Bank account information form */}
      <form onSubmit={handleFormSubmit} style={styles.form}>
        {/* Account Number input */}
        <label style={styles.label}>
          Account Number:
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}  // Update state as user types
            style={styles.input}
            required  // HTML5 validation - can't submit if empty
          />
        </label>
        <br />
        
        {/* Routing Number input */}
        <label style={styles.label}>
          Routing Number:
          <input
            type="text"
            value={routingNumber}
            onChange={(e) => setRoutingNumber(e.target.value)}  // Update state as user types
            style={styles.input}
            required  // HTML5 validation - can't submit if empty
          />
        </label>
        <br />
        
        {/* Submit button - disabled during loading */}
        <button type="submit" style={styles.button} disabled={loading}>
          {/* Show different text based on loading state */}
          {loading ? 'Loading...' : 'Submit'}
        </button>
      </form>
      
      {/* Conditional redirect - navigates to dashboard after successful submission */}
      {paymentEntered && <Navigate to='/dashboard' />}
      
      {/* Error message - only shows when error has a value */}
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
};

// ==============================================================================
// STYLES OBJECT (CSS-in-JS)
// ==============================================================================
// All styling defined as JavaScript objects
// This component uses a more colorful, modern design with gradient background
// ==============================================================================
const styles = {
  // Main container - full screen with gradient background
  container: {
    position: 'relative',              // Allows absolute positioning of sign out button
    display: 'flex',                   // Flexbox layout
    flexDirection: 'column',           // Stack items vertically
    alignItems: 'center',              // Horizontally center content
    justifyContent: 'center',          // Vertically center content
    height: '100vh',                   // Full viewport height
    margin: 'auto',                    // Center horizontally
    padding: '40px',                   // Inner spacing
    borderRadius: '20px',              // Rounded corners
    boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',  // Subtle shadow
    background: 'linear-gradient(135deg, #6C7BD8, #7F00FF)',  // Purple gradient background
    fontFamily: '"M PLUS Rounded 1c", sans-serif',  // Rounded, friendly font
  },
  
  // Sign out button - positioned in top-right corner
  signOutButton: {
    position: 'absolute',              // Positioned relative to container
    top: '20px',                       // 20px from top edge
    right: '20px',                     // 20px from right edge
    backgroundColor: '#f44336',        // Red background (warning color)
    color: 'white',                    // White text
    border: 'none',                    // No border
    borderRadius: '10px',              // Rounded corners
    padding: '10px 20px',              // Comfortable padding
    fontSize: '16px',                  // Readable size
    cursor: 'pointer',                 // Hand cursor on hover
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',  // Subtle shadow for depth
  },
  
  // Page title - "Finish Signup"
  title: {
    fontSize: '24px',                  // Large, prominent text
    fontWeight: 'bold',                // Bold for emphasis
    marginBottom: '30px',              // Space below title
  },
  
  // Form container - white box with rounded corners
  form: {
    width: '100%',                     // Full width up to maxWidth
    maxWidth: '400px',                 // Maximum 400px wide
    padding: '30px',                   // Generous inner spacing
    background: '#FFFFFF',             // White background (contrasts with gradient)
    borderRadius: '16px',              // Rounded corners
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',  // Subtle shadow
    display: 'flex',                   // Flexbox layout
    flexDirection: 'column',           // Stack items vertically
    alignItems: 'center',              // Center content
  },
  
  // Label styling - for "Account Number" and "Routing Number"
  label: {
    fontSize: '16px',                  // Readable size
    fontWeight: 'bold',                // Bold for emphasis
    marginBottom: '10px',              // Space below label
  },
  
  // Input field styling
  input: {
    padding: '15px',                   // Generous padding for easy interaction
    borderRadius: '10px',              // Rounded corners
    border: '1px solid #ccc',          // Light gray border
    fontSize: '16px',                  // Readable size (prevents mobile zoom)
    width: '100%',                     // Full width of container
    boxSizing: 'border-box',           // Include padding in width calculation
    outline: 'none',                   // Remove default browser outline
    marginBottom: '20px',              // Space below input
    backgroundColor: '#FFFFFF',        // White background
  },
  
  // Submit button styling
  button: {
    backgroundColor: '#4CAF50',        // Green background (success color)
    color: 'white',                    // White text
    border: 'none',                    // No border
    borderRadius: '50px',              // Fully rounded (pill shape)
    padding: '15px 40px',              // Generous padding
    fontSize: '16px',                  // Readable size
    cursor: 'pointer',                 // Hand cursor on hover
    marginTop: '25px',                 // Extra space above button
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',  // Subtle shadow
  },
  
  // Error message styling
  error: {
    color: 'red',                      // Red text (error color)
    marginTop: '20px',                 // Space above message
  },
};

// ------------------------------------------------------------------------------
// Export Component
// ------------------------------------------------------------------------------
export default FinishSignup;
