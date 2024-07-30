/**
 * API Configuration
 * 
 * Uses relative paths (/api/...) so no domain hardcoding is needed.
 * - Local dev: Vite proxies /api/* → http://localhost:3001
 * - Production: Vercel rewrites /api/* → backend deployment (see root vercel.json)
 */

const baseURL = '';

/**
 * API endpoint configuration
 */
export const API_CONFIG = {
  baseURL,
  endpoints: {
    // Business profile endpoints
    businessProfile: `/api/business-profile`,
    
    // Payment endpoints
    paymentsHistory: `/api/payments/history`,
    paymentsCreate: `/api/payments/create`,
    
    // Public endpoints
    publicBusinessProfile: (username) => `/api/public/business-profile/${username}`,
  }
};

/**
 * Helper function to create API URLs
 */
export const getApiUrl = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return cleanPath;
};

export default API_CONFIG;
