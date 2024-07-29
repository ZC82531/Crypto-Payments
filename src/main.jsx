// ==============================================================================
// APPLICATION ENTRY POINT (MAIN.JSX)
// ==============================================================================
// This is the VERY FIRST file that runs when the app starts.
// It's like the ignition that starts the car engine.
//
// What happens here:
// 1. Import React and ReactDOM (the core React libraries)
// 2. Import our main App component (which contains all routes)
// 3. Find the HTML element with id="root" in index.html
// 4. Render (display) our entire React app inside that element
// 5. Wrap everything in BrowserRouter to enable page navigation
//
// After this file runs, React takes over and manages the entire UI.
// ==============================================================================

// ------------------------------------------------------------------------------
// Core React Imports
// ------------------------------------------------------------------------------
// React: The main React library for building components
import React from 'react'

// ReactDOM: The bridge between React and the browser's DOM (Document Object Model)
// The DOM is the tree structure of HTML elements that the browser displays
// ReactDOM lets React manipulate and update the DOM efficiently
import ReactDOM from 'react-dom/client'

// ------------------------------------------------------------------------------
// Application Imports
// ------------------------------------------------------------------------------
// Our main App component that contains all the routes and pages
import App from './App.jsx'

// Global CSS styles that apply to the entire application
import './index.css'

// BrowserRouter: Enables client-side routing (changing pages without reloading)
// This is what lets us navigate from /login to /dashboard without a full page refresh
import { BrowserRouter } from 'react-router-dom';

// ------------------------------------------------------------------------------
// Render the Application
// ------------------------------------------------------------------------------
// Step 1: Find the HTML element with id="root"
// In public/index.html, there's a <div id="root"></div>
// This is the mounting point where our entire React app will live
//
// Step 2: createRoot() creates a React "root" - a container for the app
// This is the new React 18 way of rendering apps (replaces the old ReactDOM.render)
//
// Step 3: .render() actually displays our app in the browser
ReactDOM.createRoot(document.getElementById("root")).render(
  // React.StrictMode: A development tool that helps catch bugs
  // It runs certain code twice to detect side effects and issues
  // Only active in development, automatically removed in production builds
  // Think of it as a "code quality checker" that runs while you're developing
  <React.StrictMode>
    {/* BrowserRouter: Enables routing throughout the app */}
    {/* Without this, React Router wouldn't work and we couldn't navigate pages */}
    {/* It listens to URL changes and tells React which component to show */}
    <BrowserRouter>
      {/* App: Our main application component */}
      {/* This renders everything - all routes, pages, and components */}
      {/* Check App.jsx to see all the routes defined */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);