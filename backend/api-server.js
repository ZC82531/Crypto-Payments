// ==============================================================================
// CRYPTO PAYMENTS API SERVER
// ==============================================================================
// This is the main backend server that powers the entire payment platform.
// Think of it as the brain that handles all the secure operations:
// - Checking if users are who they say they are (authentication)
// - Storing merchant bank info securely (with encryption)
// - Creating payment records when customers pay
// - Talking to Coinbase to process crypto payments

// ==============================================================================
// STEP 1: Import all the tools we need
// ==============================================================================

// Express: The web server framework - handles incoming requests from the frontend
const express = require('express');

// Dotenv: Reads the .env file to get secret keys and configuration
// This keeps sensitive info out of the code itself
const dotenv = require('dotenv');

// CORS: Allows the frontend (on a different domain) to talk to this backend
// Without this, browsers block requests for security
const cors = require('cors');

// Crypto: Node's built-in encryption library - scrambles sensitive data
// We use this to encrypt bank account numbers before storing them
const crypto = require('crypto');

// Path: Helps us find files on the server
const path = require('path');

// Supabase Client: Connects to our Supabase database
// Supabase gives us both a database (PostgreSQL) and user authentication
const { createClient } = require('@supabase/supabase-js');

// node-fetch is available in Node 18+; using built-in fetch (Node 25 has it natively)

// ==============================================================================
// STEP 2: Load configuration from environment variables
// ==============================================================================

// This reads the .env file in this folder and makes those values available
// Example: process.env.PORT gives us the port number from .env
dotenv.config({ path: path.join(__dirname, '.env') });

// Create the Express app - this will handle all HTTP requests
const app = express();

// Set the port - use environment variable if set, otherwise default to 3001
// In production (like Render), the PORT is provided automatically
const PORT = process.env.PORT || 3001;

// Parse the allowed frontend URLs from environment
// CORS_ORIGINS in .env looks like: "http://localhost:5173,https://myapp.com"
// We split by comma and trim whitespace to get an array of allowed origins
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];  // Defaults for local dev

// ==============================================================================
// STEP 3: Set up middleware (processes every request before routes)
// ==============================================================================

// Enable CORS - this tells browsers "yes, the frontend can talk to this API"
app.use(cors({
  origin: corsOrigins,     // Only these domains can make requests
  credentials: true        // Allow cookies and auth headers to be sent
}));

// Parse JSON request bodies - converts incoming JSON to JavaScript objects
// When frontend sends { "amount": 25 }, this makes it accessible as req.body.amount
app.use(express.json());

// ==============================================================================
// STEP 4: Connect to Supabase database
// ==============================================================================

// Create a Supabase client with the SERVICE ROLE key
// 
// Why service role key instead of anon key?
// - Service role key can do ANYTHING in the database (like an admin)
// - It bypasses Row Level Security (RLS) rules
// - Frontend uses anon key which respects security rules
// - This key must NEVER be exposed to the frontend!
//
// What can this client do?
// - Read/write to any table regardless of RLS
// - Create/delete users
// - Access all payment records across all merchants
const supabase = createClient(
  process.env.SUPABASE_URL,              // Your Supabase project URL
  process.env.SUPABASE_SERVICE_ROLE_KEY, // The powerful admin key
  {
    auth: {
      autoRefreshToken: false,  // Server doesn't need token refresh
      persistSession: false     // Server doesn't save user sessions
    }
  }
);

// ==============================================================================
// ENCRYPTION FUNCTIONS
// ==============================================================================
// We encrypt bank account and routing numbers before saving to database.
// Even if someone hacks the database, they can't read the encrypted data
// without the encryption key (stored separately in environment variables).

