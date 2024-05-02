// ==============================================================================
// KEY MANAGER - Encryption Key Management and Rotation System
// ==============================================================================
// This file manages encryption keys throughout their lifecycle: creation, storage,
// rotation, and access control. Think of it as a sophisticated key ring system
// where keys can be rotated periodically for security, but old keys are kept to
// decrypt data that was encrypted with them.
//
// WHY KEY MANAGEMENT MATTERS:
// - Security best practice is to rotate encryption keys regularly
// - If a key is compromised, we can rotate to a new one
// - Old data encrypted with old keys still needs to be decryptable
// - Need to track which key version was used for each piece of data
// - Control who has access to which keys
//
// KEY CONCEPTS:
// - Master Key: The "key to the keys" - used to encrypt other encryption keys
// - Encryption Keys: The keys actually used to encrypt user data
// - Key Rotation: Periodically switching to a new encryption key
// - Key History: Keeping old keys around so old data can still be decrypted

// ------------------------------------------------------------------------------
// Required Libraries
// ------------------------------------------------------------------------------
// crypto: Node.js built-in library for encryption and random number generation
const crypto = require('crypto');

// fs: File system library (for potential future key storage in files)
const fs = require('fs');

// dotenv: Loads environment variables from .env file
// This is where we store the master key and encryption key
require('dotenv').config();

// ==============================================================================
// KEY MANAGER CLASS
// ==============================================================================
// Manages the entire lifecycle of encryption keys
class KeyManager {
  constructor() {
    // ------------------------------------------------------------------------------
    // Configuration Settings
    // ------------------------------------------------------------------------------
    // Step 1: Set how often keys should be rotated
    // 24 * 60 * 60 * 1000 = 24 hours in milliseconds
    // This means every 24 hours, we should switch to a new encryption key
    // WHY ROTATE? If someone steals a key, we limit how much data they can decrypt
    this.keyRotationInterval = 24 * 60 * 60 * 1000; // 24 hours
    
    // Step 2: Create storage for key history
    // This Map stores all encryption keys that have ever been used
    // Key: key ID (like "key_abc_123")
    // Value: key data (encrypted key, creation time, status, etc.)
    // NOTE: In production, this should be in a secure database, not in memory
    this.keyHistory = new Map();
    
    // Step 3: Track which key is currently active
    // This ID points to the key we're using right now for new encryptions
    // When we rotate keys, this ID gets updated to the new key
    this.currentKeyId = null;
    
    // Step 4: Initialize the key system
    // This loads or creates the keys we need to start encrypting data
    this.initializeKeys();
  }

  // ==============================================================================
  // INITIALIZE KEYS - Set Up the Key Management System
  // ==============================================================================
  // This function runs when the KeyManager is first created. It ensures we have
  // all the keys needed to start encrypting data.
  //
  // TWO-TIER KEY SYSTEM:
  // 1. Master Key: Used to encrypt other keys (the "key to the keys")
  // 2. Encryption Keys: Used to encrypt actual user data
  //
  // WHY TWO TIERS?
  // - Master key never changes (stored securely, never rotated)
  // - Encryption keys rotate regularly (encrypted by master key)
  // - If we need to rotate encryption keys, we don't have to re-encrypt everything
  initializeKeys() {
    // ------------------------------------------------------------------------------
    // Step 1: Check for Master Key
    // ------------------------------------------------------------------------------
    // The master key should be in the environment variables (.env file)
    // If it's not there, we need to generate one
    if (!process.env.MASTER_KEY) {
      console.warn('⚠️  No MASTER_KEY found. Generating new master key...');
      // Generate a new master key and display it
      // NOTE: In production, this should be done once manually and stored securely
      this.generateMasterKey();
    }
    
    // ------------------------------------------------------------------------------
    // Step 2: Load or Create Current Encryption Key
    // ------------------------------------------------------------------------------
    // Load the encryption key that will be used for actual data encryption
    // If none exists, this will generate a new one
    this.loadCurrentKey();
  }

