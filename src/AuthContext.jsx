// ==============================================================================
// AUTHENTICATION CONTEXT - Global Login State Management
// ==============================================================================
// This file manages user authentication state for the entire application using
// React Context. Think of it as a "global storage" that any component can access
// to check if a user is logged in, get user info, or trigger login/logout.
//
// WHY CONTEXT?
// Without Context, you'd have to pass login state down through EVERY component
// as props (called "prop drilling"). Context lets any component access this
// data directly.
//
// REAL-WORLD ANALOGY:
// Like a company-wide announcement system. Instead of telling one person who
// tells another who tells another (prop drilling), you broadcast to everyone
// at once (Context).
//
// WHAT THIS PROVIDES:
// - user: Current logged-in user object (null if not logged in)
// - session: Supabase session with auth token
// - loading: Whether we're still checking authentication status
// - signUp: Function to create a new account
// - signIn: Function to log in with email/password
// - signOut: Function to log out

// ------------------------------------------------------------------------------
// Required Libraries
// ------------------------------------------------------------------------------
// React hooks for creating context and managing state
import React, { createContext, useContext, useEffect, useState } from 'react';

// Supabase client for authentication operations
import supabase from './client.jsx';

// ==============================================================================
// CREATE AUTHENTICATION CONTEXT
// ==============================================================================
// createContext() creates a Context object that can hold and share data
// Think of it as creating a "radio channel" that components can tune into
const AuthContext = createContext();

// ==============================================================================
// CUSTOM HOOK: useAuth
// ==============================================================================
// This is a convenience function that makes it easier to access the auth context
// Instead of calling useContext(AuthContext) everywhere, we just call useAuth()
//
// USAGE IN OTHER COMPONENTS:
//   const { user, signIn, signOut } = useAuth();
//   if (user) { ... }
//
// ERROR HANDLING:
// If a component tries to use useAuth outside of AuthProvider, throw an error
// This prevents bugs where components try to access auth before it's initialized
export const useAuth = () => {
  // Step 1: Try to access the auth context
  const context = useContext(AuthContext);
  
  // Step 2: Check if context exists
  // If it doesn't exist, component is outside AuthProvider (bad!)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // Step 3: Return the context value
  // This contains user, session, loading, signIn, signOut, etc.
  return context;
};

