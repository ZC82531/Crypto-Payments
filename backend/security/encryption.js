// ==============================================================================
// SECURITY SERVICE - ENCRYPTION & TOKENIZATION UTILITIES
// ==============================================================================
// This file handles all encryption, decryption, and tokenization operations.
// Think of it as a vault system: it can lock sensitive data (encrypt), unlock it 
// (decrypt), and create temporary access tokens instead of exposing real data.
//
// WHY THIS EXISTS:
// - Bank account numbers and routing numbers are extremely sensitive
// - We can't store them in plain text in the database
// - We need to encrypt them so even if someone accesses the database, they can't read them
// - Tokenization creates fake "stand-in" values so we don't pass real data around

// ------------------------------------------------------------------------------
// Required Libraries
// ------------------------------------------------------------------------------
// crypto: Built-in Node.js library for encryption operations (like a locksmith's toolbox)
const crypto = require('crypto');

// keyManager: Our custom key management system that handles encryption keys
// Think of this as the key ring that holds all the actual keys we use to lock/unlock data
const keyManager = require('./keyManager');

// ==============================================================================
// SECURITY SERVICE CLASS
// ==============================================================================
// This is the main class that provides all our security functions.
// It's created once and shared across the entire application.
class SecurityService {
  constructor() {
    // ------------------------------------------------------------------------------
    // Encryption Algorithm Configuration
    // ------------------------------------------------------------------------------
    // algorithm: Defines HOW we encrypt data
    // 'aes-256-cbc' means:
    //   - AES: Advanced Encryption Standard (military-grade encryption)
    //   - 256: Uses 256-bit keys (extremely secure, would take billions of years to crack)
    //   - CBC: Cipher Block Chaining (a method that makes patterns harder to detect)
    this.algorithm = 'aes-256-cbc';
    
    // ------------------------------------------------------------------------------
    // Token System Configuration
    // ------------------------------------------------------------------------------
    // tokenPrefix: All tokens we create start with 'tok_' so we can identify them
    // Example: "tok_account_abc123" instead of the real account number "1234567890"
    this.tokenPrefix = 'tok_';
    
    // tokenMap: Stores the relationship between tokens and encrypted data
    // Like a translation dictionary: token "tok_account_abc123" = encrypted data "x7f2..."
    // NOTE: In a real production app, this should be stored in Redis or a secure database,
    // not in memory, because memory resets when the server restarts
    this.tokenMap = new Map();
  }

  // ==============================================================================
  // GET ENCRYPTION KEY - Key Retrieval with Security Checks
  // ==============================================================================
  // This function retrieves the encryption key needed to lock/unlock data.
  // It has multiple fallback options to ensure we can always get a key.
  //
  // PARAMETERS:
  //   userId: Who is requesting the key (for access control)
  //   operation: What they want to do with it ('encrypt' or 'decrypt')
  //
  // THINK OF IT LIKE:
  // A key box at a hotel - you need to identify yourself and state your purpose
  // before the attendant gives you the room key.
  getEncryptionKey(userId = 'system', operation = 'encrypt') {
    // ------------------------------------------------------------------------------
    // Option 1: Use Environment Variable Key (Simplest approach)
    // ------------------------------------------------------------------------------
    // Step 1: Check if there's a key stored in environment variables
    // This is the simplest setup - just one key stored in .env file
    // Good for development, but production should use key manager for rotation
    if (process.env.ENCRYPTION_KEY) {
      // If we found it, return it immediately (convert from hex string to Buffer format)
      return process.env.ENCRYPTION_KEY;
    }
    
    // ------------------------------------------------------------------------------
    // Option 2: Use Key Manager (Production approach with rotation support)
    // ------------------------------------------------------------------------------
    // If no environment key exists, try to get a key from the key manager
    // The key manager can rotate keys and track multiple versions
    try {
      // Step 1: Validate that this user has permission to access encryption keys
      // Example: Regular users can encrypt their own data, but only admins can rotate keys
      if (!keyManager.validateKeyAccess(userId, operation)) {
        // If they don't have permission, throw an error
        throw new Error('Access denied to encryption key');
      }

      // Step 2: Create an audit log entry
      // This tracks who accessed keys and when (important for security investigations)
      keyManager.auditKeyOperation(operation, userId);

      // Step 3: Get the current active encryption key from the key manager
      return keyManager.getCurrentKey();
    } catch (error) {
      // If something goes wrong with the key manager, don't crash - fall back to default
      console.warn('Error accessing key manager, using fallback key');
      
      // ------------------------------------------------------------------------------
      // Option 3: Emergency Fallback Key (Last Resort)
      // ------------------------------------------------------------------------------
      // This is a hardcoded key used only if everything else fails
      // WARNING: Not secure for production! Should only be used in development
      // In production, if we reach this point, the application should probably fail
      // rather than use an insecure default key
      return 'f5e8d4c952eff5a79afccb2b757693f7969754393f7413442fda96ddefedb0c0';
    }
  }

