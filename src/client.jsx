// ==============================================================================
// SUPABASE CLIENT CONFIGURATION
// ==============================================================================
// This file creates and configures the Supabase client that connects our app
// to the Supabase backend (database + authentication service).
//
// Think of this as setting up the phone line between our app and Supabase.
// Every time we need to:
// - Log in a user
// - Fetch data from the database
// - Save new information
// - Update existing records
// We use this supabase client object.
//
// This file is imported by almost every other component in the app.
// ==============================================================================

// Import the createClient function from Supabase's JavaScript library
// This function will create our connection to Supabase
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------------------
// Environment Variables (Configuration)
// ------------------------------------------------------------------------------
// Get the Supabase URL and API key from environment variables
// Environment variables are special values that change depending on where the app runs:
// - In development: Uses local .env file
// - In production: Uses Netlify dashboard settings
//
// Why use environment variables?
// 1. Security: Keeps sensitive info out of the code
// 2. Flexibility: Can use different databases for testing vs production
// 3. Safety: No hardcoded secrets that could leak on GitHub

// VITE_SUPABASE_URL: The address of our Supabase project (like a website URL)
// If not set, falls back to the hardcoded URL as a safety measure
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ciymlfapbhcibaycfdzo.supabase.co';

// VITE_SUPABASE_ANON_KEY: The "anonymous" API key for Supabase
// This is a PUBLIC key (safe to expose) that allows read-only access
// Supabase uses Row Level Security (RLS) to protect data even with this key
// If not set, uses 'temp-key' placeholder (won't work, but prevents crashes)
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'temp-key';

// ------------------------------------------------------------------------------
// Create the Supabase Client
// ------------------------------------------------------------------------------
// This creates the actual connection to Supabase with specific settings
const supabase = createClient(supabaseUrl, supabaseKey, {
  // Auth configuration - how authentication sessions are handled
  auth: {
    // autoRefreshToken: Automatically refresh the login token before it expires
    // This keeps users logged in without them noticing (like staying logged into Gmail)
    autoRefreshToken: true,
    
    // persistSession: Save the login session to browser storage
    // This means users stay logged in even if they close the browser tab
    // Session is stored in localStorage (check browser DevTools > Application > Local Storage)
    persistSession: true,
    
    // detectSessionInUrl: Disabled — PasswordResetConfirm manually calls
    // exchangeCodeForSession(code) so there is no race between the singleton
    // client auto-processing the code and the component subscribing to events.
    detectSessionInUrl: false,
    
    // flowType: Use PKCE (Proof Key for Code Exchange) for extra security
    // PKCE is a security enhancement for OAuth flows
    // It prevents attackers from intercepting authorization codes
    // Think of it like requiring both a key AND a secret password to open a door
    flowType: 'pkce'
  }
});

// ------------------------------------------------------------------------------
// Export the Client
// ------------------------------------------------------------------------------
// Export this supabase client so other files can import and use it
// Example usage in other files:
//   import supabase from './client.jsx';
//   const { data, error } = await supabase.from('profiles').select('*');
export default supabase