  // ==============================================================================
  // GENERATE MASTER KEY - Create the Key to the Keys
  // ==============================================================================
  // The master key is the most important key in the system. It encrypts all other
  // encryption keys. Think of it as the master key to a hotel - it opens all rooms.
  //
  // SECURITY CRITICAL:
  // - This should only be run ONCE when setting up the system
  // - The generated key MUST be stored securely (like AWS Secrets Manager, Azure Key Vault)
  // - If this key is lost, ALL encrypted data becomes unrecoverable
  // - If this key is stolen, attacker can decrypt everything
  //
  // RETURNS:
  //   A 64-character hex string that should be saved to environment variables
  generateMasterKey() {
    // ------------------------------------------------------------------------------
    // Generate Random Key
    // ------------------------------------------------------------------------------
    // Step 1: Generate 32 random bytes (256 bits of randomness)
    // Why 32 bytes? AES-256 encryption requires a 256-bit key (32 bytes * 8 bits = 256 bits)
    // crypto.randomBytes uses the operating system's secure random number generator
    // This is cryptographically secure - truly random, not predictable
    const masterKey = crypto.randomBytes(32).toString('hex');
    
    // ------------------------------------------------------------------------------
    // Display Key to User
    // ------------------------------------------------------------------------------
    // Step 1: Print instructions to the console
    console.log('🔐 Generated Master Key. Please add to your environment:');
    console.log(`MASTER_KEY=${masterKey}`);
    console.log('');
    console.log('IMPORTANT:');
    console.log('1. Copy the line above to your .env file');
    console.log('2. NEVER commit this key to version control');
    console.log('3. Store it in a secure password manager');
    console.log('4. In production, use a key management service like AWS KMS');
    
    // Step 2: Return the key
    // The developer needs to manually copy this to their .env file
    return masterKey;
  }

  // ==============================================================================
  // GENERATE ENCRYPTION KEY - Create a New Key for Data Encryption
  // ==============================================================================
  // This function creates a new encryption key that will be used to encrypt user data.
  // Unlike the master key (which never changes), encryption keys are rotated regularly.
  //
  // KEY VERSIONING:
  // Each encryption key gets a unique ID and version number. This way, we can track
  // which key was used to encrypt each piece of data, and we can keep old keys around
  // to decrypt old data.
  //
  // RETURNS:
  //   Object containing the key data, metadata, and encrypted version
  generateEncryptionKey() {
    // ------------------------------------------------------------------------------
    // Step 1: Generate Unique Identifier
    // ------------------------------------------------------------------------------
    // Create a UUID (Universally Unique Identifier) for this key
    // Example: "abc-123-def-456-ghi-789"
    // This ensures each key can be identified and retrieved later
    const keyId = crypto.randomUUID();
    
    // ------------------------------------------------------------------------------
    // Step 2: Generate the Actual Encryption Key
    // ------------------------------------------------------------------------------
    // Create 32 random bytes (256 bits) for AES-256 encryption
    // This is the actual key that will encrypt/decrypt data
    // Stored as a Buffer (raw binary data), not a string
    const key = crypto.randomBytes(32);
    
    // ------------------------------------------------------------------------------
    // Step 3: Record Creation Time
    // ------------------------------------------------------------------------------
    // Store when this key was created (timestamp in milliseconds)
    // Useful for:
    //   - Determining when to rotate keys
    //   - Audit logs and compliance reports
    //   - Troubleshooting issues with old data
    const timestamp = Date.now();
    
    // ------------------------------------------------------------------------------
    // Step 4: Build Key Data Object
    // ------------------------------------------------------------------------------
    const keyData = {
      id: keyId,                           // Unique identifier for this key
      key: key,                            // The actual 32-byte encryption key
      created: timestamp,                  // When this key was created
      version: this.getNextKeyVersion(),   // Sequential version number (1, 2, 3, ...)
      status: 'active'                     // Status: 'active', 'deprecated', or 'revoked'
    };

    // ------------------------------------------------------------------------------
    // Step 5: Encrypt the Key with Master Key
    // ------------------------------------------------------------------------------
    // We don't store encryption keys in plain text, even in our own system
    // Instead, we encrypt them with the master key
    // This way, even if someone steals our key database, they can't use the keys
    // without the master key
    const encryptedKey = this.encryptWithMasterKey(key);
    
    // ------------------------------------------------------------------------------
    // Step 6: Return Complete Key Package
    // ------------------------------------------------------------------------------
    // Return both the key data and its encrypted version
    return {
      ...keyData,        // All the key metadata (id, version, created, status)
      encryptedKey       // The encrypted version of the key (safe to store)
    };
  }

