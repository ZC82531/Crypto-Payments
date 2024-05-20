// ==============================================================================
// PROTECTED ROUTE COMPONENT - Authentication Guard
// ==============================================================================
// This component acts as a security guard for protected pages. It checks if a
// user is logged in before allowing them to see certain content.
//
// REAL-WORLD ANALOGY:
// Like a bouncer at a VIP section of a club:
//   - If you have credentials (logged in): Come on in!
//   - If you don't (not logged in): Redirected to the entrance (login page)
//   - Still checking your ID (loading): Wait a moment...
//
// HOW IT WORKS:
// 1. Check authentication status via useAuth()
// 2. If still loading: Show loading screen
// 3. If not logged in: Redirect to login page
// 4. If logged in: Show the protected content (children)
//
// USAGE EXAMPLE (from App.jsx):
//   <Route 
//     path="/dashboard" 
//     element={
//       <ProtectedRoute>
//         <Dashboard />
//       </ProtectedRoute>
//     } 
//   />
//
// In this example, Dashboard is wrapped in ProtectedRoute, so users must be
// logged in to see the Dashboard component.

// ------------------------------------------------------------------------------
// Required Libraries and Components
// ------------------------------------------------------------------------------
// React: Core library for building UI
import React from 'react';

// Navigate: React Router component for redirecting users
import { Navigate } from 'react-router-dom';

// useAuth: Our custom hook to access authentication state
import { useAuth } from './AuthContext';

// ==============================================================================
// PROTECTED ROUTE COMPONENT
// ==============================================================================
// This component wraps content that requires authentication
//
// PARAMETERS:
//   children: The protected content (components) to display if user is logged in
//
// RETURNS:
//   - Loading screen if still checking authentication
//   - Redirect to login if not authenticated
//   - The children components if authenticated
const ProtectedRoute = ({ children }) => {
  // ----------------------------------------------------------------------------
  // Get Authentication State
  // ----------------------------------------------------------------------------
  // Extract user and loading state from AuthContext
  // user: The logged-in user object (null if not logged in)
  // loading: Boolean indicating if we're still checking auth status
  const { user, loading } = useAuth();

  // ----------------------------------------------------------------------------
  // LOADING STATE: Show Loading Screen
  // ----------------------------------------------------------------------------
  // If we're still checking whether user is logged in, show a loading message
  // This prevents the page from flickering between logged in/out states
  //
  // WHY THIS MATTERS:
  // When the app first loads, it takes a moment to check if there's a saved
  // session. Without this check, users would see a flash of "not logged in"
  // even if they are logged in.
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading...</p>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // NOT AUTHENTICATED: Redirect to Login
  // ----------------------------------------------------------------------------
  // If loading is complete and there's no user, they're not logged in
  // Redirect them to the login page
  //
  // replace prop: Replaces current history entry instead of adding new one
  // This means clicking "back" won't bring them back to this protected page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ----------------------------------------------------------------------------
  // AUTHENTICATED: Show Protected Content
  // ----------------------------------------------------------------------------
  // User is logged in! Show the protected content (children)
  // children is whatever component was wrapped in <ProtectedRoute>
  return children;
};

// ==============================================================================
// STYLES
// ==============================================================================
// Inline styles for the loading screen
// Using CSS-in-JS approach (styles defined in JavaScript object)
const styles = {
  loadingContainer: {
    // Center the loading message both horizontally and vertically
    display: 'flex',              // Use flexbox layout
    justifyContent: 'center',     // Center horizontally
    alignItems: 'center',         // Center vertically
    height: '100vh',              // Full viewport height (100% of screen)
    
    // Use the same font as the rest of the app
    fontFamily: '"M PLUS Rounded 1c", sans-serif',
  },
};

// ==============================================================================
// EXPORT COMPONENT
// ==============================================================================
// Make ProtectedRoute available for import in other files
export default ProtectedRoute;