  // ==============================================================================
  // GET USER-SPECIFIC ENCRYPTION KEY
  // ==============================================================================
  // Creates a unique encryption key for each user based on their userId.
  // This means each user's data is encrypted with their own unique key.
  //
  // WHY THIS MATTERS:
  // If one user's key is compromised, other users' data remains secure.
  // It's like each apartment in a building having a different lock.
  //
  // PARAMETERS:
  //   userId: The unique identifier for the user
  getUserEncryptionKey(userId) {
    // Derive (generate) a user-specific key from the master key + userId
    // The keyManager combines these inputs to create a unique but reproducible key
    return keyManager.deriveUserKey(userId, 'encryption');
  }

  // ==============================================================================
  // ENCRYPT - Lock Sensitive Data Before Storing
  // ==============================================================================
  // This function takes plain text (like "123456789") and converts it to encrypted
  // gibberish (like "a7f3e9c...") that can't be read without the decryption key.
  //
  // REAL-WORLD ANALOGY:
  // Think of this like putting a valuable document in a locked safe. The document 
  // goes in readable, comes out scrambled. Only someone with the key can read it again.
  //
  // PARAMETERS:
  //   text: The sensitive data we want to protect (account number, routing number, etc.)
  //   userId: Who is encrypting this data (for audit trails and user-specific keys)
  //
  // RETURNS:
  //   An object containing the encrypted data plus metadata about how it was encrypted
  encrypt(text, userId = 'system') {
    // ------------------------------------------------------------------------------
    // Validation: Don't encrypt empty data
    // ------------------------------------------------------------------------------
    // Step 1: Check if there's actually data to encrypt
    // If text is null, undefined, or empty string, just return null
    if (!text) return null;
    
    // ------------------------------------------------------------------------------
    // Encryption Process
    // ------------------------------------------------------------------------------
    try {
      // Step 1: Generate a random IV (Initialization Vector)
      // What is an IV? It's random data added to encryption to make it more secure
      // Even if you encrypt the same text twice, you get different results
      // Think of it like adding a random salt to a recipe - same ingredients, different taste
      // 16 bytes = 128 bits of randomness
      const iv = crypto.randomBytes(16);
      
      // Step 2: Get the encryption key for this user
      // This retrieves the secret key that will actually do the locking
      const encryptionKeyRaw = this.getEncryptionKey(userId, 'encrypt');
      // Convert hex string to Buffer if needed (createCipheriv requires 32-byte Buffer)
      const encryptionKey = typeof encryptionKeyRaw === 'string'
        ? Buffer.from(encryptionKeyRaw, 'hex')
        : encryptionKeyRaw;
      
      // Step 3: Create the cipher object
      // A cipher is the tool that does the actual encryption
      // We tell it: use AES-256-CBC algorithm, with this key, and this IV
      const cipher = crypto.createCipheriv(this.algorithm, encryptionKey, iv);
      
      // Step 4: Run the encryption process (Part 1)
      // Convert the plain text to encrypted hex format
      // 'utf8' = input is normal text, 'hex' = output is hexadecimal numbers/letters
      let encrypted = cipher.update(text, 'utf8', 'hex');
      
      // Step 5: Finalize encryption (Part 2)
      // This completes the encryption and adds any remaining data
      // The += means we're adding to what we already have
      encrypted += cipher.final('hex');
      
      // Step 6: Package everything together
      // We return not just the encrypted data, but also information about HOW we encrypted it
      // Why? Because to decrypt later, we need to know the IV, algorithm, and key version
      return {
        encrypted,                           // The actual encrypted data
        iv: iv.toString('hex'),             // The random IV (convert from bytes to hex string)
        algorithm: this.algorithm,           // Which algorithm was used (aes-256-cbc)
        keyVersion: keyManager.currentKeyId, // Which key version was used (for key rotation)
        encryptedBy: userId,                // Who encrypted this (for audit trails)
        timestamp: new Date().toISOString()  // When it was encrypted (for audit trails)
      };
    } catch (error) {
      // ------------------------------------------------------------------------------
      // Error Handling
      // ------------------------------------------------------------------------------
      // If encryption fails, log the error and notify the key manager
      console.error('Encryption failed:', error);
      
      // Record that this encryption operation failed (for security monitoring)
      keyManager.auditKeyOperation('encrypt', userId, null, false);
      
      // Return null to indicate failure
      return null;
    }
  }

