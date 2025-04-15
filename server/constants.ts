// Constants used throughout the application

// Default platform fee percentage (10%)
export const PLATFORM_FEE_PERCENTAGE = 10;

// Stripe Connect configuration
export const STRIPE_CONNECT = {
  ACCOUNT_TYPE: 'express',
  REFRESH_URL: '/settings/payment?refresh=true',
  RETURN_URL: '/settings/payment?success=true',
  SUCCESS_URL: '/payment/success?session_id={CHECKOUT_SESSION_ID}',
  CANCEL_URL: '/payment/cancel',
  API_VERSION: '2025-02-24.acacia', // Make sure all Stripe implementations use the same version
};

// Authentication related constants
export const AUTH_CONSTANTS = {
  PASSWORD_RESET_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  INVITATION_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};