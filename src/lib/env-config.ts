/**
 * Environment Configuration Utility
 * 
 * This utility allows switching between original and A_ prefixed environment variables
 * to support multiple stores without affecting production.
 * 
 * Usage:
 * - Set USE_A_PREFIX=true to use A_ prefixed variables
 * - Set USE_A_PREFIX=false or unset to use original variables
 */

const USE_A_PREFIX = process.env.USE_A_PREFIX === 'true';

/**
 * Get environment variable with optional A_ prefix
 */
function getEnvVar(key: string, fallback?: string): string | undefined {
  if (USE_A_PREFIX) {
    return process.env[`A_${key}`] || fallback;
  }
  return process.env[key] || fallback;
}

/**
 * Get NEXT_PUBLIC environment variable with optional A_ prefix
 * Next.js requires NEXT_PUBLIC_ prefix, so we need to set them dynamically
 */
function getPublicEnvVar(key: string, fallback?: string): string | undefined {
  if (USE_A_PREFIX) {
    // For A_ prefixed variables, we need to set them as NEXT_PUBLIC_ at runtime
    const aPrefixedValue = process.env[`A_NEXT_PUBLIC_${key}`];
    if (aPrefixedValue) {
      // Set the NEXT_PUBLIC_ variable dynamically for Next.js
      process.env[`NEXT_PUBLIC_${key}`] = aPrefixedValue;
      return aPrefixedValue;
    }
    return fallback;
  }
  return process.env[`NEXT_PUBLIC_${key}`] || fallback;
}

/**
 * Get required environment variable with optional A_ prefix
 */
function getRequiredEnvVar(key: string): string {
  const value = getEnvVar(key);
  if (!value) {
    throw new Error(`Required environment variable ${USE_A_PREFIX ? 'A_' : ''}${key} is not set`);
  }
  return value;
}

// Shopify Configuration
export const SHOPIFY_CONFIG = {
  STORE_URL: getRequiredEnvVar('SHOPIFY_STORE_URL'),
  ADMIN_ACCESS_TOKEN: getRequiredEnvVar('SHOPIFY_ADMIN_ACCESS_TOKEN'),
  WEBHOOK_SECRET: getEnvVar('SHOPIFY_WEBHOOK_SECRET') || '',
};

// Firebase Configuration
export const FIREBASE_CONFIG = {
  API_KEY: getPublicEnvVar('FIREBASE_API_KEY') || getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY'),
  AUTH_DOMAIN: getPublicEnvVar('FIREBASE_AUTH_DOMAIN') || getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  PROJECT_ID: getPublicEnvVar('FIREBASE_PROJECT_ID') || getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  STORAGE_BUCKET: getPublicEnvVar('FIREBASE_STORAGE_BUCKET') || getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  MESSAGING_SENDER_ID: getPublicEnvVar('FIREBASE_MESSAGING_SENDER_ID') || getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  APP_ID: getPublicEnvVar('FIREBASE_APP_ID') || getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID'),
};

// Firebase Admin Configuration
export const FIREBASE_ADMIN_CONFIG = {
  PROJECT_ID: getRequiredEnvVar('FIREBASE_PROJECT_ID'),
  STORAGE_BUCKET_ADMIN: getEnvVar('FIREBASE_STORAGE_BUCKET_ADMIN'),
  SERVICE_ACCOUNT: getRequiredEnvVar('FIREBASE_SERVICE_ACCOUNT'),
};

// Google AI Configuration
export const GOOGLE_AI_CONFIG = {
  GEMINI_API_KEY: getRequiredEnvVar('GEMINI_API_KEY'),
};

// App Configuration
export const APP_CONFIG = {
  ORIGIN: getPublicEnvVar('APP_ORIGIN') || getEnvVar('NEXT_PUBLIC_APP_ORIGIN') || 'https://three-chicks-and-a-wick-admin.vercel.app',
  STOREFRONT_URL: getPublicEnvVar('STOREFRONT_URL') || getEnvVar('NEXT_PUBLIC_STOREFRONT_URL'),
  AUTHORIZED_EMAILS: getEnvVar('AUTHORIZED_EMAILS'),
};

// Debug information
export const ENV_DEBUG = {
  USE_A_PREFIX,
  ACTIVE_PREFIX: USE_A_PREFIX ? 'A_' : '',
  SHOPIFY_STORE: SHOPIFY_CONFIG.STORE_URL,
  FIREBASE_PROJECT: FIREBASE_CONFIG.PROJECT_ID,
};

/**
 * Initialize A_ prefixed variables for Next.js compatibility
 * This must be called before any other imports that use environment variables
 */
function initializeA_PrefixedVars() {
  if (USE_A_PREFIX) {
    // Set all A_NEXT_PUBLIC_ variables as NEXT_PUBLIC_ for Next.js
    const publicVars = [
      'FIREBASE_API_KEY',
      'FIREBASE_AUTH_DOMAIN', 
      'FIREBASE_PROJECT_ID',
      'FIREBASE_STORAGE_BUCKET',
      'FIREBASE_MESSAGING_SENDER_ID',
      'FIREBASE_APP_ID',
      'APP_ORIGIN',
      'STOREFRONT_URL'
    ];
    
    publicVars.forEach(key => {
      const aPrefixedValue = process.env[`A_NEXT_PUBLIC_${key}`];
      if (aPrefixedValue) {
        process.env[`NEXT_PUBLIC_${key}`] = aPrefixedValue;
      }
    });
  }
}

// Initialize A_ prefixed variables immediately
initializeA_PrefixedVars();

// Log configuration on startup
if (typeof window === 'undefined') {
  console.log('[ENV_CONFIG] Environment Configuration:', {
    prefix: USE_A_PREFIX ? 'A_' : 'original',
    shopifyStore: SHOPIFY_CONFIG.STORE_URL,
    firebaseProject: FIREBASE_CONFIG.PROJECT_ID,
    appOrigin: APP_CONFIG.ORIGIN,
  });
}
