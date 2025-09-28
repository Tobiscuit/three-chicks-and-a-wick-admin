// Check if we're running on server-side
const isServer = typeof window === 'undefined';

// Comprehensive logging for both server and client
console.log('=== ENV-CONFIG DEBUG START ===');
console.log('Environment:', isServer ? 'SERVER' : 'CLIENT');
console.log('Raw USE_A_PREFIX:', JSON.stringify(process.env.USE_A_PREFIX));
console.log('Type of USE_A_PREFIX:', typeof process.env.USE_A_PREFIX);
console.log('USE_A_PREFIX === "true":', process.env.USE_A_PREFIX === 'true');

const allEnvVars = Object.keys(process.env);
console.log('Total env vars:', allEnvVars.length);
console.log('A_ prefixed vars:', allEnvVars.filter(key => key.startsWith('A_')));
console.log('NEXT_PUBLIC vars:', allEnvVars.filter(key => key.startsWith('NEXT_PUBLIC_')));
console.log('FIREBASE vars:', allEnvVars.filter(key => key.includes('FIREBASE')));

// Check specific variables that might be causing issues
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('A_FIREBASE_PROJECT_ID:', process.env.A_FIREBASE_PROJECT_ID);
console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('=== ENV-CONFIG DEBUG END ===');

const USE_A_PREFIX = isServer ? process.env.USE_A_PREFIX === 'true' : false;

function getEnvVar(key: string, fallback?: string): string | undefined {
  if (USE_A_PREFIX) {
    return process.env[`A_${key}`] || fallback;
  }
  return process.env[key] || fallback;
}

function getPublicEnvVar(key: string, fallback?: string): string | undefined {
  if (USE_A_PREFIX) {
    const aPrefixedValue = process.env[`A_NEXT_PUBLIC_${key}`];
    if (aPrefixedValue) {
      process.env[`NEXT_PUBLIC_${key}`] = aPrefixedValue; // Dynamic setting for Next.js
      return aPrefixedValue;
    }
    return fallback;
  }
  return process.env[`NEXT_PUBLIC_${key}`] || fallback;
}

function getRequiredEnvVar(key: string): string {
  console.log(`[ENV-CONFIG] getRequiredEnvVar called for: ${key}`);
  console.log(`[ENV-CONFIG] USE_A_PREFIX: ${USE_A_PREFIX}`);
  console.log(`[ENV-CONFIG] Looking for: ${USE_A_PREFIX ? 'A_' : ''}${key}`);
  
  const value = getEnvVar(key);
  console.log(`[ENV-CONFIG] Found value: ${value ? 'SET' : 'NOT SET'}`);
  
  if (!value) {
    const errorMsg = `Required environment variable ${USE_A_PREFIX ? 'A_' : ''}${key} is not set`;
    console.error(`[ENV-CONFIG] ERROR: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  return value;
}

// Firebase Configuration
export const FIREBASE_CONFIG = {
  API_KEY: getPublicEnvVar('FIREBASE_API_KEY'),
  AUTH_DOMAIN: getPublicEnvVar('FIREBASE_AUTH_DOMAIN'),
  PROJECT_ID: getPublicEnvVar('FIREBASE_PROJECT_ID'),
  STORAGE_BUCKET: getPublicEnvVar('FIREBASE_STORAGE_BUCKET'),
  MESSAGING_SENDER_ID: getPublicEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
  APP_ID: getPublicEnvVar('FIREBASE_APP_ID'),
};

// Firebase Admin Configuration
export const FIREBASE_ADMIN_CONFIG = {
  PROJECT_ID: getRequiredEnvVar('FIREBASE_PROJECT_ID'),
  SERVICE_ACCOUNT: getRequiredEnvVar('FIREBASE_SERVICE_ACCOUNT'),
  STORAGE_BUCKET_ADMIN: getRequiredEnvVar('FIREBASE_STORAGE_BUCKET_ADMIN'),
};

// Shopify Configuration
export const SHOPIFY_CONFIG = {
  STORE_URL: getRequiredEnvVar('SHOPIFY_STORE_URL'),
  ADMIN_ACCESS_TOKEN: getRequiredEnvVar('SHOPIFY_ADMIN_ACCESS_TOKEN'),
  WEBHOOK_SECRET: getRequiredEnvVar('SHOPIFY_WEBHOOK_SECRET'),
};

// Google AI Configuration
export const GOOGLE_AI_CONFIG = {
  API_KEY: getRequiredEnvVar('GEMINI_API_KEY'),
};

// App Configuration
export const APP_CONFIG = {
  ORIGIN: getPublicEnvVar('APP_ORIGIN'),
  STOREFRONT_URL: getPublicEnvVar('STOREFRONT_URL'),
  AUTHORIZED_EMAILS: getRequiredEnvVar('AUTHORIZED_EMAILS'),
};

// Initialize A_ prefixed variables at runtime
function initializeA_PrefixedVars() {
  if (USE_A_PREFIX) {
    const publicVars = [
      'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID',
      'FIREBASE_STORAGE_BUCKET', 'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_APP_ID',
      'APP_ORIGIN', 'STOREFRONT_URL'
    ];
    publicVars.forEach(key => {
      const aPrefixedValue = process.env[`A_NEXT_PUBLIC_${key}`];
      if (aPrefixedValue) {
        process.env[`NEXT_PUBLIC_${key}`] = aPrefixedValue;
      }
    });
  }
}
initializeA_PrefixedVars();