// ------------------------------------------------------------------------------
// Encrypt sensitive text (like bank account number)
// ------------------------------------------------------------------------------
function encryptData(text) {
  // If nothing to encrypt, just return null
  if (!text) return null;
  
  try {
    // Define the encryption algorithm we're using
    // AES-256-CBC is military-grade encryption - very secure
    // "256" = key length in bits, "CBC" = cipher block chaining mode
    const algorithm = 'aes-256-cbc';
    
    // Get the encryption key from environment and convert from hex string to binary
    // The key is like a password - without it, encrypted data can't be read
    // It's stored in .env as a 64-character hex string (32 bytes in binary)
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    
    // Generate a random IV (Initialization Vector) - 16 bytes
    // Think of IV like a random "salt" for each encryption
    // Even if we encrypt the same text twice, different IVs make the output different
    // This prevents attackers from seeing patterns in encrypted data
    const iv = crypto.randomBytes(16);
    
    // Create the cipher object - this is what actually does the encryption
    // It needs: the algorithm, the secret key, and the random IV
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    // Encrypt the text in two steps:
    // 1. Update: process the main text (input as utf8, output as hex)
    let encrypted = cipher.update(text, 'utf8', 'hex');
    // 2. Final: process any remaining data and finish encryption
    encrypted += cipher.final('hex');
    
    // Return both the IV and encrypted data, separated by colon
    // Format: "IV:ENCRYPTED_DATA" (both in hex)
    // We need to save the IV because we need it to decrypt later!
    // Example output: "a1b2c3d4e5f6....:9f8e7d6c5b4a...."
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('❌ Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

// ------------------------------------------------------------------------------
// Decrypt encrypted text back to plain text
// ------------------------------------------------------------------------------
function decryptData(encryptedText) {
  // If nothing to decrypt, just return null
  if (!encryptedText) return null;
  
  try {
    // Check if data is actually encrypted
    // Our encrypted format is "IV:DATA" so it must contain a colon
    // If no colon, it's probably old unencrypted data
    if (!encryptedText.includes(':')) {
      console.log('⚠️  Data appears to be unencrypted');
      return encryptedText;  // Return as-is for backwards compatibility
    }
    
    // Use the same algorithm we used to encrypt
    const algorithm = 'aes-256-cbc';
    
    // Get the same encryption key from environment
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    
    // Split the encrypted text at the colon to separate IV and data
    // Remember encrypt returns "IV:DATA", so parts[0]=IV, parts[1]=DATA
    const parts = encryptedText.split(':');
    
    // Validate we got exactly 2 parts (IV and encrypted data)
    if (parts.length !== 2) {
      console.log('⚠️  Invalid encrypted format - expected IV:DATA');
      return encryptedText;  // Return as-is if format is wrong
    }
    
    // Extract the IV (first part) and convert from hex back to binary
    const iv = Buffer.from(parts[0], 'hex');
    
    // Extract the encrypted data (second part) - keep as hex string for now
    const encrypted = parts[1];
    
    // Validate IV is correct length (must be exactly 16 bytes)
    // If IV is wrong length, something's corrupted
    if (iv.length !== 16) {
      console.log('⚠️  Invalid IV length - expected 16 bytes, got', iv.length);
      return encryptedText;
    }
    
    // Create the decipher object - does the opposite of cipher
    // Needs the same algorithm, key, and IV that were used to encrypt
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    
    // Decrypt in two steps (reverse of encryption):
    // 1. Update: process the encrypted data (input as hex, output as utf8)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    // 2. Final: process any remaining data and finish decryption
    decrypted += decipher.final('utf8');
    
    // Return the original plain text!
    return decrypted;
  } catch (error) {
    // If decryption fails, log error and return data as-is
    // Might be old unencrypted data from before we added encryption
    console.error('❌ Decryption error:', error.message);
    return encryptedText;
  }
}

// ------------------------------------------------------------------------------
// Helper: Get last 4 digits of sensitive data for safe logging
// ------------------------------------------------------------------------------
// When logging, we never want to show full account numbers
// This function returns just the last 4 digits (like ***1234)
function getLast4Digits(value) {
  // If no value or too short, just return asterisks
  if (!value || value.length < 4) return '****';
  
  // Slice off the last 4 characters and return them
  // Example: "1234567890" becomes "7890"
  return value.slice(-4);
}

// ==============================================================================
// AUTHENTICATION MIDDLEWARE
// ==============================================================================
// This function runs BEFORE protected routes to verify the user is logged in
// Think of it like a bouncer checking IDs before letting people into a club

// ------------------------------------------------------------------------------
// Check if request has valid JWT token from Supabase
// ------------------------------------------------------------------------------
const authenticateToken = async (req, res, next) => {
  // Step 1: Extract the Authorization header from the request
  // Frontend sends: "Authorization: Bearer eyJhbGciOiJIUzI1..."
  // We need to grab just the token part (after "Bearer ")
  const authHeader = req.headers['authorization'];
  
  // Split by space and get the second part (the actual token)
  // authHeader.split(' ') gives us ["Bearer", "actual_token_here"]
  // We want index [1] which is the token
  const token = authHeader && authHeader.split(' ')[1];
  
  // Step 2: Check if token was actually provided
  if (!token) {
    // No token = no access! Send 401 Unauthorized error
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Step 3: Ask Supabase "is this token valid?"
    // getUser() checks if the token is:
    // - Not expired
    // - Has a valid signature
    // - Belongs to a real user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    // Step 4: Check the response from Supabase
    if (error || !user) {
      // Token is invalid or expired - reject the request
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    // Attach user to request so downstream route handlers can access it
    req.user = user;
    next();
  } catch (error) {
    // If something unexpected happens, log it and reject the request
    console.error('❌ Token verification error:', error);
    return res.status(403).json({ error: 'Token verification failed' });
  }
};

// ==============================================================================
// BASIC ROUTES
// ==============================================================================
// These are simple endpoints for checking if the server is alive

// ------------------------------------------------------------------------------
// Health check endpoint - just confirms server is running
// ------------------------------------------------------------------------------
// URL: GET /
// Auth: None (public)
// Purpose: Deployment tools and monitoring services ping this to check server status
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Crypto Payments API is running',
    timestamp: new Date().toISOString()  // When this response was sent
  });
});