  // ==============================================================================
  // DECRYPT - Unlock Encrypted Data When Retrieving
  // ==============================================================================
  // This function takes encrypted data and converts it back to readable text.
  // It's the reverse of the encrypt() function above.
  //
  // REAL-WORLD ANALOGY:
  // Like opening a locked safe - you need the right key and the right combination.
  // The "combination" is the IV that was used during encryption.
  //
  // PARAMETERS:
  //   encryptedData: The object returned from encrypt() containing encrypted text + metadata
  //   userId: Who is decrypting this data (for access control and audit trails)
  //
  // RETURNS:
  //   The original plain text, or null if decryption fails
  decrypt(encryptedData, userId = 'system') {
    // ------------------------------------------------------------------------------
    // Validation: Make sure we have data to decrypt
    // ------------------------------------------------------------------------------
    // Step 1: Check if the input is valid
    // We need both the encryptedData object AND the encrypted property inside it
    if (!encryptedData || !encryptedData.encrypted) return null;
    
    // ------------------------------------------------------------------------------
    // Decryption Process
    // ------------------------------------------------------------------------------
    try {
      // Step 1: Figure out which key version was used to encrypt this data
      // When data was encrypted, we stored which key version was used (keyVersion)
      // This is important because keys can be rotated over time
      // If no keyVersion is stored, assume it was encrypted with the environment key
      const keyId = encryptedData.keyVersion || 'env_key';
      
      // Step 2: Retrieve that specific key version
      // We need the EXACT same key that was used to encrypt, or decryption will fail
      const decryptionKey = keyManager.getKeyById(keyId);
      
      // Step 3: Verify we actually got a key
      // If the key doesn't exist anymore (maybe it expired), we can't decrypt
      if (!decryptionKey) {
        throw new Error(`Decryption key ${keyId} not found`);
      }

      // Step 4: Check if this user has permission to decrypt data
      // Not everyone should be able to decrypt everything
      // This is like checking if you have clearance before opening classified files
      if (!keyManager.validateKeyAccess(userId, 'decrypt')) {
        throw new Error('Access denied for decryption');
      }

      // Step 5: Retrieve the IV (Initialization Vector) that was used during encryption
      // Remember: The IV is like the unique "salt" that was added during encryption
      // We need the EXACT same IV to decrypt successfully
      // Convert it from hex string back to bytes (Buffer format)
      const iv = Buffer.from(encryptedData.iv, 'hex');
      
      // Step 6: Create the decipher object
      // This is the tool that does the actual decryption
      // We tell it: use the same algorithm, the same key, and the same IV
      const decipher = crypto.createDecipheriv(this.algorithm, decryptionKey, iv);
      
      // Step 7: Run the decryption process (Part 1)
      // Convert the encrypted hex data back to readable utf8 text
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      
      // Step 8: Finalize decryption (Part 2)
      // Complete the decryption and add any remaining data
      decrypted += decipher.final('utf8');
      
      // Step 9: Log successful decryption
      // Record in the audit trail that this operation succeeded
      // This helps track who is accessing sensitive data
      keyManager.auditKeyOperation('decrypt', userId, keyId, true);
      
      // Step 10: Return the original plain text
      return decrypted;
      
    } catch (error) {
      // ------------------------------------------------------------------------------
      // Error Handling
      // ------------------------------------------------------------------------------
      // If decryption fails, log the error and create an audit entry
      console.error('Decryption failed:', error);
      
      // Record that this decryption operation failed
      // This could indicate:
      //   - Wrong key was used
      //   - Data was corrupted
      //   - Someone is trying to access data they shouldn't
      keyManager.auditKeyOperation('decrypt', userId, encryptedData.keyVersion, false);
      
      // Return null to indicate failure
      return null;
    }
  }

