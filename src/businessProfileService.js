// ==============================================================================
// BUSINESS PROFILE SERVICE - Direct Supabase Database Operations
// ==============================================================================
// This file provides functions to manage business profiles directly through
// Supabase from the frontend. It's an alternative to using the backend API.
//
// WHAT IS A BUSINESS PROFILE?
// A business profile contains the bank account information where a business
// wants to receive payments:
//   - Business name
//   - Bank routing number (9 digits)
//   - Bank account number
//
// WHY TWO APPROACHES?
// We have both frontend (this file) and backend (api-server.js) approaches:
//   - Frontend approach: Simpler, works with Supabase anon key
//   - Backend approach: More secure, encrypts sensitive data
//
// THIS FILE USES:
// - Supabase client with anon key (less secure but simpler)
// - Row Level Security (RLS) policies ensure users can only access their own data
// - Direct database queries from frontend
//
// SECURITY NOTE:
// In production, the backend approach with encryption is more secure.
// This approach is provided for development or if backend isn't available.

// ------------------------------------------------------------------------------
// Required Libraries
// ------------------------------------------------------------------------------
// Supabase client for database operations
import supabase from './client.jsx';

// ==============================================================================
// GET BUSINESS PROFILE - Retrieve User's Bank Account Info
// ==============================================================================
// Fetches the business profile for the currently logged-in user from the database.
//
// RETURNS:
//   - Business profile object if found
//   - null if no profile exists yet
//   - Throws error if not authenticated or database error occurs
//
// DATABASE TABLE: business_profiles
// COLUMNS: user_id, business_name, routing_number, account_number, created_at, updated_at
//
// SECURITY:
// Row Level Security (RLS) ensures users can only see their own profile
export async function getBusinessProfile() {
  try {
    // --------------------------------------------------------------------------
    // Step 1: Verify User is Authenticated
    // --------------------------------------------------------------------------
    // Get the currently logged-in user from Supabase auth
    // This checks the session token stored in browser
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // If there's an error or no user, they're not logged in
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    // --------------------------------------------------------------------------
    // Step 2: Query Database for Business Profile
    // --------------------------------------------------------------------------
    // Build and execute a SELECT query
    //
    // QUERY BREAKDOWN:
    //   .from('business_profiles'): Which table to query
    //   .select('*'): Get all columns
    //   .eq('user_id', user.id): WHERE user_id = current user's id
    //   .maybeSingle(): Return single row or null (instead of array)
    //
    // maybeSingle() vs single():
    //   - single(): Throws error if no rows found
    //   - maybeSingle(): Returns null if no rows found (better for optional data)
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Step 3: Handle Database Errors
    if (error) {
      console.error('Error fetching business profile:', error);
      throw error;
    }

    // Step 4: Return the Profile Data
    // Will be null if no profile exists, or object with profile data
    return data;
    
  } catch (error) {
    // --------------------------------------------------------------------------
    // Error Handling
    // --------------------------------------------------------------------------
    // Log the error for debugging
    console.error('getBusinessProfile error:', error);
    
    // Re-throw so calling code can handle it
    throw error;
  }
}

