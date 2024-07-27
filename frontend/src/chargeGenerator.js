import dotenv from 'dotenv'; // Import dotenv
import fetch from 'node-fetch'; // Ensure fetch is available

dotenv.config(); // Load environment variables

const createCharge = async (amount, username) => {
  if (!amount || isNaN(amount)) {
    throw new Error('Invalid amount provided.');
  }

  const url = 'https://api.commerce.coinbase.com/charges';


  const redirectUrl = `${process.env.BASE_URL}/payment-success?username=${encodeURIComponent(username)}&amount=${amount.toFixed(2)}`;

  const requestBody = {
    local_price: {
      amount: amount.toFixed(2),
      currency: 'USD',
    },
    pricing_type: 'fixed_price',
    name: 'Merchant Charge',
    description: 'Payable to Merchant',
    redirect_url: redirectUrl,
    metadata: {},
  };

  const payload = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-CC-Api-Key': process.env.COINBASE_API_KEY, // Use the API key from environment variables
    },
    body: JSON.stringify(requestBody),
  };

  try {
    const response = await fetch(url, payload);
    if (!response.ok) {
      throw new Error(`HTTP error Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error creating charge:", error);
    return null;
  }
};

export { createCharge };