  // ==============================================================================
  // ENCRYPT WITH MASTER KEY - Lock an Encryption Key
  // ==============================================================================
  // This function encrypts an encryption key using the master key. Yes, we encrypt
  // keys with other keys! This is called "key wrapping" in cryptography.
  //
  // WHY ENCRYPT KEYS?
  // - Even if someone steals our key database, they can't use the keys
  // - The master key is stored separately (environment variable or key vault)
  // - Provides an extra layer of security (defense in depth)
  //
  // PARAMETERS:
  //   keyToEncrypt: The encryption key we want to protect (32 bytes)
  //
  // RETURNS:
  //   Object with encrypted key data and the IV used
  encryptWithMasterKey(keyToEncrypt) {
    // ------------------------------------------------------------------------------
    // Step 1: Load and Validate Master Key
    // ------------------------------------------------------------------------------
    // Get the master key from environment variables and convert from hex to Buffer
    const masterKey = Buffer.from(process.env.MASTER_KEY || '', 'hex');
    
    // Verify the master key is the correct length (32 bytes = 256 bits)
    // If it's not, someone probably configured it wrong
    if (masterKey.length !== 32) {
      throw new Error('Invalid master key length');
    }

    // ------------------------------------------------------------------------------
    // Step 2: Generate IV (Initialization Vector)
    // ------------------------------------------------------------------------------
    // Create a random 16-byte IV for this encryption operation
    // Each key gets encrypted with a different IV for maximum security
    const iv = crypto.randomBytes(16);
    
    // ------------------------------------------------------------------------------
    // Step 3: Create Cipher and Encrypt
    // ------------------------------------------------------------------------------
    // Create a cipher using AES-256-CBC (same algorithm as main encryption)
    const cipher = crypto.createCipheriv('aes-256-cbc', masterKey, iv);
    
    // Encrypt the key (convert raw bytes to hex string)
    let encrypted = cipher.update(keyToEncrypt, null, 'hex');
    encrypted += cipher.final('hex');
    
    // ------------------------------------------------------------------------------
    // Step 4: Return Encrypted Key Package
    // ------------------------------------------------------------------------------
    // Return both the encrypted key and the IV used
    // We need to store both because decryption requires the same IV
    return {
      encrypted,            // The encrypted key (hex string)
      iv: iv.toString('hex') // The IV used for this encryption (hex string)
    };
  }