  // ==============================================================================
  // TOKENIZE - Replace Sensitive Data with Safe Tokens
  // ==============================================================================
  // Tokenization is a security technique where you replace sensitive data with a 
  // random token (like a claim ticket). You can later exchange the token for the 
  // real data, but the token itself reveals nothing.
  //
  // REAL-WORLD ANALOGY:
  // Like a coat check at a restaurant:
  //   1. You give them your expensive coat (sensitive data)
  //   2. They give you a claim ticket with a random number (token)
  //   3. You keep the ticket in your pocket (store token in database)
  //   4. Later, you exchange the ticket to get your coat back (detokenize)
  //
  // WHY USE TOKENIZATION:
  // - The token can be safely stored in databases and logs
  // - If someone steals the token, they can't get the original data without access 
  //   to this service
  // - Reduces PCI compliance scope (credit card industry rules)
  //
  // PARAMETERS:
  //   sensitiveData: The actual data we want to hide (account number, routing number)
  //   dataType: What type of data this is ('account', 'routing', 'generic')
  //   userId: Who is tokenizing this data
  //
  // RETURNS:
  //   A token string like "tok_account_abc-123-xyz"
  tokenize(sensitiveData, dataType = 'generic', userId = 'system') {
    // ------------------------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------------------------
    // Step 1: Make sure there's actually data to tokenize
    if (!sensitiveData) return null;
    
    // ------------------------------------------------------------------------------
    // Token Generation
    // ------------------------------------------------------------------------------
    // Step 1: Generate a unique random identifier
    // crypto.randomUUID() creates something like "abc-123-def-456-ghi"
    // This ensures every token is unique and can't be guessed
    const tokenId = crypto.randomUUID();
    
    // Step 2: Create the full token with a clear format
    // Format: tok_[datatype]_[random-uuid]
    // Examples:
    //   - "tok_account_abc-123-def-456"
    //   - "tok_routing_xyz-789-ghi-012"
    // The prefix helps us identify tokens, and dataType helps track what they represent
    const token = `${this.tokenPrefix}${dataType}_${tokenId}`;
    
    // Step 3: Encrypt the actual sensitive data
    // We don't store the real data in plain text anywhere
    // Instead, we encrypt it first, then store the encrypted version
    const encryptedData = this.encrypt(sensitiveData, userId);
    
    // Step 4: Store the mapping between token and encrypted data
    // This is our "coat check" system - we store:
    //   - The encrypted data (the locked coat)
    //   - What type of data it is (coat, jacket, umbrella)
    //   - Who owns it (userId)
    //   - When it was stored (created timestamp)
    //   - When it was last accessed (lastAccessed timestamp)
    this.tokenMap.set(token, {
      data: encryptedData,          // The encrypted sensitive data
      type: dataType,               // Type: 'account', 'routing', etc.
      userId: userId,               // Who tokenized this data
      created: new Date(),          // When the token was created
      lastAccessed: new Date()      // When the token was last used
    });
    
    // Step 5: Create an audit log entry
    // Track that tokenization happened (for security monitoring)
    keyManager.auditKeyOperation('tokenize', userId, keyManager.currentKeyId, true);
    
    // Step 6: Return the safe token
    // This token can now be safely stored in databases, sent in URLs, etc.
    return token;
  }