// ==============================================================================
// SAVE BUSINESS PROFILE - Create or Update Bank Account Info
// ==============================================================================
// Saves business profile to the database. Automatically determines whether to
// create a new profile or update an existing one.
//
// PARAMETERS:
//   businessData: Object with business_name, routing_number, account_number
//
// RETURNS:
//   - Saved business profile object
//   - Throws error if not authenticated or database error occurs
//
// UPSERT LOGIC:
// 1. Check if profile already exists
// 2. If exists: UPDATE the existing row
// 3. If doesn't exist: INSERT a new row
//
// WHY UPSERT?
// Users might visit the setup page multiple times. First time creates profile,
// subsequent times update it. This function handles both cases.
export async function saveBusinessProfile(businessData) {
  try {
    // --------------------------------------------------------------------------
    // Step 1: Verify User is Authenticated
    // --------------------------------------------------------------------------
    // Get the currently logged-in user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Not logged in? Can't save profile
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    // --------------------------------------------------------------------------
    // Step 2: Extract Business Data
    // --------------------------------------------------------------------------
    // Destructure (pull out) the specific fields we need from businessData
    const { business_name, routing_number, account_number } = businessData;

    // --------------------------------------------------------------------------
    // Step 3: Check if Profile Already Exists
    // --------------------------------------------------------------------------
    // Call getBusinessProfile to see if user has a profile already
    // Returns profile object or null
    const existingProfile = await getBusinessProfile();

    // --------------------------------------------------------------------------
    // Step 4: UPDATE or INSERT Based on Existence
    // --------------------------------------------------------------------------
    let result;
    
    if (existingProfile) {
      // ========================================================================
      // CASE 1: Profile Exists - UPDATE
      // ========================================================================
      // User already has a profile, so we update the existing row
      //
      // UPDATE QUERY:
      //   .from('business_profiles'): Which table
      //   .update({...}): Set these columns to new values
      //   .eq('user_id', user.id): WHERE user_id = current user
      //   .select(): Return the updated row
      //   .single(): Expect exactly one row back
      result = await supabase
        .from('business_profiles')
        .update({
          business_name,                        // Update business name
          routing_number,                       // Update routing number
          account_number,                       // Update account number
          updated_at: new Date().toISOString()  // Record when updated
        })
        .eq('user_id', user.id)
        .select()
        .single();
    } else {
      // ========================================================================
      // CASE 2: No Profile - INSERT
      // ========================================================================
      // User doesn't have a profile yet, so create a new row
      //
      // INSERT QUERY:
      //   .from('business_profiles'): Which table
      //   .insert({...}): Insert a new row with these values
      //   .select(): Return the newly created row
      //   .single(): Expect exactly one row back
      //
      // NOTE: created_at is auto-set by database default
      result = await supabase
        .from('business_profiles')
        .insert({
          user_id: user.id,      // Link profile to this user
          business_name,         // Business name from form
          routing_number,        // Routing number from form
          account_number         // Account number from form
        })
        .select()
        .single();
    }

    // --------------------------------------------------------------------------
    // Step 5: Check for Database Errors
    // --------------------------------------------------------------------------
    // result.error will be set if the database operation failed
    if (result.error) {
      console.error('Error saving business profile:', result.error);
      throw result.error;
    }

    // --------------------------------------------------------------------------
    // Step 6: Return Saved Profile
    // --------------------------------------------------------------------------
    // Return the profile data that was just saved
    // Calling code can use this to update UI or show success message
    return result.data;
    
  } catch (error) {
    // --------------------------------------------------------------------------
    // Error Handling
    // --------------------------------------------------------------------------
    // Log error for debugging
    console.error('saveBusinessProfile error:', error);
    
    // Re-throw so calling code can handle it (show error message to user)
    throw error;
  }
}

// ==============================================================================
// DELETE BUSINESS PROFILE - Remove Bank Account Info
// ==============================================================================
// Deletes the business profile for the currently logged-in user.
// Use this if user wants to remove their bank account information.
//
// RETURNS:
//   - true if deletion succeeded
//   - Throws error if not authenticated or database error occurs
//
// SECURITY:
// Row Level Security (RLS) ensures users can only delete their own profile
export async function deleteBusinessProfile() {
  try {
    // --------------------------------------------------------------------------
    // Step 1: Verify User is Authenticated
    // --------------------------------------------------------------------------
    // Get the currently logged-in user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Not logged in? Can't delete profile
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    // --------------------------------------------------------------------------
    // Step 2: Delete Profile from Database
    // --------------------------------------------------------------------------
    // Execute DELETE query
    //
    // DELETE QUERY:
    //   .from('business_profiles'): Which table
    //   .delete(): Perform delete operation
    //   .eq('user_id', user.id): WHERE user_id = current user
    //
    // RLS SECURITY:
    // Even though we specify user_id, Supabase's RLS policies double-check
    // that the authenticated user can only delete their own data
    const { error } = await supabase
      .from('business_profiles')
      .delete()
      .eq('user_id', user.id);

    // Step 3: Check for Database Errors
    if (error) {
      console.error('Error deleting business profile:', error);
      throw error;
    }

    // Step 4: Return Success
    // Return true to indicate deletion succeeded
    return true;
    
  } catch (error) {
    // --------------------------------------------------------------------------
    // Error Handling
    // --------------------------------------------------------------------------
    // Log error for debugging
    console.error('deleteBusinessProfile error:', error);
    
    // Re-throw so calling code can handle it
    throw error;
  }
}