  // ==============================================================================
  // DECRYPT WITH MASTER KEY - Unlock an Encryption Key
  // ==============================================================================
  // This function decrypts an encrypted encryption key so it can be used.
  // It's the reverse of encryptWithMasterKey().
  //
  // PARAMETERS:
  //   encryptedKeyData: Object with encrypted key and IV (from encryptWithMasterKey)
  //
  // RETURNS:
  //   The decrypted key as a Buffer (raw 32 bytes)
  decryptWithMasterKey(encryptedKeyData) {
    // ------------------------------------------------------------------------------
    // Step 1: Load Master Key
    // ------------------------------------------------------------------------------
    // Get the master key from environment variables (convert hex to Buffer)
    const masterKey = Buffer.from(process.env.MASTER_KEY || '', 'hex');
    
    // ------------------------------------------------------------------------------
    // Step 2: Retrieve IV
    // ------------------------------------------------------------------------------
    // Get the IV that was used during encryption (convert hex string to Buffer)
    // We MUST use the same IV that was used for encryption, or decryption will fail
    const iv = Buffer.from(encryptedKeyData.iv, 'hex');
    
    // ------------------------------------------------------------------------------
    // Step 3: Create Decipher and Decrypt
    // ------------------------------------------------------------------------------
    // Create a decipher using the same algorithm (AES-256-CBC)
    const decipher = crypto.createDecipheriv('aes-256-cbc', masterKey, iv);
    
    // Decrypt the key (convert from hex string back to raw bytes)
    let decrypted = decipher.update(encryptedKeyData.encrypted, 'hex');
    
    // Complete the decryption and combine the results
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    // ------------------------------------------------------------------------------
    // Step 4: Return Decrypted Key
    // ------------------------------------------------------------------------------
    // Return the key as a Buffer (raw 32 bytes)
    // This can now be used to encrypt or decrypt user data
    return decrypted;
  }

  // ==============================================================================
  // LOAD CURRENT KEY - Initialize Active Encryption Key
  // ==============================================================================
  // This function runs at startup to load or create the encryption key that will
  // be used for new data encryption operations.
  //
  // TWO MODES:
  // 1. Development: Use simple environment variable key (ENCRYPTION_KEY)
  // 2. Production: Use key manager with rotation support
  loadCurrentKey() {
    // ------------------------------------------------------------------------------
    // Development Mode: Use Environment Variable Key
    // ------------------------------------------------------------------------------
    // Step 1: Check if there's an ENCRYPTION_KEY in environment variables
    // This is the simple setup for development/testing
    if (process.env.ENCRYPTION_KEY) {
      // Mark this as the 'env_key' (special ID for environment-based key)
      this.currentKeyId = 'env_key';
      
      // We're done - just use the environment key for everything
      // No key rotation, no key history, simple and straightforward
      return;
    }

    // ------------------------------------------------------------------------------
    // Production Mode: Use Key Manager with Rotation
    // ------------------------------------------------------------------------------
    // Step 1: Generate a brand new encryption key
    // This creates a properly versioned key with full metadata
    const newKey = this.generateEncryptionKey();
    
    // Step 2: Store the key in our key history
    // This allows us to look it up later by ID
    this.keyHistory.set(newKey.id, newKey);
    
    // Step 3: Mark this as the current active key
    // All new encryption operations will use this key
    this.currentKeyId = newKey.id;
    
    console.log(`🔑 Loaded encryption key: ${newKey.id} (version ${newKey.version})`);
  }

  // ==============================================================================
  // GET CURRENT KEY - Retrieve Active Encryption Key
  // ==============================================================================
  // This function returns the encryption key that should be used for new encryption
  // operations right now. It's the key pointed to by currentKeyId.
  //
  // RETURNS:
  //   Buffer containing the 32-byte encryption key
  getCurrentKey() {
    // ------------------------------------------------------------------------------
    // Environment Key Mode
    // ------------------------------------------------------------------------------
    // Step 1: Check if we're using the simple environment variable key
    if (this.currentKeyId === 'env_key') {
      // Return the key from environment variables (convert hex to Buffer)
      return Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    }
    
    // ------------------------------------------------------------------------------
    // Key Manager Mode
    // ------------------------------------------------------------------------------
    // Step 1: Look up the current key in our key history
    const keyData = this.keyHistory.get(this.currentKeyId);
    
    // Step 2: Verify we found the key
    // If the currentKeyId doesn't exist in history, something is very wrong
    if (!keyData) {
      throw new Error('Current encryption key not found');
    }
    
    // Step 3: Decrypt the key using the master key
    // Remember: Keys are stored encrypted, we need to decrypt them before use
    return this.decryptWithMasterKey(keyData.encryptedKey);
  }

