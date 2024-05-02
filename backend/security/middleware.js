// ==============================================================================
// SECURITY MIDDLEWARE - Request Protection and Authentication
// ==============================================================================
// This file contains Express middleware functions that run on every request to
// protect the API. Think of middleware as security checkpoints that requests must
// pass through before reaching the actual API endpoints.
//
// WHAT IS MIDDLEWARE?
// In Express, middleware is code that runs BETWEEN receiving a request and sending
// a response. Like security gates at an airport - you pass through multiple checks
// before boarding.
//
// SECURITY LAYERS IN THIS FILE:
// 1. Rate Limiting - Prevents spam and DDoS attacks
// 2. Authentication - Verifies user identity with JWT tokens
// 3. Input Validation - Cleans and validates user input
// 4. Security Headers - Adds protective HTTP headers
// 5. Audit Logging - Records all API activity

// ------------------------------------------------------------------------------
// Required Libraries and Modules
// ------------------------------------------------------------------------------
// security/encryption: Our custom encryption utilities
const security = require('./encryption');

// express-rate-limit: Library for rate limiting (prevents abuse)
const rateLimit = require('express-rate-limit');

// @supabase/supabase-js: Supabase client for authentication
const { createClient } = require('@supabase/supabase-js');

// ==============================================================================
// SUPABASE CLIENT INITIALIZATION
// ==============================================================================
// Set up connection to Supabase for user authentication
// We use the service role key (not the anon key) because middleware runs on the
// server and needs elevated permissions to verify JWT tokens

// Step 1: Get Supabase URL from environment variables
// This is your Supabase project URL (like "https://xxx.supabase.co")
const supabaseUrl = process.env.SUPABASE_URL || 'https://sekekoasxprqrgtephak.supabase.co';

// Step 2: Get the service role key
// This is a powerful key that bypasses Row Level Security (RLS)
// NEVER expose this key to the frontend - only use in backend code
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'temp-key';

// Step 3: Create the Supabase client
// This client can verify JWT tokens and fetch user information
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ==============================================================================
// RATE LIMITING MIDDLEWARE - Prevent Abuse and DDoS Attacks
// ==============================================================================
// Rate limiting restricts how many requests a single IP address can make in a time
// window. This prevents abuse like spam, brute force attacks, and DDoS attacks.
//
// REAL-WORLD ANALOGY:
// Like a store policy that says "Maximum 3 returns per customer per day". Prevents
// people from abusing the system while allowing legitimate use.
//
// WHY RATE LIMITING:
// - Prevents attackers from trying thousands of passwords (brute force)
// - Stops spam bots from creating fake accounts
// - Protects server from being overwhelmed (DDoS protection)
// - Reduces costs (fewer resources consumed)
// - Improves experience for legitimate users
//
// CONFIGURATION:
// - Window: 15 minutes
// - Limit: 50 requests per IP per window
// - Message: Clear error message when limit is exceeded
const secureRateLimit = rateLimit({
  // ------------------------------------------------------------------------------
  // Time Window Configuration
  // ------------------------------------------------------------------------------
  // windowMs: How long the window lasts before resetting
  // 15 * 60 * 1000 = 15 minutes in milliseconds
  // After 15 minutes, the counter resets for each IP
  windowMs: 15 * 60 * 1000, // 15 minutes
  
  // ------------------------------------------------------------------------------
  // Request Limit Configuration
  // ------------------------------------------------------------------------------
  // max: Maximum number of requests allowed in the window
  // Each IP address gets 50 requests per 15-minute window
  // Why 50? Generous enough for normal use, restrictive enough to stop abuse
  max: 50, // Limit each IP to 50 requests per windowMs
  
  // ------------------------------------------------------------------------------
  // Error Response Configuration
  // ------------------------------------------------------------------------------
  // message: What to send back when limit is exceeded
  // Should be user-friendly but not reveal too much about security measures
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  
  // ------------------------------------------------------------------------------
  // Header Configuration
  // ------------------------------------------------------------------------------
  // standardHeaders: Use modern standard headers (RateLimit-*)
  // These tell the client how many requests are left: RateLimit-Limit, RateLimit-Remaining, etc.
  standardHeaders: true,
  
  // legacyHeaders: Disable old X-RateLimit-* headers (deprecated)
  legacyHeaders: false,
});