  // ==============================================================================
  // DETOKENIZE - Exchange Token for Original Data
  // ==============================================================================
  // This is the reverse of tokenize() - it takes a token and returns the original
  // sensitive data. Like exchanging your coat check ticket to get your coat back.
  //
  // PARAMETERS:
  //   token: The token string we want to exchange (like "tok_account_abc-123")
  //   userId: Who is requesting the data (for audit trails)
  //
  // RETURNS:
  //   The original sensitive data (decrypted), or null if token is invalid
  detokenize(token, userId = 'system') {
    // ------------------------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------------------------
    // Step 1: Check if the token is valid format
    // All our tokens start with 'tok_' prefix
    // If it doesn't, it's not one of our tokens
    if (!token || !token.startsWith(this.tokenPrefix)) return null;
    
    // Step 2: Look up the token in our mapping
    // This is like the coat check attendant looking up your ticket number
    const tokenData = this.tokenMap.get(token);
    
    // Step 3: Check if we found anything
    // If the token doesn't exist in our system, return null
    // This could mean:
    //   - Token never existed
    //   - Token expired and was deleted
    //   - Token was already used and removed
    if (!tokenData) return null;
    
    // ------------------------------------------------------------------------------
    // Update Access Tracking
    // ------------------------------------------------------------------------------
    // Step 1: Update the "last accessed" timestamp
    // This helps us track token usage and detect suspicious patterns
    // For example, if a token is being accessed hundreds of times per second,
    // that might indicate an attack
    tokenData.lastAccessed = new Date();
    
    // ------------------------------------------------------------------------------
    // Decrypt and Return
    // ------------------------------------------------------------------------------
    // Step 1: Decrypt the encrypted data stored with this token
    // Remember: We don't store the raw sensitive data anywhere
    // We store it encrypted, and only decrypt it when needed
    // Pass the userId so the decrypt function can validate access permissions
    return this.decrypt(tokenData.data, userId);
  }

  // ==============================================================================
  // HASH - One-Way Transformation for Data Comparison
  // ==============================================================================
  // Hashing is different from encryption. With encryption, you can get the original
  // data back. With hashing, you CAN'T reverse it - it's a one-way street.
  //
  // REAL-WORLD ANALOGY:
  // Like making ground beef from steak:
  //   - You can grind steak into ground beef (hash the data)
  //   - You can't turn ground beef back into steak (can't unhash)
  //   - But if someone gives you another piece of meat, you can grind it and 
  //     compare if both ground meats look the same (verify hash)
  //
  // WHY USE HASHING:
  // - Store passwords securely (even if database is stolen, attacker can't get passwords)
  // - Verify data hasn't been tampered with
  // - Check if data matches without storing the original
  //
  // EXAMPLE USE CASE IN OUR APP:
  // We might hash routing numbers to quickly check if a routing number is valid
  // without storing or decrypting the actual routing number
  //
  // PARAMETERS:
  //   data: The data to hash (routing number, password, etc.)
  //   salt: Random data added to make the hash more secure (optional)
  //
  // RETURNS:
  //   Object with the hash and the salt used
  hash(data, salt = null) {
    // ------------------------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------------------------
    // Step 1: Make sure there's data to hash
    if (!data) return null;
    
    // ------------------------------------------------------------------------------
    // Salt Generation
    // ------------------------------------------------------------------------------
    // Step 1: Create or use salt
    // Salt is random data added to the input before hashing
    // WHY? Without salt, identical inputs always produce identical hashes
    // With salt, even identical inputs produce different hashes
    // This prevents "rainbow table" attacks where attackers pre-compute common hashes
    //
    // If no salt was provided, generate a new random 16-byte salt
    // If salt was provided (for verification), use that existing salt
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    
    // ------------------------------------------------------------------------------
    // Hashing Process
    // ------------------------------------------------------------------------------
    // Step 1: Run the PBKDF2 hashing algorithm
    // PBKDF2 (Password-Based Key Derivation Function 2) is a secure hashing method
    // Parameters explained:
    //   - data: What we're hashing
    //   - actualSalt: The random salt
    //   - 10000: Number of iterations (how many times to run the hash)
    //           More iterations = slower but more secure
    //           10,000 is a good balance
    //   - 64: Output length in bytes (longer = more secure)
    //   - 'sha256': The underlying hash algorithm (SHA-256 is military-grade)
    const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha256').toString('hex');
    
    // Step 2: Return both the hash and the salt
    // We need to store BOTH because:
    //   - The hash alone isn't useful without knowing which salt was used
    //   - To verify data later, we need to hash it with the SAME salt
    return {
      hash,        // The hashed data (one-way transformation)
      salt: actualSalt  // The salt that was used (needed for verification)
    };
  }