  // ==============================================================================
  // GET KEY BY ID - Retrieve a Specific Key Version
  // ==============================================================================
  // This function retrieves a specific encryption key by its ID. This is critical
  // for decrypting old data that was encrypted with a previous key version.
  //
  // EXAMPLE SCENARIO:
  // - 6 months ago, data was encrypted with key version 1
  // - Since then, we've rotated keys 3 times
  // - Now we need to decrypt that old data
  // - We use getKeyById('version_1_id') to get the old key
  //
  // PARAMETERS:
  //   keyId: The unique identifier of the key we need
  //
  // RETURNS:
  //   Buffer containing the decrypted key, or null if key not found
  getKeyById(keyId) {
    // ------------------------------------------------------------------------------
    // Environment Key Mode
    // ------------------------------------------------------------------------------
    // Step 1: Check if they're asking for the environment key
    if (keyId === 'env_key') {
      // Return the key from environment variables
      return Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    }
    
    // ------------------------------------------------------------------------------
    // Key Manager Mode
    // ------------------------------------------------------------------------------
    // Step 1: Look up the requested key in our history
    const keyData = this.keyHistory.get(keyId);
    
    // Step 2: If key doesn't exist, return null
    // This could happen if:
    //   - Key was revoked and deleted
    //   - Wrong key ID was provided
    //   - Data corruption
    if (!keyData) {
      console.warn(`⚠️  Key ${keyId} not found in key history`);
      return null;
    }
    
    // Step 3: Decrypt and return the key
    // Keys are stored encrypted, decrypt with master key before returning
    return this.decryptWithMasterKey(keyData.encryptedKey);
  }

  // ==============================================================================
  // ROTATE KEY - Switch to a New Encryption Key
  // ==============================================================================
  // Key rotation is a critical security practice. Periodically switching to a new
  // encryption key limits the damage if a key is ever compromised.
  //
  // WHAT HAPPENS DURING ROTATION:
  // 1. Old key is marked as "deprecated" (but NOT deleted)
  // 2. New key is generated and becomes the active key
  // 3. New data gets encrypted with the new key
  // 4. Old data can still be decrypted with the old key
  //
  // REAL-WORLD ANALOGY:
  // Like changing the locks on your house:
  //   - You install new locks (new key becomes active)
  //   - You keep the old keys just in case (deprecated, but not deleted)
  //   - Future visitors use the new lock (new encryptions use new key)
  //   - Old items locked with old key can still be unlocked
  //
  // RETURNS:
  //   The ID of the new key
  rotateKey() {
    // ------------------------------------------------------------------------------
    // Step 1: Deprecate Current Key
    // ------------------------------------------------------------------------------
    // If we're using the key manager (not just environment variable)
    if (this.currentKeyId !== 'env_key') {
      // Look up the current key in our history
      const currentKey = this.keyHistory.get(this.currentKeyId);
      
      if (currentKey) {
        // Mark it as deprecated (no longer used for new encryptions)
        currentKey.status = 'deprecated';
        
        // Record when it was deprecated (for audit trail)
        currentKey.deprecated = Date.now();
        
        // NOTE: We do NOT delete the key! Old data still needs it for decryption
      }
    }

    // ------------------------------------------------------------------------------
    // Step 2: Generate New Key
    // ------------------------------------------------------------------------------
    // Create a brand new encryption key with a new ID and version
    const newKey = this.generateEncryptionKey();
    
    // Store it in our key history so we can retrieve it later
    this.keyHistory.set(newKey.id, newKey);
    
    // ------------------------------------------------------------------------------
    // Step 3: Make New Key Active
    // ------------------------------------------------------------------------------
    // Update currentKeyId to point to the new key
    // All future encryption operations will now use this key
    this.currentKeyId = newKey.id;

    // ------------------------------------------------------------------------------
    // Step 4: Log the Rotation
    // ------------------------------------------------------------------------------
    console.log(`🔄 Key rotated. New key ID: ${newKey.id}`);
    console.log(`   Previous keys are still available for decryption`);
    
    // Return the new key ID (might be useful for logging/audit)
    return newKey.id;
  }

