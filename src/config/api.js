/**
 * API Configuration
 * 
 * Centralized configuration for API endpoints.
 * Uses environment variables to support different deployment environments.
 */

// Get API URL from Vite environment variables (set in Netlify dashboard for production)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Ensure no trailing slash
const baseURL = API_URL.replace(/\/$/, '');

/**
 * API endpoint configuration
 */
export const API_CONFIG = {
  baseURL,
  endpoints: {
    // Business profile endpoints
    businessProfile: `${baseURL}/api/business-profile`,
    
    // Payment endpoints
    paymentsHistory: `${baseURL}/api/payments/history`,
    paymentsCreate: `${baseURL}/api/payments/create`,
    
    // Public endpoints
    publicBusinessProfile: (username) => `${baseURL}/api/public/business-profile/${username}`,
  }
};

/**
 * Helper function to create API URLs
 */
export const getApiUrl = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseURL}${cleanPath}`;
};

export default API_CONFIG;
