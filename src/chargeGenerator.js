// Calls our backend which uses NowPayments to create a hosted crypto invoice.
// Note: Coinbase Commerce was deprecated in 2025 (free API removed, identity
// verification now required for the CDP replacement). Migrated to NowPayments.
import { API_CONFIG } from './config/api.js';

const createCharge = async (amount) => {
  if (!amount || isNaN(amount)) {
    throw new Error('Invalid amount provided.');
  }

  const response = await fetch(`${API_CONFIG.baseURL}/api/create-payment-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Payment provider error: ${response.status}`);
  }

  const data = await response.json();

  // Normalise to the shape the rest of the app expects: { data: { hosted_url, id } }
  return {
    data: {
      hosted_url: data.url,
      id: data.id,
    },
  };
};

export { createCharge };