  // ==============================================================================
  // GET NEXT KEY VERSION - Calculate Version Number for New Key
  // ==============================================================================
  // Each encryption key gets a sequential version number (1, 2, 3, ...).
  // This function calculates what the next version number should be.
  //
  // WHY VERSION NUMBERS:
  // - Easy to track key progression (key v1 → v2 → v3)
  // - Useful in logs ("Data encrypted with key version 5")
  // - Helps with key lifecycle management
  //
  // RETURNS:
  //   Next version number (integer)
  getNextKeyVersion() {
    // ------------------------------------------------------------------------------
    // Step 1: Get All Existing Version Numbers
    // ------------------------------------------------------------------------------
    // Extract the version number from each key in our history
    // Array.from() converts the Map values to an array
    // .map() transforms each key object to just its version number
    const versions = Array.from(this.keyHistory.values()).map(k => k.version || 0);
    
    // ------------------------------------------------------------------------------
    // Step 2: Find the Highest Version Number
    // ------------------------------------------------------------------------------
    // Math.max() finds the largest version number
    // If there are no keys yet, use 0 as the starting point
    // Then add 1 to get the next version
    //
    // Examples:
    //   - No keys yet: max(0) = 0, return 0 + 1 = 1
    //   - Keys v1, v2, v3: max(1, 2, 3) = 3, return 3 + 1 = 4
    return Math.max(0, ...versions) + 1;
  }

  // ==============================================================================
  // VALIDATE KEY ACCESS - Check if User Can Access Encryption Keys
  // ==============================================================================
  // This function implements access control for encryption keys. Not every user
  // should be able to perform every operation.
  //
  // SECURITY PRINCIPLE: Principle of Least Privilege
  // Users should only have access to what they absolutely need. For example:
  //   - Regular users can encrypt their own data
  //   - Only admins can rotate keys
  //   - Only admins can view key metadata
  //
  // PARAMETERS:
  //   userId: Who is trying to access the key
  //   operation: What they want to do ('encrypt', 'decrypt', 'rotate', 'view')
  //
  // RETURNS:
  //   true if access is granted, false if denied
  validateKeyAccess(userId, operation) {
    // ------------------------------------------------------------------------------
    // Step 1: Define Access Control Rules
    // ------------------------------------------------------------------------------
    // This object defines who can perform which operations
    // Key: operation name
    // Value: array of roles allowed to perform that operation
    const allowedOperations = {
      // Anyone can encrypt data (users encrypt their own data)
      'encrypt': ['admin', 'service', 'user'],
      
      // Anyone can decrypt data (but decryption also checks if they own the data)
      'decrypt': ['admin', 'service', 'user'],
      
      // Only admins can rotate keys (high-security operation)
      'rotate': ['admin'],
      
      // Only admins can view key metadata (sensitive information)
      'view': ['admin']
    };

    // ------------------------------------------------------------------------------
    // Step 2: Determine User's Role
    // ------------------------------------------------------------------------------
    // Get the role for this userId
    // In production, this would check your authentication system
    const userRole = this.getUserRole(userId);
    
    // ------------------------------------------------------------------------------
    // Step 3: Check if Role is Allowed
    // ------------------------------------------------------------------------------
    // Look up which roles are allowed for this operation
    // Then check if this user's role is in that list
    // The ? is optional chaining - returns undefined if operation doesn't exist
    const allowed = allowedOperations[operation]?.includes(userRole);
    
    // ------------------------------------------------------------------------------
    // Step 4: Log the Access Decision
    // ------------------------------------------------------------------------------
    if (!allowed) {
      // Access denied - log a warning
      console.warn(`🚫 Access denied: User ${userId} (${userRole}) cannot perform ${operation}`);
      return false;
    }

    // Access granted - log for audit trail
    console.log(`✅ Access granted: User ${userId} (${userRole}) can perform ${operation}`);
    return true;
  }

