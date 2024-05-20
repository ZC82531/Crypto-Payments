// ==============================================================================
// CHARGE GENERATOR - Coinbase Commerce Payment Creation
// ==============================================================================
// This file handles creating cryptocurrency payment charges using Coinbase Commerce.
// When a customer wants to pay with crypto, we call this to create a hosted
// payment page where they can complete the transaction.
//
// WHAT IS COINBASE COMMERCE?
// Coinbase Commerce is a service that lets businesses accept cryptocurrency
// payments without managing crypto wallets themselves. Think of it like PayPal,
// but for Bitcoin, Ethereum, and other cryptocurrencies.
//
// HOW IT WORKS:
// 1. Customer enters payment amount on our site
// 2. We call createCharge() with the amount
// 3. Coinbase creates a unique payment URL
// 4. Customer visits that URL and pays with crypto
// 5. Coinbase converts crypto to USD and deposits to our account
//
// PRICING NOTE:
// We use "fixed_price" which means customer pays exactly the USD amount specified,
// regardless of crypto price fluctuations during the transaction.

// ==============================================================================
// CREATE CHARGE - Generate Coinbase Commerce Payment Request
// ==============================================================================
// Creates a new cryptocurrency payment charge through Coinbase Commerce API.
//
// PARAMETERS:
//   amount: Dollar amount to charge (e.g., 25.50 for $25.50)
//
// RETURNS:
//   - Charge object from Coinbase (includes hosted_url for payment)
//   - null if charge creation failed
//
// CHARGE OBJECT INCLUDES:
//   - hosted_url: Where customer goes to complete payment
//   - id: Unique charge identifier
//   - pricing: Crypto amounts for different currencies
//   - expires_at: When this charge expires
//
// API DOCUMENTATION:
// https://commerce.coinbase.com/docs/api/#create-a-charge
const createCharge = async (amount) => {
    // --------------------------------------------------------------------------
    // Step 1: Validate Amount
    // --------------------------------------------------------------------------
    // Make sure amount is provided and is a valid number
    // isNaN = "is Not a Number" - returns true if value can't be converted to number
    if (!amount || isNaN(amount)) {
      throw new Error('Invalid amount provided.');
    }
  
    // --------------------------------------------------------------------------
    // Step 2: Set Coinbase Commerce API Endpoint
    // --------------------------------------------------------------------------
    // This is the URL we'll send our payment request to
    // Coinbase will process the request and return charge details
    const url = 'https://api.commerce.coinbase.com/charges';
  
    // --------------------------------------------------------------------------
    // Step 3: Build Request Body
    // --------------------------------------------------------------------------
    // Create the charge configuration object that Coinbase requires
    const requestBody = {
      // local_price: The amount in the merchant's local currency
      local_price: {
        amount: amount.toFixed(2),  // Convert to string with 2 decimal places (e.g., "25.50")
        currency: 'USD',            // We charge in US Dollars
      },
      
      // pricing_type: How the price is determined
      // 'fixed_price' = Customer pays exact USD amount specified
      // Alternative would be 'no_price' for donation-style payments
      pricing_type: 'fixed_price',
      
      // name: Short description of the charge (appears on payment page)
      name: 'Merchant Charge', 
      
      // description: Longer explanation (appears on payment page)
      description: 'Payable to Merchant',
      
      // redirect_url: Where to send customer after payment completes
      // Empty string = customer stays on Coinbase page
      // Could set to: window.location.origin + '/payment-success'
      redirect_url: '',
      
      // metadata: Custom data to attach to charge (for tracking purposes)
      // Could include: order ID, customer ID, product info, etc.
      // Currently empty, but useful for connecting payments to orders
      metadata: {},
    };
  
    // --------------------------------------------------------------------------
    // Step 4: Configure HTTP Request
    // --------------------------------------------------------------------------
    // Set up the fetch request with headers and body
    const payload = {
      // HTTP method: POST = creating new resource
      method: 'POST',
      
      // Headers: Metadata about the request
      headers: {
        // Accept: What format we want the response in
        Accept: 'application/json',
        
        // Content-Type: Format of data we're sending
        'Content-Type': 'application/json',
        
        // X-CC-Api-Key: Your Coinbase Commerce API key (authentication)
        // Loaded from environment variable for security
        // NEVER hardcode API keys in source code!
        'X-CC-Api-Key': import.meta.env.VITE_COINBASE_API_KEY || '',
      },
      
      // body: The actual data being sent
      // JSON.stringify converts JavaScript object to JSON string
      body: JSON.stringify(requestBody),
    };
  
    // --------------------------------------------------------------------------
    // Step 5: Send Request to Coinbase
    // --------------------------------------------------------------------------
    try {
      // Make the HTTP request to Coinbase API
      const response = await fetch(url, payload);
      
      // Check if request was successful
      // response.ok = true if status code is 200-299
      if (!response.ok) {
        // Request failed (400, 500 errors, etc.)
        throw new Error(`HTTP error Status: ${response.status}`);
      }
      
      // Parse the JSON response from Coinbase
      // This contains the charge object with hosted_url and other details
      return await response.json();
      
    } catch (error) {
      // --------------------------------------------------------------------------
      // Error Handling
      // --------------------------------------------------------------------------
      // If anything goes wrong (network error, API error, etc.), log it
      console.error("Error creating charge:", error);
      
      // Return null to indicate failure
      // Calling code should check for null and show error message to user
      return null;
    }
  };
  
  // ==============================================================================
  // EXPORT FUNCTION
  // ==============================================================================
  // Make createCharge available for import in other files
  //
  // USAGE EXAMPLE:
  //   import { createCharge } from './chargeGenerator';
  //   const charge = await createCharge(25.50);
  //   if (charge) {
  //     window.location.href = charge.data.hosted_url;
  //   }
  export { createCharge };