  // ==============================================================================
  // VERIFY HASH - Check if Data Matches a Hash
  // ==============================================================================
  // This function checks if some data matches a previously stored hash.
  // Used for password verification, routing number validation, etc.
  //
  // HOW IT WORKS:
  //   1. Take the new data user provides
  //   2. Hash it with the SAME salt that was used originally
  //   3. Compare the new hash with the stored hash
  //   4. If they match, the data is the same
  //
  // PARAMETERS:
  //   data: The data to verify (like a routing number someone entered)
  //   hashedData: The previously stored hash object (with hash and salt)
  //
  // RETURNS:
  //   true if data matches, false if it doesn't
  verifyHash(data, hashedData) {
    // ------------------------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------------------------
    // Step 1: Make sure we have both pieces needed for comparison
    if (!data || !hashedData) return false;
    
    // ------------------------------------------------------------------------------
    // Hash and Compare
    // ------------------------------------------------------------------------------
    // Step 1: Hash the new data using the SAME salt from the stored hash
    // This is critical - we must use the same salt or the hashes won't match
    const { hash } = this.hash(data, hashedData.salt);
    
    // Step 2: Compare the new hash with the stored hash
    // If they're identical, the data must be the same
    // This is a constant-time comparison to prevent timing attacks
    return hash === hashedData.hash;
  }

  // ==============================================================================
  // GENERATE SESSION TOKEN - Create Temporary Access Tokens
  // ==============================================================================
  // Session tokens are temporary credentials that prove a user is logged in.
  // They're like a wristband at a concert - shows you paid for entry and can 
  // stay as long as the concert lasts.
  //
  // WHY USE SESSION TOKENS:
  // - Users don't have to re-enter password for every action
  // - Tokens expire automatically (security feature)
  // - Can be revoked if suspicious activity is detected
  // - Include signature to prevent tampering
  //
  // PARAMETERS:
  //   userId: The user this session belongs to
  //
  // RETURNS:
  //   Object with token and signature (both needed to validate session)
  generateSessionToken(userId) {
    // ------------------------------------------------------------------------------
    // Create Token Data
    // ------------------------------------------------------------------------------
    // Step 1: Build an object with all the session information
    const tokenData = {
      userId,                                        // Who this session belongs to
      issued: Date.now(),                           // When was token created (timestamp in milliseconds)
      expires: Date.now() + (24 * 60 * 60 * 1000), // When does it expire (24 hours from now)
      nonce: crypto.randomBytes(16).toString('hex') // Random value to make token unique
    };
    // The 'nonce' (number used once) prevents replay attacks where someone tries
    // to reuse an old token. Each token has a unique nonce.
    
    // Step 2: Convert token data to a string format
    // We need to convert the JavaScript object to a string so we can encode it
    const tokenString = JSON.stringify(tokenData);
    
    // ------------------------------------------------------------------------------
    // Create Signature (Proof of Authenticity)
    // ------------------------------------------------------------------------------
    // Step 1: Generate a signature to prove this token came from our server
    // Think of the signature like a wax seal on a letter - it proves authenticity
    //
    // HMAC (Hash-based Message Authentication Code):
    //   - Creates a signature using the encryption key as a secret
    //   - If someone modifies the token, the signature won't match
    //   - Only our server can create valid signatures (because only we have the key)
    const signature = crypto.createHmac('sha256', this.encryptionKey)
                           .update(tokenString)    // Hash the token data
                           .digest('hex');         // Output as hex string
    
    // Step 3: Encode the token string to base64 format
    // Base64 encoding makes it safe to transmit in URLs and HTTP headers
    // It's not encryption - just a way to represent data in a URL-safe format
    const encodedToken = Buffer.from(tokenString).toString('base64');
    
    // Step 4: Return both the encoded token and its signature
    // Both pieces are needed to validate the session later
    return {
      token: encodedToken,  // The actual session data (base64 encoded)
      signature             // The signature that proves it's authentic
    };
  }