// ------------------------------------------------------------------------------
// Validate if user token is still valid
// ------------------------------------------------------------------------------
// URL: POST /validate-user
// Auth: Required (uses authenticateToken middleware)
// Purpose: Frontend can call this to check if user is still logged in
app.post('/validate-user', authenticateToken, (req, res) => {
  // If we got here, authenticateToken already verified the token is valid
  // So we just return success with the user info
  res.json({ 
    message: 'User is valid', 
    user: req.user,  // The user object attached by authenticateToken
    valid: true 
  });
});

// ==============================================================================
// BUSINESS PROFILE ROUTES (AUTHENTICATED)
// ==============================================================================
// These routes let merchants manage their business info and banking details
// All require authentication - only the merchant can see/edit their own profile

// ------------------------------------------------------------------------------
// GET: Fetch the logged-in merchant's business profile
// ------------------------------------------------------------------------------
// URL: GET /api/business-profile
// Auth: Required
// Returns: Business profile with DECRYPTED banking info
//
// What happens:
// 1. Check who's logged in (from authenticateToken middleware)
// 2. Look up their business profile in database
// 3. Decrypt the bank account numbers
// 4. Send back to frontend
app.get('/api/business-profile', authenticateToken, async (req, res) => {
  try {
    console.log('📥 Fetching business profile for user:', req.user.id);
    
    // Query business profile from database
    // maybeSingle() returns null if not found (instead of throwing error)
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();
    
    // Handle database errors
    if (error) {
      console.error('❌ Error fetching business profile:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch business profile', 
        details: error.message 
      });
    }
    
    // No profile found - user hasn't set up their business yet
    if (!data) {
      console.log('ℹ️  No business profile found for user:', req.user.id);
      return res.status(200).json({ business_profile: null });
    }
    
    console.log('✅ Business profile found');
    
    // Decrypt sensitive banking data before sending to frontend
    try {
      const decryptedProfile = {
        id: data.id,
        user_id: data.user_id,
        business_name: data.business_name,
        routing_number: decryptData(data.routing_number),    // Decrypt routing number
        account_number: decryptData(data.account_number),    // Decrypt account number
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      
      console.log('✅ Banking data decrypted successfully');
      
      // Return decrypted profile
      res.status(200).json({ 
        business_profile: decryptedProfile,
        has_account: !!decryptedProfile.routing_number && !!decryptedProfile.account_number
      });
    } catch (decryptError) {
      console.error('❌ Error decrypting business profile:', decryptError);
      // Fallback: Return encrypted data if decryption fails (backwards compatibility)
      console.log('⚠️  Returning profile without decryption');
      res.status(200).json({ 
        business_profile: data,
        has_account: !!data.routing_number && !!data.account_number,
        warning: 'Data may not be encrypted'
      });
    }
  } catch (error) {
    console.error('💥 Error in getBusinessProfile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Create or update business profile
 * POST /api/business-profile
 * 
 * Purpose: Save merchant's business information with encrypted banking details
 * Auth: Required (JWT token)
 * Body: { business_name, routing_number, account_number }
 * 
 * Flow:
 * 1. Validate all required fields are present
 * 2. Encrypt sensitive banking data (routing & account numbers)
 * 3. Check if profile already exists for this user
 * 4. Update existing profile OR create new profile
 * 5. Return decrypted profile to frontend
 * 
 * Security:
 * - Banking data is encrypted before storage
 * - Only the owning user can create/update their profile
 * - Encryption key never leaves the server
 */
app.post('/api/business-profile', authenticateToken, async (req, res) => {
  try {
    const { business_name, routing_number, account_number } = req.body;
    
    // Validate all required fields are provided
    if (!business_name || !routing_number || !account_number) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    console.log('💾 Saving business profile for user:', req.user.id);
    console.log('   Business data:', { 
      business_name, 
      routing_number: `****${getLast4Digits(routing_number)}`,  // Only log last 4 digits for security
      account_number: `****${getLast4Digits(account_number)}` 
    });
    
    // Encrypt sensitive banking data before storing in database
    let encryptedRoutingNumber, encryptedAccountNumber;
    try {
      encryptedRoutingNumber = encryptData(routing_number);
      encryptedAccountNumber = encryptData(account_number);
      console.log('✅ Banking data encrypted successfully');
    } catch (encryptError) {
      console.error('❌ Encryption error:', encryptError);
      return res.status(500).json({ 
        error: 'Failed to encrypt banking data',
        details: encryptError.message
      });
    }
    
    // Check if user already has a business profile
    const { data: existingProfile } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', req.user.id)
      .maybeSingle();
    
    let result;
    if (existingProfile) {
      // UPDATE existing profile
      console.log('📝 Updating existing business profile:', existingProfile.id);
      result = await supabase
        .from('business_profiles')
        .update({
          business_name,
          routing_number: encryptedRoutingNumber,    // Store encrypted
          account_number: encryptedAccountNumber,     // Store encrypted
          updated_at: new Date().toISOString()
        })
        .eq('user_id', req.user.id)
        .select()
        .single();
    } else {
      // CREATE new profile
      console.log('✨ Creating new business profile for user:', req.user.id);
      result = await supabase
        .from('business_profiles')
        .insert({
          user_id: req.user.id,
          business_name,
          routing_number: encryptedRoutingNumber,    // Store encrypted
          account_number: encryptedAccountNumber      // Store encrypted
        })
        .select()
        .single();
    }
    
    // Handle database errors
    if (result.error) {
      console.error('❌ Error saving business profile:', result.error);
      return res.status(500).json({ 
        error: 'Failed to save business profile',
        details: result.error.message
      });
    }
    
    console.log('✅ Business profile saved successfully');
    
    // Decrypt data before sending back to frontend
    const savedProfile = result.data;
    const decryptedProfile = {
      id: savedProfile.id,
      business_name: savedProfile.business_name,
      routing_number: decryptData(savedProfile.routing_number),    // Decrypt for response
      account_number: decryptData(savedProfile.account_number),    // Decrypt for response
      created_at: savedProfile.created_at,
      updated_at: savedProfile.updated_at
    };
    
    // Return success with decrypted data
    res.status(200).json({
      message: 'Business profile saved successfully',
      business_profile: decryptedProfile
    });
  } catch (error) {
    console.error('💥 Error in saveBusinessProfile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// PUBLIC API ROUTES
// ============================================
/**
 * These endpoints do NOT require authentication
 * Used by customer-facing pages to look up merchant information
 * 
 * SECURITY NOTE: Only public, non-sensitive data is returned
 * Banking details are NEVER exposed through these endpoints
 */

/**
 * Get business name by merchant email (PUBLIC ENDPOINT)
 * GET /api/public/business-profile/:email
 * 
 * Purpose: Allow customers to verify which business they're paying
 * Auth: None (public endpoint)
 * Params: email - Merchant's email address
 * Returns: business_name only (no banking info)
 * 
 * Use case:
 * 1. Customer scans QR code with merchant email encoded
 * 2. Payment page calls this endpoint to display business name
 * 3. Customer confirms they're paying the right business
 * 
 * Flow:
 * 1. Receive merchant email from URL parameter
 * 2. Look up user in Supabase Auth by email
 * 3. Find business profile for that user
 * 4. Return ONLY the business name (not banking details)
 * 
 * Example: GET /api/public/business-profile/merchant@example.com
 * Response: { business_name: "Joe's Coffee Shop" }
 */
app.get('/api/public/business-profile/:email', async (req, res) => {
  try {
    // Extract email from URL parameter
    const email = req.params.email;
    
    console.log('\n===========================================');
    console.log('📥 PUBLIC API: Looking up business profile');
    console.log('📧 Merchant Email:', email);
    
    // Validate email parameter is provided
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    // STEP 1: Find user by email in Supabase Auth
    // Note: Supabase doesn't have a direct "find by email" method for admin,
    // so we list all users and filter by email
    console.log('🔍 Step 1: Fetching users from Supabase Auth...');
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    
    // Handle errors from Supabase Auth
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to list users' });
    }
    
    console.log('✅ Got users list, count:', usersData?.users?.length || 0);
    console.log('📋 Available user emails:', usersData?.users?.map(u => u.email) || []);
    
    // Find the specific user by email address
    const user = usersData?.users?.find(u => u.email === email);
    
    // User not found - email doesn't exist in the system
    if (!user) {
      console.log('❌ USER NOT FOUND for email:', email);
      return res.status(404).json({ 
        error: 'User not found',
        email: email,
        available_users: usersData?.users?.map(u => u.email) || []
      });
    }
    
    console.log('✅ FOUND USER!');
    console.log('   User ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Created:', user.created_at);
    
    // STEP 2: Look up business profile using the user_id
    console.log('🔍 Step 2: Looking up business profile for user_id:', user.id);
    
    const { data: profileData, error: profileError } = await supabase
      .from('business_profiles')
      .select('*')                      // Get all fields
      .eq('user_id', user.id)           // Match by user ID
      .maybeSingle();                   // Return null if not found (instead of error)
    
    // Handle database errors
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Profile not found - user exists but hasn't set up business yet
    if (!profileData) {
      console.log('❌ NO BUSINESS PROFILE found for user_id:', user.id);
      return res.status(404).json({ 
        error: 'Business profile not found',
        user_id: user.id,
        message: 'User exists but has no business profile'
      });
    }
    
    console.log('✅ FOUND BUSINESS PROFILE!');
    console.log('   Business Name:', profileData.business_name);
    console.log('   Profile ID:', profileData.id);
    console.log('===========================================\n');
    
    // Return SUCCESS with ONLY business name (no banking details!)
    // This is safe to expose publicly since it's just the business name
    return res.status(200).json({
      success: true,
      business_name: profileData.business_name,  // Only public info
      email: email,
      user_id: user.id,
      profile_id: profileData.id
    });
    
  } catch (error) {
    console.error('💥 ERROR in public business profile lookup:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Server error' });
  }
});


/**
 * Create payment record (PUBLIC endpoint - called when customer initiates payment)
 * POST /api/payments/create
 * 
 * Purpose: Log a new payment attempt in the database
 * Auth: None (public endpoint - called from customer payment page)
 * Body: { merchantEmail, merchantUserId, customerEmail, amount, coinbaseChargeId }
 * 
 * Flow:
 * 1. Customer enters payment amount on payment page
 * 2. Frontend creates Coinbase Commerce charge
 * 3. Frontend calls this endpoint to log payment in our database
 * 4. Returns payment record with pending status
 * 5. Status gets updated later via Coinbase webhook
 * 
 * Why is this public?
 * - Customers don't have accounts/auth tokens
 * - We need to log payments from anonymous customers
 * - Validation ensures only legitimate payment data is accepted
 */
app.post('/api/payments/create', async (req, res) => {
  try {
    // Extract payment data from request body
    const { 
      merchantEmail,        // Who is receiving the payment
      merchantUserId,       // Merchant's user ID in our system
      customerEmail,        // Who is making the payment
      amount,               // Payment amount in USD
      coinbaseChargeId      // Unique ID from Coinbase Commerce
    } = req.body;
    
    // Validate all required fields are present
    if (!merchantEmail || !customerEmail || !amount || !merchantUserId) {
      return res.status(400).json({ 
        error: 'Missing required fields: merchantEmail, merchantUserId, customerEmail, amount' 
      });
    }

    // Validate amount is a positive number
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    console.log('📝 Creating payment record:', {
      merchantEmail,
      merchantUserId,
      customerEmail,
      amount,
      coinbaseChargeId
    });
    
    // Insert new payment record into database
    // Initial status is 'pending' - will be updated by Coinbase webhook
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        merchant_user_id: merchantUserId,      // Link to merchant's account
        merchant_email: merchantEmail,          // For easy lookup
        customer_email: customerEmail,          // Track who paid
        amount: parseFloat(amount),             // Ensure decimal format
        coinbase_charge_id: coinbaseChargeId,  // Link to Coinbase charge
        status: 'pending'                       // Initial status (updated by webhook)
      }])
      .select()      // Return the created record
      .single();     // Expect single record
    
    // Handle database errors
    if (error) {
      console.error('❌ Error creating payment record:', error);
      return res.status(500).json({ 
        error: 'Failed to create payment record',
        details: error.message 
      });
    }
    
    console.log('✅ Payment record created:', data);
    
    // Return success with payment details
    res.status(201).json({ 
      success: true,
      payment: {
        id: data.id,
        status: data.status,
        created_at: data.created_at
      }
    });
    
  } catch (error) {
    console.error('💥 Error in payment creation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Coinbase Commerce webhook endpoint
 * POST /api/payments/coinbase-webhook
 * 
 * Purpose: Receive real-time payment status updates from Coinbase Commerce
 * Auth: None (Coinbase sends requests to this endpoint)
 * Body: Coinbase event payload with payment status
 * 
 * How it works:
 * 1. Customer completes payment on Coinbase Commerce
 * 2. Coinbase sends webhook event to this endpoint
 * 3. We extract the charge ID and new status from the event
 * 4. Update our payment record in the database
 * 5. Merchant dashboard automatically shows updated status
 * 
 * Event types:
 * - charge:pending - Payment initiated
 * - charge:confirmed - Payment confirmed (update to 'completed')
 * - charge:resolved - Payment resolved (update to 'completed')
 * - charge:failed - Payment failed
 * - charge:delayed - Payment delayed (stays 'pending')
 * 
 * Security note:
 * In production, you should verify the webhook signature
 * to ensure requests are actually from Coinbase
 */
app.post('/api/payments/coinbase-webhook', async (req, res) => {
  try {
    console.log('🔔 Coinbase webhook received:', req.body);
    
    const event = req.body;
    
    // Validate webhook payload structure
    // Coinbase sends events with this structure:
    // { event: { type: 'charge:confirmed', data: { code, id, ... } } }
    
    if (!event || !event.event) {
      console.log('⚠️  Invalid webhook payload');
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }
    
    // Extract event details
    const eventType = event.event.type;    // e.g., "charge:confirmed"
    const chargeData = event.event.data;   // Payment details
    const chargeId = chargeData.id;        // Unique charge identifier
    
    console.log(`📊 Event type: ${eventType}, Charge ID: ${chargeId}`);
    
    // Map Coinbase event types to our payment statuses
    let newStatus = 'pending';
    let completedAt = null;
    
    switch (eventType) {
      case 'charge:confirmed':
      case 'charge:resolved':
        // Payment successful - mark as completed
        newStatus = 'completed';
        completedAt = new Date().toISOString();
        break;
      case 'charge:failed':
        // Payment failed
        newStatus = 'failed';
        break;
      case 'charge:delayed':
        // Payment delayed - keep as pending
        newStatus = 'pending';
        break;
      case 'charge:pending':
        // Payment initiated - keep as pending
        newStatus = 'pending';
        break;
      default:
        // Unknown event type - log but don't fail
        console.log(`ℹ️  Unhandled event type: ${eventType}`);
    }
    
    // Prepare update data
    const updateData = {
      status: newStatus,
      coinbase_payment_id: chargeData.code || chargeId  // Store payment code
    };
    
    // Add completion timestamp if payment is completed
    if (completedAt) {
      updateData.completed_at = completedAt;
    }
    
    // Update payment status in database
    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('coinbase_charge_id', chargeId)  // Find by Coinbase charge ID
      .select();
    
    // Handle database errors
    if (error) {
      console.error('❌ Error updating payment status:', error);
      return res.status(500).json({ error: 'Failed to update payment' });
    }
    
    // Check if payment was found and updated
    if (data && data.length > 0) {
      console.log('✅ Payment updated:', data[0]);
      res.status(200).json({ success: true, payment: data[0] });
    } else {
      console.log('⚠️  No payment found with charge ID:', chargeId);
      res.status(404).json({ error: 'Payment not found' });
    }
    
  } catch (error) {
    console.error('💥 Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get merchant's payment history (AUTHENTICATED)
 * GET /api/payments/history
 * 
 * Purpose: Retrieve all payments for the logged-in merchant
 * Auth: Required (JWT token)
 * Returns: Array of payment records sorted by date (newest first)
 * 
 * Use case:
 * - Merchant dashboard displays payment history
 * - Shows all payments received by this merchant
 * - Includes status, amount, customer info, timestamps
 * 
 * Security:
 * - Only returns payments for the authenticated user
 * - Cannot see other merchants' payments
 */
app.get('/api/payments/history', authenticateToken, async (req, res) => {
  try {
    // Get user ID from authenticated token
    const userId = req.user.id;
    
    console.log('📜 Fetching payment history for user:', userId);
    
    // Query all payments for this merchant
    const { data, error } = await supabase
      .from('payments')
      .select('*')                                    // Get all fields
      .eq('merchant_user_id', userId)                 // Only this merchant's payments
      .order('created_at', { ascending: false })      // Newest first
      .limit(100);                                    // Max 100 records (adjust as needed)
    
    // Handle database errors
    if (error) {
      console.error('❌ Error fetching payments:', error);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }
    
    console.log(`✅ Found ${data.length} payments`);
    
    // Return payment history
    res.status(200).json({ 
      success: true,
      payments: data,
      count: data.length
    });
    
  } catch (error) {
    console.error('💥 Error in payment history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Legacy payment logging endpoint
 * POST /api/log-payment
 * 
 * Purpose: Backwards compatibility with older frontend versions
 * Auth: None (public endpoint)
 * Status: DEPRECATED - use /api/payments/create instead
 * 
 * Note: Kept for backwards compatibility but doesn't actually store data
 * Returns success to prevent breaking old frontend implementations
 */
app.post('/api/log-payment', async (req, res) => {
  try {
    const { 
      merchantEmail, 
      businessName, 
      amount, 
      chargeId, 
      chargeCode, 
      hostedUrl, 
      timestamp 
    } = req.body;
    
    // Basic validation
    if (!merchantEmail || !amount) {
      return res.status(400).json({ error: 'Merchant email and amount are required' });
    }
    
    console.log('⚠️  Legacy payment endpoint called:', {
      merchantEmail,
      businessName,
      amount,
      chargeId,
      timestamp
    });
    
    // Return success for backwards compatibility
    // In practice, use /api/payments/create for new implementations
    res.status(200).json({ 
      success: true, 
      message: 'Payment logged successfully (legacy endpoint)',
      note: 'This endpoint is deprecated. Please use /api/payments/create'
    });
    
  } catch (error) {
    console.error('Error logging payment:', error);
    res.status(500).json({ error: 'Failed to log payment' });
  }
});

/**
 * Debug endpoint - Check database table status
 * GET /api/debug/table-status
 * 
 * Purpose: Verify database setup and troubleshoot connection issues
 * Auth: None (debug endpoint)
 * Returns: Table information and sample records
 * 
 * Use cases:
 * - Verify Supabase connection is working
 * - Check if business_profiles table exists
 * - See sample data for debugging
 * 
 * Production note: Consider removing or protecting this endpoint in production
 */
app.get('/api/debug/table-status', async (req, res) => {
  try {
    // Try to query the business_profiles table
    // This will fail if table doesn't exist or connection is broken
    const { data: tableCheck, error: tableError } = await supabase
      .from('business_profiles')
      .select('count(*)', { count: 'exact', head: true });
    
    // Handle errors (likely table doesn't exist)
    if (tableError) {
      console.error('Debug: Error checking table:', tableError);
      
      // Error code 42P01 means "table does not exist"
      if (tableError.code === '42P01') {
        return res.status(404).json({ 
          error: 'Table does not exist',
          message: 'Please run the database setup SQL in Supabase dashboard',
          help: 'Check backend/db-schema.sql for the table creation script'
        });
      }
      
      // Other database error
      return res.status(500).json({ 
        error: 'Error checking table',
        message: tableError.message,
        code: tableError.code
      });
    }
    
    // Table exists! Get some sample data to verify structure
    const { data: tableInfo, error: infoError } = await supabase
      .from('business_profiles')
      .select('id, business_name, created_at')  // Only non-sensitive fields
      .limit(5);                                 // Just a few records
      
    // Handle query errors
    if (infoError) {
      return res.status(500).json({ 
        error: 'Error getting table data',
        message: infoError.message
      });
    }
    
    // Return debug information
    return res.status(200).json({
      status: 'Table exists and is accessible',
      record_count: tableCheck.count,
      sample_records: tableInfo.length,
      records: tableInfo.map(r => ({ 
        id: r.id, 
        business_name: r.business_name,
        created_at: r.created_at
      }))
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({ 
      error: 'Server error in debug endpoint',
      message: error.message
    });
  }
});

// ============================================
// SERVER STARTUP
// ============================================

/**
 * Start the Express server
 * 
 * Only starts if NOT running in Vercel serverless environment
 * (Vercel handles server startup automatically)
 * 
 * Displays:
 * - Server URL
 * - Start timestamp
 * - List of available endpoints
 */
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log('\n🚀 ============================================');
    console.log('✅ Crypto Payments API Server Running');
    console.log('🌐 URL: http://localhost:' + PORT);
    console.log('📅 Started at:', new Date().toISOString());
    console.log('============================================\n');
    console.log('📍 Available Endpoints:');
    console.log('');
    console.log('  PUBLIC ENDPOINTS (No auth required):');
    console.log('    GET  /');
    console.log('    GET  /api/public/business-profile/:email');
    console.log('    POST /api/payments/create');
    console.log('    POST /api/payments/coinbase-webhook');
    console.log('    POST /api/log-payment (deprecated)');
    console.log('    GET  /api/debug/table-status');
    console.log('    POST /api/create-charge');
    console.log('');
    console.log('  AUTHENTICATED ENDPOINTS (Require JWT token):');
    console.log('    POST /validate-user');
    console.log('    GET  /api/business-profile');
    console.log('    POST /api/business-profile');
    console.log('    GET  /api/payments/history');
    console.log('\n============================================\n');
  });
}

// ============================================
// COINBASE COMMERCE INTEGRATION
// ============================================

/**
 * Create a Coinbase Commerce charge (SECURE BACKEND ENDPOINT)
 * POST /api/create-charge
 * 
 * Purpose: Create a cryptocurrency payment charge via Coinbase Commerce
 * Auth: None (but requires valid business email)
 * Body: { amount: number, businessEmail: string }
 * 
 * Why this is on the backend:
 * - Keeps Coinbase API key secure (never exposed to frontend)
 * - Frontend cannot create charges directly
 * - Prevents API key theft and abuse
 * 
 * Flow:
 * 1. Customer enters payment amount on frontend
 * 2. Frontend calls this endpoint with amount and merchant email
 * 3. Backend creates Coinbase Commerce charge using secure API key
 * 4. Returns charge details (including hosted payment URL)
 * 5. Frontend redirects customer to Coinbase payment page
 * 
 * Coinbase Commerce:
 * - Handles the actual crypto payment processing
 * - Customer can pay with Bitcoin, Ethereum, etc.
 * - Sends webhooks when payment status changes
 * 
 * Security:
 * - API key stored in environment variable (never in code)
 * - Only backend can access the API key
 * - Amount validation prevents malicious requests
 */
app.post('/api/create-charge', async (req, res) => {
  try {
    // Extract request parameters
    const { amount, businessEmail } = req.body;

    // Validate amount is a positive number
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount provided' });
    }

    // Validate business email is provided
    if (!businessEmail) {
      return res.status(400).json({ error: 'Business email required' });
    }

    console.log('💰 Creating Coinbase Commerce charge:', { amount, businessEmail });

    // Call Coinbase Commerce API to create a charge
    // API documentation: https://commerce.coinbase.com/docs/api/
    const response = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CC-Api-Key': process.env.COINBASE_API_KEY  // Secure - only accessible on backend
      },
      body: JSON.stringify({
        local_price: {
          amount: amount.toFixed(2),    // Format as decimal (e.g., "25.00")
          currency: 'USD'                // Base currency
        },
        pricing_type: 'fixed_price',     // Fixed USD amount (Coinbase calculates crypto equivalent)
        name: 'Merchant Payment',        // Charge name shown to customer
        description: 'Payment to Merchant',  // Charge description
        metadata: {
          businessEmail: businessEmail   // Store merchant email for reference
        }
      })
    });

    // Handle Coinbase API errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Coinbase API error:', response.status, errorData);
      return res.status(response.status).json({ 
        error: 'Failed to create charge with Coinbase',
        details: errorData
      });
    }

    // Parse successful response
    const chargeData = await response.json();
    
    console.log('✅ Coinbase charge created:', {
      id: chargeData.data?.id,
      code: chargeData.data?.code,
      hosted_url: chargeData.data?.hosted_url
    });
    
    // Return charge data to frontend
    // Frontend will redirect customer to hosted_url for payment
    return res.status(200).json(chargeData);
  } catch (error) {
    console.error('💥 Error creating Coinbase charge:', error);
    return res.status(500).json({ 
      error: 'Server error creating charge',
      message: error.message
    });
  }
});

// ============================================
// EXPORT FOR SERVERLESS DEPLOYMENT
// ============================================

/**
 * Export the Express app for Vercel/Netlify serverless functions
 * 
 * This allows the same code to run:
 * - As a traditional Node.js server (local development)
 * - As serverless functions (Vercel/Netlify deployment)
 * 
 * Serverless platforms import this app and handle requests automatically
 */
module.exports = app;