// ==============================================================================
// ENHANCED AUTHENTICATION MIDDLEWARE - Verify User Identity
// ==============================================================================
// This middleware validates JWT (JSON Web Tokens) to ensure requests come from
// authenticated users. It's like checking ID at a club entrance.
//
// HOW JWT AUTHENTICATION WORKS:
// 1. User logs in with email/password
// 2. Server (Supabase) creates a JWT token and sends it back
// 3. Client includes this token in the Authorization header of future requests
// 4. This middleware verifies the token is valid and hasn't expired
// 5. If valid, extracts user info and allows request to continue
// 6. If invalid, rejects the request
//
// WHAT IS A JWT TOKEN?
// Think of it like a concert wristband:
//   - Proves you paid for entry (authenticated)
//   - Has an expiration (tokens expire after some time)
//   - Can't be easily forged (digitally signed)
//   - Contains info about you (user ID, email, etc.)
//
// THIS MIDDLEWARE:
//   - Is async because token verification involves database lookups
//   - Takes (req, res, next) parameters (standard Express middleware pattern)
//   - Adds user info to req.user if authentication succeeds
//   - Calls next() to pass to the next middleware or route handler
const enhancedAuth = async (req, res, next) => {
  try {
    // --------------------------------------------------------------------------
    // Step 1: Extract Authorization Header
    // --------------------------------------------------------------------------
    // Get the Authorization header from the HTTP request
    // Format expected: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    // "Bearer" is just a convention indicating the type of authentication
    const authHeader = req.headers.authorization;
    
    // Step 2: Validate Header Format
    // Check if the header exists and starts with "Bearer "
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied - Invalid authentication format',
        code: 'AUTH_FORMAT_INVALID'
      });
    }

    // Step 3: Extract the Token
    // Remove "Bearer " prefix to get the actual token
    // substring(7) means "start at position 7" which skips "Bearer "
    const token = authHeader.substring(7);
    
    // --------------------------------------------------------------------------
    // Step 2: Validate JWT with Supabase
    // --------------------------------------------------------------------------
    // Send the token to Supabase to verify it's legitimate
    // Supabase checks:
    //   - Token signature is valid (wasn't tampered with)
    //   - Token hasn't expired
    //   - User account still exists and is active
    const { data, error } = await supabase.auth.getUser(token);
    
    // Extract user from the response
    // Supabase returns data as { user: {...} } if successful
    const user = data ? data.user : null;

    // Step 2: Check if Verification Failed
    if (error || !user) {
      // Log the failed authentication attempt for security monitoring
      // Only log first 10 characters of token to avoid exposing full token in logs
      console.warn(`Authentication failed for IP: ${req.ip}, Token: ${token ? token.substring(0, 10) + '...' : 'none'}`);
      
      return res.status(401).json({ 
        error: 'Authentication failed - Invalid or expired token',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // --------------------------------------------------------------------------
    // Step 3: Generate Session Token (Optional Enhancement)
    // --------------------------------------------------------------------------
    // Try to generate a secure session token for additional security
    // This is optional - if it fails, we continue without it
    let sessionToken = null;
    try {
      // Generate a session token tied to this user's ID
      // This adds an extra layer of security beyond the JWT
      sessionToken = security.generateSessionToken(user.id);
    } catch (tokenError) {
      // If session token generation fails, log warning but don't block request
      // The JWT authentication already succeeded, so we can proceed
      console.warn('Error generating session token, continuing without it:', tokenError.message);
    }
    
    // --------------------------------------------------------------------------
    // Step 4: Add Security Context to Request
    // --------------------------------------------------------------------------
    // Attach the authenticated user object to the request
    // Now all downstream route handlers can access req.user to know who made the request
  req.user = user;
    
    // Add additional security metadata
    // This creates a security context with useful info for logging and audit trails
    req.securityContext = {
      sessionToken,                          // Optional session token (if generated)
      ipAddress: req.ip,                     // IP address of the request
      userAgent: req.headers['user-agent'], // Browser/app making the request
      timestamp: new Date().toISOString()    // Exact time of authentication
    };

    // --------------------------------------------------------------------------
    // Step 5: Continue to Next Middleware/Route
    // --------------------------------------------------------------------------
    // Authentication succeeded! Call next() to proceed to the next middleware
    // or the actual route handler
    next();
    
  } catch (error) {
    // --------------------------------------------------------------------------
    // Error Handling
    // --------------------------------------------------------------------------
    // If anything unexpected goes wrong (network error, database down, etc.),
    // log the error and return a 500 error
    console.error('Authentication middleware error:', error);
    
    res.status(500).json({ 
      error: 'Authentication service unavailable',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

// ==============================================================================
// INPUT VALIDATION AND SANITIZATION MIDDLEWARE - Clean User Input
// ==============================================================================
// This middleware cleans and validates data sent by users. Never trust user input!
// Attackers can send malicious code in input fields to try to hack your system.
//
// SECURITY PRINCIPLE: Input Validation
// Always validate and sanitize data coming from users before using it.
//
// COMMON ATTACKS THIS PREVENTS:
// - XSS (Cross-Site Scripting): Injecting JavaScript into your pages
// - SQL Injection: Injecting database commands
// - Invalid Data: Sending wrong data types or formats
//
// REAL-WORLD ANALOGY:
// Like a bouncer checking IDs - removes fake IDs (malicious input) and only
// lets in legitimate people (valid data).
const validateAndSanitize = (req, res, next) => {
  // ----------------------------------------------------------------------------
  // Step 1: Sanitize All String Inputs
  // ----------------------------------------------------------------------------
  // Loop through all data in the request body and clean it
  if (req.body) {
    // Object.keys() gets all property names in req.body
    // Example: If req.body = { name: 'John', age: 25 }, keys = ['name', 'age']
    Object.keys(req.body).forEach(key => {
      // Only sanitize strings (numbers, booleans, etc. don't need sanitization)
      if (typeof req.body[key] === 'string') {
        // ----------------------------------------------------------------------
        // Sanitization Process
        // ----------------------------------------------------------------------
        // Step 1: Remove <script> tags
        // Prevents XSS attacks where attacker tries to inject JavaScript
        // Example: "<script>alert('hacked')</script>" becomes ""
        // The regex matches script tags and everything inside them
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          
          // Step 2: Remove potentially harmful characters
          // Remove: < > ' " (commonly used in HTML/SQL injection)
          // Example: "John<script>" becomes "Johnscript"
          .replace(/[<>'"]/g, '')
          
          // Step 3: Remove leading and trailing whitespace
          // Example: "  John  " becomes "John"
          .trim();
      }
    });
  }

  // ----------------------------------------------------------------------------
  // Step 2: Validate Business Profile Data Specifically
  // ----------------------------------------------------------------------------
  // If the request contains business profile data, validate it meets our rules
  if (req.body.business_name || req.body.routing_number || req.body.account_number) {
    // Destructure (extract) the relevant fields from req.body
    const { business_name, routing_number, account_number } = req.body;

    // --------------------------------------------------------------------------
    // Business Name Validation
    // --------------------------------------------------------------------------
    // Business name must be between 2 and 100 characters
    // WHY? Too short = probably fake, too long = could cause database issues
    if (business_name && (business_name.length < 2 || business_name.length > 100)) {
      return res.status(400).json({
        error: 'Business name must be between 2 and 100 characters',
        code: 'VALIDATION_BUSINESS_NAME'
      });
    }

    // --------------------------------------------------------------------------
    // Routing Number Validation
    // --------------------------------------------------------------------------
    // U.S. bank routing numbers are EXACTLY 9 digits
    // Must be all numbers, no letters or special characters
    // Regex explained: ^\d{9}$
    //   - ^: Start of string
    //   - \d: Any digit (0-9)
    //   - {9}: Exactly 9 times
    //   - $: End of string
    if (routing_number && !/^\d{9}$/.test(routing_number)) {
      return res.status(400).json({
        error: 'Routing number must be exactly 9 digits',
        code: 'VALIDATION_ROUTING_NUMBER'
      });
    }

    // --------------------------------------------------------------------------
    // Account Number Validation
    // --------------------------------------------------------------------------
    // Bank account numbers are typically 4-20 digits
    // Must be all numbers
    // Regex explained: ^\d{4,20}$
    //   - ^: Start of string
    //   - \d: Any digit (0-9)
    //   - {4,20}: Between 4 and 20 times
    //   - $: End of string
    if (account_number && !/^\d{4,20}$/.test(account_number)) {
      return res.status(400).json({
        error: 'Account number must be 4-20 digits',
        code: 'VALIDATION_ACCOUNT_NUMBER'
      });
    }
  }

  // ----------------------------------------------------------------------------
  // Step 3: Validation Passed - Continue
  // ----------------------------------------------------------------------------
  // All validations passed, proceed to next middleware or route handler
  next();
};

// ==============================================================================
// SECURITY HEADERS MIDDLEWARE - Add Protective HTTP Headers
// ==============================================================================
// This middleware adds special HTTP headers to every response that tell browsers
// how to handle security. These headers protect against common web attacks.
//
// WHAT ARE HTTP HEADERS?
// Headers are metadata sent with every HTTP response. Think of them as instructions
// on an envelope telling the postal service how to handle it.
//
// WHY SECURITY HEADERS:
// - Prevent common attacks (XSS, clickjacking, MIME sniffing)
// - Tell browsers to enable built-in security features
// - Reduce attack surface
// - Industry best practice
const securityHeaders = (req, res, next) => {
  // ----------------------------------------------------------------------------
  // X-Content-Type-Options: nosniff
  // ----------------------------------------------------------------------------
  // Prevents browsers from trying to guess content types
  // WHY? Without this, a browser might interpret a text file as JavaScript and execute it
  // "nosniff" tells the browser: "Trust the Content-Type header, don't guess"
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // ----------------------------------------------------------------------------
  // X-Frame-Options: DENY
  // ----------------------------------------------------------------------------
  // Prevents your website from being embedded in an iframe
  // WHY? Prevents "clickjacking" attacks where attackers trick users into clicking
  // invisible buttons by embedding your site in a malicious frame
  // "DENY" means: "Never allow this page in a frame"
  res.setHeader('X-Frame-Options', 'DENY');
  
  // ----------------------------------------------------------------------------
  // X-XSS-Protection: 1; mode=block
  // ----------------------------------------------------------------------------
  // Enables the browser's built-in XSS (Cross-Site Scripting) filter
  // "1" means: "Enable the filter"
  // "mode=block" means: "Block the page completely if XSS is detected"
  // NOTE: Modern browsers have better XSS protection via Content-Security-Policy,
  // but this adds an extra layer for older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // ----------------------------------------------------------------------------
  // Referrer-Policy: strict-origin-when-cross-origin
  // ----------------------------------------------------------------------------
  // Controls how much referrer information is sent when navigating away
  // "strict-origin-when-cross-origin" means:
  //   - Same origin: Send full URL
  //   - Cross-origin HTTPS→HTTPS: Send only origin (domain)
  //   - Cross-origin HTTPS→HTTP: Send nothing
  // WHY? Prevents leaking sensitive URL parameters to other sites
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // ----------------------------------------------------------------------------
  // Content-Security-Policy
  // ----------------------------------------------------------------------------
  // Defines what content can be loaded and from where
  // This is one of the most powerful security headers
  //
  // POLICY BREAKDOWN:
  //   - default-src 'self': By default, only load resources from our own domain
  //   - script-src 'self' 'unsafe-inline': JavaScript can be from our domain or inline
  //   - style-src 'self' 'unsafe-inline': CSS can be from our domain or inline
  //
  // NOTE: 'unsafe-inline' is not ideal for production (allows inline JS/CSS)
  // In production, remove 'unsafe-inline' and use nonces or hashes instead
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  
  // ----------------------------------------------------------------------------
  // Remove Server Identification
  // ----------------------------------------------------------------------------
  // Remove the X-Powered-By header that reveals we're using Express
  // WHY? Don't advertise what technologies you're using - makes attacks harder
  // By default, Express adds "X-Powered-By: Express"
  res.removeHeader('X-Powered-By');
  
  // ----------------------------------------------------------------------------
  // Continue to Next Middleware
  // ----------------------------------------------------------------------------
  // Headers are set, proceed to the next middleware or route handler
  next();
};

// ==============================================================================
// AUDIT LOGGING MIDDLEWARE - Record All API Activity
// ==============================================================================
// This middleware creates a detailed log entry for every request. Essential for:
// - Security incident investigation
// - Compliance requirements (GDPR, HIPAA, SOC 2)
// - Performance monitoring
// - Debugging issues
// - Understanding user behavior
//
// REAL-WORLD ANALOGY:
// Like a security camera system - records who came in, what they did, when they
// left, and whether everything went smoothly.
//
// RUNS FOR: Every single request to the API
const auditLog = (req, res, next) => {
  // ----------------------------------------------------------------------------
  // Step 1: Record Start Time
  // ----------------------------------------------------------------------------
  // Capture when the request started (in milliseconds)
  // We'll use this later to calculate how long the request took
  const startTime = Date.now();
  
  // ----------------------------------------------------------------------------
  // Step 2: Build Initial Audit Entry
  // ----------------------------------------------------------------------------
  // Create an object with all the request information we want to log
  const auditEntry = {
    // When did this request come in (ISO 8601 format: "2024-01-15T10:30:45.123Z")
    timestamp: new Date().toISOString(),
    
    // What type of request (GET, POST, PUT, DELETE, etc.)
    method: req.method,
    
    // What endpoint was requested (like "/api/business-profile")
    url: req.url,
    
    // Where did the request come from (IP address)
    ip: req.ip,
    
    // What browser/app sent the request
    // Example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
    userAgent: req.headers['user-agent'],
    
    // Who made the request (if authenticated)
    // Will be 'anonymous' if not authenticated
    // Uses optional chaining (?.) to safely access req.user.id
    userId: req.user?.id || 'anonymous',
    
    // Session token (if available from securityContext)
    sessionId: req.securityContext?.sessionToken?.token || null
  };

  // ----------------------------------------------------------------------------
  // Step 3: Override res.json() to Capture Response Data
  // ----------------------------------------------------------------------------
  // We want to log response information too (status code, response time)
  // Problem: The response happens AFTER this middleware runs
  // Solution: Intercept the res.json() method to capture response data
  
  // Save the original res.json function
  const originalJson = res.json;
  
  // Replace res.json with our custom version
  res.json = function(data) {
    // ------------------------------------------------------------------------
    // Calculate Response Time
    // ------------------------------------------------------------------------
    // How long did this request take? (current time - start time)
    auditEntry.responseTime = Date.now() - startTime;
    
    // ------------------------------------------------------------------------
    // Record Response Status
    // ------------------------------------------------------------------------
    // What HTTP status code did we send? (200, 400, 500, etc.)
    auditEntry.statusCode = res.statusCode;
    
    // Was the request successful? (status codes under 400 are success)
    auditEntry.success = res.statusCode < 400;
    
    // ------------------------------------------------------------------------
    // Flag Sensitive Operations
    // ------------------------------------------------------------------------
    // If this request modified business profile data, mark it as such
    // This is important for security audits and compliance
    if (req.url.includes('/business-profile') && req.method !== 'GET') {
      auditEntry.operation = 'BUSINESS_PROFILE_MODIFICATION';
      auditEntry.dataModified = true;
    }
    
    // ------------------------------------------------------------------------
    // Log the Audit Entry
    // ------------------------------------------------------------------------
    // Print the complete audit entry to the console
    // In production, this should go to:
    //   - Centralized logging system (CloudWatch, Splunk, Datadog)
    //   - Audit database (dedicated table for compliance)
    //   - SIEM (Security Information and Event Management) tool
    console.log('AUDIT:', JSON.stringify(auditEntry));
    
    // ------------------------------------------------------------------------
    // Call Original res.json()
    // ------------------------------------------------------------------------
    // Now actually send the response using the original json function
    // 'this' refers to the response object
    return originalJson.call(this, data);
  };

  // ----------------------------------------------------------------------------
  // Step 4: Continue to Next Middleware/Route
  // ----------------------------------------------------------------------------
  // Proceed to the next middleware or route handler
  // Our custom res.json() will be called when the response is sent
  next();
};

// ==============================================================================
// EXPORT ALL MIDDLEWARE FUNCTIONS
// ==============================================================================
// Make all middleware functions available to other files
//
// USAGE IN api-server.js:
//   const { enhancedAuth, secureRateLimit } = require('./security/middleware');
//   app.use(secureRateLimit);
//   app.get('/protected', enhancedAuth, (req, res) => { ... });
module.exports = {
  secureRateLimit,       // Rate limiting to prevent abuse
  enhancedAuth,          // JWT authentication
  validateAndSanitize,   // Input validation and sanitization
  securityHeaders,       // Security HTTP headers
  auditLog,              // Request logging for audit trails
  security               // Re-export security utilities
};