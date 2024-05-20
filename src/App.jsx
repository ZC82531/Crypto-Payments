// ==============================================================================
// APP COMPONENT - Main Application Router
// ==============================================================================
// This is the root component of the entire application. It defines all the routes
// (URLs) users can visit and which component should display for each route.
//
// WHAT IS A ROUTE?
// A route is a URL path that displays different content. Like different pages in
// a book - each URL is a different "page" of your app.
//
// ROUTING LIBRARY: React Router
// We use React Router to handle navigation without page reloads. When you click
// a link, React Router swaps out components instead of loading a new HTML page.
// This makes the app feel fast and smooth (Single Page Application - SPA).
//
// APP STRUCTURE:
// - Public Routes: Anyone can access (Login, Signup, Password Reset, Customer Pages)
// - Protected Routes: Must be logged in (Dashboard, Business Setup)
// - Dynamic Routes: URL includes variable data (/:username for customer pages)

// ------------------------------------------------------------------------------
// Required Libraries and Components
// ------------------------------------------------------------------------------
// React: Core library for building user interfaces
import React, { useState } from 'react';

// React Router: Handles navigation and URL routing
// - Routes: Container for all route definitions
// - Route: Defines a single route (URL path + component to render)
// - Navigate: Redirects users to a different route
import { Routes, Route, Navigate } from 'react-router-dom';

// Authentication Context: Provides login state to entire app
import { AuthProvider } from './AuthContext';

// ProtectedRoute: Wrapper that requires authentication
import ProtectedRoute from './ProtectedRoute';

// Page Components: Each component represents a different page/view
import Login from './Login';                           // Login form page
import Signup from './Signup';                         // Signup form page
import Dashboard from './dashboard'                    // Business owner dashboard
import CustomerPage from './CustomerPage'              // Public payment page for customers
import PaymentPage from './PaymentPage';               // Payment processing page
import PasswordReset from './PasswordReset';           // Request password reset
import PasswordResetConfirm from './PasswordResetConfirm'; // Confirm new password
import BusinessSetup from './BusinessSetup';           // Bank account setup

// Supabase Client: Database and authentication connection
import supabase from './client.jsx';

// ==============================================================================
// APP COMPONENT
// ==============================================================================
// The main component that renders the entire application
function App() {
  return (
    // --------------------------------------------------------------------------
    // Authentication Provider Wrapper
    // --------------------------------------------------------------------------
    // AuthProvider wraps the entire app and provides authentication state
    // (logged in user, session, login/logout functions) to all child components
    //
    // WHY WRAP EVERYTHING?
    // Any component inside AuthProvider can access login state without
    // passing props down through multiple levels (called "Context" in React)
    <AuthProvider>
      <div className="app">
        {/* ===================================================================
            ROUTES CONFIGURATION
            ===================================================================
            Define all URL paths and what component should render for each.
            React Router matches the current URL to these routes and displays
            the corresponding component.
        */}
        <Routes>
          {/* ---------------------------------------------------------------
              ROOT ROUTE: Redirect to Login
              ---------------------------------------------------------------
              When users visit the root URL (just the domain), automatically
              redirect them to the login page.
              
              Example: visiting "myapp.com/" redirects to "myapp.com/login"
          */}
          <Route path="/" element={<Navigate to="/login" />} />
          
          {/* ---------------------------------------------------------------
              PUBLIC AUTHENTICATION ROUTES
              ---------------------------------------------------------------
              These routes don't require login - anyone can access them
          */}
          
          {/* Login Page: Where users enter email/password */}
          <Route path="/login" element={<Login />} />
          
          {/* Signup Page: Where new users create accounts */}
          <Route path="/signup" element={<Signup />} />
          
          {/* Password Reset Request: User enters email to get reset link */}
          <Route path="/password-reset" element={<PasswordReset />} />
          
          {/* Password Reset Confirm: User sets new password after clicking email link */}
          <Route path="/reset-password-confirm" element={<PasswordResetConfirm />} />
          
          {/* ---------------------------------------------------------------
              PROTECTED ROUTE: Business Setup
              ---------------------------------------------------------------
              This route requires authentication. The ProtectedRoute wrapper
              checks if user is logged in:
                - If logged in: Show BusinessSetup component
                - If not logged in: Redirect to login page
              
              Business owners use this page to enter their bank account details
              so they can receive payments from customers.
          */}
          <Route 
            path="/business-setup" 
            element={
              <ProtectedRoute>
                <BusinessSetup />
              </ProtectedRoute>
            } 
          />
          
          {/* ---------------------------------------------------------------
              PROTECTED ROUTE: Dashboard
              ---------------------------------------------------------------
              Business owner's main page after login. Shows:
                - Payment link they can share with customers
                - Recent payment history
                - Business profile information
              
              Also requires authentication via ProtectedRoute wrapper.
          */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* ---------------------------------------------------------------
              DYNAMIC PUBLIC ROUTE: Customer Payment Page
              ---------------------------------------------------------------
              This route has a variable in the URL: /:username
              The colon (:) means "username" is a dynamic parameter.
              
              EXAMPLES:
                - /johndoe displays payment page for user "johndoe"
                - /janebiz displays payment page for user "janebiz"
              
              Customers visit this page to pay a specific business.
              Public route - no login required for customers.
          */}
          <Route path="/:username" element={<CustomerPage />} />
          
          {/* ---------------------------------------------------------------
              PUBLIC ROUTE: Payment Processing Page
              ---------------------------------------------------------------
              After customer enters payment amount on CustomerPage, they're
              sent here to complete the payment through Coinbase Commerce.
              
              This page creates the actual payment charge and displays
              the Coinbase payment interface.
          */}
          <Route path="/payment" element={<PaymentPage />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

// ==============================================================================
// EXPORT APP COMPONENT
// ==============================================================================
// Make the App component available to other files
// This component is imported by main.jsx and rendered into the DOM
export default App;