  // ==============================================================================
  // GET USER ROLE - Determine User's Permission Level
  // ==============================================================================
  // This function determines what role/permission level a user has.
  // In production, this would check your actual authentication/authorization system.
  //
  // ROLES:
  //   - admin: Full access to everything
  //   - service: Backend service accounts (API keys, background jobs)
  //   - user: Regular users (limited access)
  //
  // PARAMETERS:
  //   userId: The user identifier
  //
  // RETURNS:
  //   Role string: 'admin', 'service', or 'user'
  getUserRole(userId) {
    // ------------------------------------------------------------------------------
    // Mock Implementation
    // ------------------------------------------------------------------------------
    // NOTE: In production, replace this with actual role lookup from database
    // For example:
    //   - const user = await database.users.findById(userId);
    //   - return user.role;
    
    // Step 1: Check if it's a system/service account
    // 'system' and 'service' are special userIds used by the backend
    if (userId === 'system' || userId === 'service') return 'service';
    
    // Step 2: Check if it's an admin
    // In production, check if userId exists in admin list or has admin flag
    if (userId === 'admin') return 'admin';
    
    // Step 3: Default to regular user
    // If not system/service/admin, assume it's a regular user
    return 'user';
  }

  // ==============================================================================
  // DERIVE USER KEY - Create User-Specific Encryption Key
  // ==============================================================================
  // This function creates a unique encryption key for each user. Even though we
  // have a master encryption key, we derive user-specific keys for extra security.
  //
  // WHY USER-SPECIFIC KEYS:
  // - If one user's key is compromised, others remain secure
  // - Allows for user-level key rotation
  // - Enables user data isolation
  // - Compliance with data privacy regulations
  //
  // HOW IT WORKS:
  // Uses a key derivation function (KDF) to generate a unique key based on:
  //   1. The base encryption key
  //   2. The user's ID
  //   3. The purpose (what the key will be used for)
  //
  // PARAMETERS:
  //   userId: The unique identifier for the user
  //   purpose: What this key will be used for (default: 'encryption')
  //
  // RETURNS:
  //   Buffer containing a 32-byte user-specific encryption key
  deriveUserKey(userId, purpose = 'encryption') {
    // ------------------------------------------------------------------------------
    // Step 1: Get the Base Encryption Key
    // ------------------------------------------------------------------------------
    // Start with the current active encryption key
    // This is the "seed" we'll use to generate user-specific keys
    const baseKey = this.getCurrentKey();
    
    // ------------------------------------------------------------------------------
    // Step 2: Create User-Specific Salt
    // ------------------------------------------------------------------------------
    // Combine userId and purpose into a single string, then hash it
    // This creates a unique salt for each user and purpose combination
    //
    // Examples:
    //   - User "user_123" + "encryption" → hash → unique salt A
    //   - User "user_456" + "encryption" → hash → unique salt B
    //   - User "user_123" + "signing" → hash → unique salt C
    const userSalt = crypto.createHash('sha256')
                          .update(userId + purpose)  // Combine userId and purpose
                          .digest();                 // Get the hash as a Buffer
    
    // ------------------------------------------------------------------------------
    // Step 3: Derive User-Specific Key
    // ------------------------------------------------------------------------------
    // Use PBKDF2 (Password-Based Key Derivation Function 2) to derive the key
    // Parameters explained:
    //   - baseKey: The starting key (current encryption key)
    //   - userSalt: The user-specific salt we just created
    //   - 10000: Number of iterations (more = slower but more secure)
    //   - 32: Output length in bytes (256 bits for AES-256)
    //   - 'sha256': The hash function to use
    //
    // RESULT:
    // Each user gets a unique 32-byte key that's mathematically derived from
    // the base key but can't be reverse-engineered to get the base key
    return crypto.pbkdf2Sync(baseKey, userSalt, 10000, 32, 'sha256');
  }