  // ==============================================================================
  // VALIDATE SESSION TOKEN - Verify Token is Legitimate and Not Expired
  // ==============================================================================
  // This function checks if a session token is valid and hasn't been tampered with.
  // Like a bouncer checking your wristband at a concert.
  //
  // PARAMETERS:
  //   token: The encoded session token (from generateSessionToken)
  //   signature: The signature that came with the token
  //
  // RETURNS:
  //   The decoded token data if valid, or null if invalid/expired/tampered
  validateSessionToken(token, signature) {
    try {
      // ------------------------------------------------------------------------------
      // Decode Token
      // ------------------------------------------------------------------------------
      // Step 1: Decode the base64 token back to a regular string
      const tokenString = Buffer.from(token, 'base64').toString('utf8');
      
      // ------------------------------------------------------------------------------
      // Verify Signature (Check for Tampering)
      // ------------------------------------------------------------------------------
      // Step 1: Recreate the signature using the same process as generateSessionToken
      // If the token was modified at all, this signature will be different
      const expectedSignature = crypto.createHmac('sha256', this.encryptionKey)
                                     .update(tokenString)
                                     .digest('hex');
      
      // Step 2: Compare signatures
      // If they don't match, someone tampered with the token
      // Reject it immediately - this is a security threat
      if (signature !== expectedSignature) return null;
      
      // ------------------------------------------------------------------------------
      // Parse and Validate Token Data
      // ------------------------------------------------------------------------------
      // Step 1: Convert the JSON string back to a JavaScript object
      const tokenData = JSON.parse(tokenString);
      
      // Step 2: Check if token has expired
      // If current time is past the expiration time, token is no longer valid
      // Like checking if your concert wristband is for today or yesterday
      if (Date.now() > tokenData.expires) return null;
      
      // Step 3: Token is valid! Return the data
      // This data can now be used to identify the user making the request
      return tokenData;
      
    } catch (error) {
      // ------------------------------------------------------------------------------
      // Error Handling
      // ------------------------------------------------------------------------------
      // If anything goes wrong (invalid base64, invalid JSON, etc.), 
      // reject the token for security
      return null;
    }
  }