// ==============================================================================
// AUTH PROVIDER COMPONENT
// ==============================================================================
// This component wraps the entire app and provides authentication state to all
// child components. It manages the login state and provides functions to
// sign in, sign up, and sign out.
//
// WRAPS: Entire application (see App.jsx)
// PROVIDES: user, session, loading, signUp, signIn, signOut
//
// PARAMETERS:
//   children: All the components inside AuthProvider (the entire app)
export const AuthProvider = ({ children }) => {
  // ----------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ----------------------------------------------------------------------------
  // useState creates reactive state - when these values change, components re-render
  
  // user: The logged-in user object from Supabase
  // Contains: id, email, user metadata, etc.
  // null when not logged in
  const [user, setUser] = useState(null);
  
  // session: The Supabase session object
  // Contains: access token, refresh token, expiration time
  // null when not logged in
  const [session, setSession] = useState(null);
  
  // loading: Whether we're still checking authentication status
  // Starts as true, becomes false once we've determined if user is logged in
  // Used to show loading screens instead of flickering between logged in/out states
  const [loading, setLoading] = useState(true);

  // ----------------------------------------------------------------------------
  // INITIALIZATION AND AUTH STATE LISTENER
  // ----------------------------------------------------------------------------
  // useEffect runs after component mounts and handles side effects
  // In this case: Check initial login state and listen for auth changes
  useEffect(() => {
    // ==========================================================================
    // Get Initial Session
    // ==========================================================================
    // When the app first loads, check if there's an existing session
    // (user might already be logged in from previous visit)
    const getInitialSession = async () => {
      // Step 1: Ask Supabase if there's a current session
      // This checks for a stored session token in localStorage
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // Step 2: Handle errors
      if (error) {
        console.error('Error getting session:', error.message);
      } else {
        // Step 3: If session exists, update state
        setSession(session);
        
        // Extract user from session (using optional chaining and nullish coalescing)
        // If session?.user exists, use it; otherwise use null
        setUser(session?.user ?? null);
      }
      
      // Step 4: Mark loading as complete
      // Now we know whether user is logged in or not
      setLoading(false);
    };

    // Execute the initial session check
    getInitialSession();

    // ==========================================================================
    // Listen for Authentication Changes
    // ==========================================================================
    // Set up a listener that fires whenever auth state changes
    // This catches: login, logout, token refresh, password changes
    //
    // onAuthStateChange returns a subscription object we can use to clean up later
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // event: What happened ('SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', etc.)
        // session: The new session state
        
        // Update our state with the new session and user
        setSession(session);
        setUser(session?.user ?? null);
        
        // We're done loading (even if user is now logged out)
        setLoading(false);
      }
    );

    // ==========================================================================
    // Cleanup Function
    // ==========================================================================
    // When the component unmounts (app closes), unsubscribe from auth changes
    // This prevents memory leaks and unnecessary processing
    // The ? is optional chaining - only call unsubscribe if subscription exists
    return () => subscription?.unsubscribe();
  }, []); // Empty dependency array = run only once on mount

  // ----------------------------------------------------------------------------
  // AUTHENTICATION FUNCTIONS
  // ----------------------------------------------------------------------------
  // These functions are provided to all components via Context
  // Any component can call these to trigger authentication actions
  
  // ==========================================================================
  // Sign Up - Create New Account
  // ==========================================================================
  // Creates a new user account with email and password
  //
  // PARAMETERS:
  //   email: User's email address
  //   password: User's chosen password
  //
  // RETURNS:
  //   Object with data and error from Supabase
  //
  // WHAT HAPPENS:
  // 1. Supabase creates account
  // 2. Sends confirmation email to user
  // 3. User clicks link in email to confirm
  // 4. Then user can log in
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    // Return result so calling component can handle success/error
    return { data, error };
  };

  // ==========================================================================
  // Sign In - Log In with Email/Password
  // ==========================================================================
  // Logs in an existing user with their email and password
  //
  // PARAMETERS:
  //   email: User's email address
  //   password: User's password
  //
  // RETURNS:
  //   Object with data and error from Supabase
  //
  // WHAT HAPPENS:
  // 1. Supabase verifies email and password
  // 2. If valid, creates a session with JWT token
  // 3. onAuthStateChange listener fires and updates our state
  // 4. User is now logged in across the app
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // Return result so calling component can handle success/error
    return { data, error };
  };

  // ==========================================================================
  // Sign Out - Log Out Current User
  // ==========================================================================
  // Logs out the current user and clears session
  //
  // RETURNS:
  //   Object with error from Supabase (if any)
  //
  // WHAT HAPPENS:
  // 1. Supabase invalidates the session token
  // 2. Clears session from localStorage
  // 3. onAuthStateChange listener fires with SIGNED_OUT event
  // 4. Our state updates to user=null, session=null
  // 5. ProtectedRoute components redirect to login
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    // Return result so calling component can handle errors
    return { error };
  };

  // ----------------------------------------------------------------------------
  // CONTEXT VALUE
  // ----------------------------------------------------------------------------
  // This object contains everything we want to share via Context
  // Any component can access these values using useAuth()
  const value = {
    user,      // Current user object (or null)
    session,   // Current session object (or null)
    loading,   // Whether we're still checking auth status
    signUp,    // Function to create account
    signIn,    // Function to log in
    signOut,   // Function to log out
  };

  // ----------------------------------------------------------------------------
  // RENDER PROVIDER
  // ----------------------------------------------------------------------------
  // AuthContext.Provider makes the value available to all child components
  // Everything inside <AuthProvider> can now access auth state via useAuth()
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};