  // ==============================================================================
  // AUDIT KEY OPERATION - Log Key Usage for Security Monitoring
  // ==============================================================================
  // This function creates a detailed log entry every time someone uses an encryption
  // key. This is critical for security compliance and incident investigation.
  //
  // WHY AUDIT LOGS MATTER:
  // - Track who accessed what data and when
  // - Detect suspicious patterns (e.g., 1000 decryptions in 1 second)
  // - Required for compliance (GDPR, HIPAA, PCI-DSS)
  // - Helps investigate security incidents
  // - Provides accountability
  //
  // REAL-WORLD ANALOGY:
  // Like a security camera log in a bank vault - records every time someone
  // opens the vault, what they did, and whether they had authorization.
  //
  // PARAMETERS:
  //   operation: What was done ('encrypt', 'decrypt', 'rotate', 'tokenize')
  //   userId: Who performed the operation
  //   keyId: Which key was used (optional, defaults to current key)
  //   success: Whether the operation succeeded (true) or failed (false)
  //
  // RETURNS:
  //   The audit entry object (for further logging/storage if needed)
  auditKeyOperation(operation, userId, keyId = null, success = true) {
    // ------------------------------------------------------------------------------
    // Step 1: Build Audit Entry
    // ------------------------------------------------------------------------------
    // Create a comprehensive log entry with all relevant information
    const auditEntry = {
      // When did this happen (ISO 8601 timestamp)
      timestamp: new Date().toISOString(),
      
      // What operation was performed
      operation,
      
      // Who performed it
      userId,
      
      // Which key was involved (or current key if not specified)
      keyId: keyId || this.currentKeyId,
      
      // Did it succeed or fail
      success,
      
      // Where did the request come from (IP address)
      // NOTE: In production, get actual IP from request object
      ip: 'system',
      
      // What software made the request (user agent)
      // NOTE: In production, get actual user agent from request headers
      userAgent: 'key-manager'
    };

    // ------------------------------------------------------------------------------
    // Step 2: Log to Console
    // ------------------------------------------------------------------------------
    // Print the audit entry to the console
    // In production, this should go to:
    //   - Centralized logging system (CloudWatch, Splunk, ELK stack)
    //   - Secure audit database (append-only, tamper-proof)
    //   - SIEM (Security Information and Event Management) system
    console.log('🔍 KEY AUDIT:', JSON.stringify(auditEntry));
    
    // ------------------------------------------------------------------------------
    // Step 3: Additional Processing (Production)
    // ------------------------------------------------------------------------------
    // In production, you would also:
    // - Store in secure audit database
    // - Send alerts for suspicious activity
    // - Update metrics dashboards
    // - Check against security rules (e.g., too many failed attempts)
    //
    // Example:
    //   if (!success && operation === 'decrypt') {
    //     alertSecurityTeam('Failed decryption attempt', auditEntry);
    //   }
    
    // ------------------------------------------------------------------------------
    // Step 4: Return Audit Entry
    // ------------------------------------------------------------------------------
    // Return the entry in case the caller wants to do additional logging
    return auditEntry;
  }
}

// ==============================================================================
// EXPORT THE KEY MANAGER
// ==============================================================================
// Create a single instance of KeyManager and export it (Singleton pattern)
//
// WHY SINGLETON:
// - Ensures there's only one key manager in the entire application
// - All parts of the app share the same key history and current key
// - Prevents conflicts from multiple key managers
// - More efficient than creating new instances
//
// USAGE IN OTHER FILES:
//   const keyManager = require('./security/keyManager');
//   const key = keyManager.getCurrentKey();
module.exports = new KeyManager();