  // ==============================================================================
  // SECURE TRANSFORM - Prepare Business Data for Safe Transmission
  // ==============================================================================
  // This function takes business profile data (including sensitive bank information)
  // and transforms it into a safe format for transmission or storage.
  //
  // WHAT IT DOES:
  // - Replaces sensitive data (account/routing numbers) with tokens
  // - Creates hashes for validation purposes
  // - Keeps non-sensitive data as-is
  // - Adds tracking metadata
  //
  // REAL-WORLD ANALOGY:
  // Like preparing documents to send through the mail:
  //   - Public info (business name) goes as-is
  //   - Sensitive info (bank numbers) gets replaced with claim tickets
  //   - You add tracking numbers and timestamps
  //   - Original sensitive data stays locked in a safe
  //
  // PARAMETERS:
  //   businessData: Object containing business_name, routing_number, account_number
  //
  // RETURNS:
  //   Transformed object safe for transmission/storage
  secureTransform(businessData) {
    return {
      // ------------------------------------------------------------------------------
      // Public Data - Can be stored/transmitted as-is
      // ------------------------------------------------------------------------------
      // Business name is not considered sensitive (it's often public information)
      // No need to encrypt or tokenize this
      business_name: businessData.business_name,
      
      // ------------------------------------------------------------------------------
      // Tokenized Sensitive Data - Replace with safe tokens
      // ------------------------------------------------------------------------------
      // Step 1: Tokenize routing number
      // This replaces "123456789" with "tok_routing_abc-def-123"
      // The real number is encrypted and stored in the token map
      routing_number_token: this.tokenize(businessData.routing_number, 'routing'),
      
      // Step 2: Tokenize account number
      // Same process as routing number - replace with a safe token
      account_number_token: this.tokenize(businessData.account_number, 'account'),
      
      // ------------------------------------------------------------------------------
      // Hashed Data for Validation
      // ------------------------------------------------------------------------------
      // Step 1: Create a hash of the routing number
      // Why? This allows us to verify the routing number later without decrypting
      // For example: "Is this routing number valid?" can be checked by comparing hashes
      // Note: Hash can't be reversed to get the original number
      routing_hash: this.hash(businessData.routing_number),
      
      // ------------------------------------------------------------------------------
      // Tracking Metadata
      // ------------------------------------------------------------------------------
      // Step 1: Generate a unique ID for this transmission
      // Helps track this specific data transformation in logs
      transmission_id: crypto.randomUUID(),
      
      // Step 2: Add timestamp
      // Records exactly when this transformation happened (for auditing)
      timestamp: new Date().toISOString()
    };
  }

  // ==============================================================================
  // REVERSE TRANSFORM - Convert Secure Data Back to Original Format
  // ==============================================================================
  // This function takes the tokenized data from secureTransform() and converts
  // it back to the original format with actual bank numbers.
  //
  // WHEN TO USE:
  // - When we need to send bank info to a payment processor
  // - When displaying account details to an authenticated business owner
  // - When updating business profile information
  //
  // SECURITY NOTE:
  // This should only be called when absolutely necessary, and the result should
  // never be logged or stored in plain text.
  //
  // PARAMETERS:
  //   secureData: The transformed data from secureTransform()
  //
  // RETURNS:
  //   Object with the original data structure
  reverseTransform(secureData) {
    return {
      // ------------------------------------------------------------------------------
      // Public Data - Already in the correct format
      // ------------------------------------------------------------------------------
      // Business name was never encrypted or tokenized, just pass through
      business_name: secureData.business_name,
      
      // ------------------------------------------------------------------------------
      // Detokenize Sensitive Data - Exchange Tokens for Real Numbers
      // ------------------------------------------------------------------------------
      // Step 1: Detokenize routing number
      // Takes "tok_routing_abc-def-123" and returns "123456789"
      // This involves:
      //   1. Looking up the token in the token map
      //   2. Retrieving the encrypted data
      //   3. Decrypting the data
      //   4. Returning the original routing number
      routing_number: this.detokenize(secureData.routing_number_token),
      
      // Step 2: Detokenize account number
      // Same process as routing number - exchange token for real account number
      account_number: this.detokenize(secureData.account_number_token)
    };
  }
}

// ==============================================================================
// EXPORT THE SERVICE
// ==============================================================================
// Create a single instance of SecurityService and export it
// This is called the "Singleton Pattern" - there's only one instance
// shared across the entire application
//
// WHY SINGLETON:
// - Ensures all parts of the app use the same token map
// - Maintains consistent encryption settings
// - More memory efficient than creating multiple instances
//
// USAGE IN OTHER FILES:
//   const security = require('./security/encryption');
//   const encrypted = security.encrypt('sensitive data');
module.exports = new SecurityService();