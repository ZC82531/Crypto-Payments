const createCharge = async (amount) => {
    if (!amount || isNaN(amount)) {
      throw new Error('Invalid amount provided.');
    }
  
    const url = 'https://api.commerce.coinbase.com/charges';
  
    const requestBody = {
      local_price: {
        amount: amount.toFixed(2),
        currency: 'USD',
      },
      pricing_type: 'fixed_price',
      name: 'Merchant Charge', 
      description: 'Payable to Merchant',
      redirect_url: '', // Optional redirect URL
      metadata: {},
    };
  
    const payload = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CC-Api-Key': '7b30ee86-02c4-4baa-995a-db8a6a2e1285',
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
  