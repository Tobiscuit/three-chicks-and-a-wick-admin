// Check if we're running on server-side
const isServer = typeof window === 'undefined';

function getEnvVar(key: string, fallback?: string): string | undefined {
  return process.env[key] || fallback;
}

function getPublicEnvVar(key: string, fallback?: string): string | undefined {
  return process.env[`NEXT_PUBLIC_${key}`] || fallback;
}

function getRequiredEnvVar(key: string): string {
  const value = getEnvVar(key);

  if (!value) {
    // During build time, return a placeholder to prevent build failure
    if (process.env.npm_lifecycle_event === 'build') {
      console.warn(`[ENV-CONFIG] WARNING: ${key} is missing during build. Using placeholder.`);
      if (key === 'FIREBASE_SERVICE_ACCOUNT') {
        return JSON.stringify({
          project_id: "mock-project-id",
          client_email: "mock-client-email@mock-project-id.iam.gserviceaccount.com",
          private_key: "-----BEGIN PRIVATE KEY-----\\nMOCK\\n-----END PRIVATE KEY-----\\n"
        });
      }
      return "BUILD_PLACEHOLDER";
    }

    const errorMsg = `Required environment variable ${key} is not set`;
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

// Firebase Admin Configuration (server-only - lazy evaluation)
// This prevents the config from throwing on client-side module load
export const FIREBASE_ADMIN_CONFIG = isServer
  ? {
      PROJECT_ID: getRequiredEnvVar('FIREBASE_PROJECT_ID'),
      SERVICE_ACCOUNT: getRequiredEnvVar('FIREBASE_SERVICE_ACCOUNT'),
      STORAGE_BUCKET_ADMIN: getRequiredEnvVar('FIREBASE_STORAGE_BUCKET_ADMIN'),
    }
  : {
      PROJECT_ID: '',
      SERVICE_ACCOUNT: '',
      STORAGE_BUCKET_ADMIN: '',
    };

// Shopify Configuration (server-only - lazy evaluation)
// This prevents the config from throwing on client-side module load
export const SHOPIFY_CONFIG = isServer
  ? {
      STORE_URL: getRequiredEnvVar('SHOPIFY_STORE_URL'),
      ADMIN_ACCESS_TOKEN: getRequiredEnvVar('SHOPIFY_ADMIN_ACCESS_TOKEN'),
      API_VERSION: getEnvVar('SHOPIFY_API_VERSION', '2025-10'),
      WEBHOOK_SECRET: getRequiredEnvVar('SHOPIFY_WEBHOOK_SECRET'),
      LOCATION_ID: getEnvVar('SHOPIFY_LOCATION_ID', 'gid://shopify/Location/83900891193'),
    }
  : {
      STORE_URL: '',
      ADMIN_ACCESS_TOKEN: '',
      API_VERSION: '2025-10',
      WEBHOOK_SECRET: '',
      LOCATION_ID: '',
    };

// Google AI Configuration (server-only - lazy evaluation)
export const GOOGLE_AI_CONFIG = isServer
  ? {
      API_KEY: getRequiredEnvVar('GEMINI_API_KEY'),
    }
  : {
      API_KEY: '',
    };

// App Configuration (mixed: some public, some server-only)
export const APP_CONFIG = {
  ORIGIN: getPublicEnvVar('APP_ORIGIN'),
  STOREFRONT_URL: getPublicEnvVar('STOREFRONT_URL'),
  // AUTHORIZED_EMAILS is server-only
  AUTHORIZED_EMAILS: isServer ? getRequiredEnvVar('AUTHORIZED_EMAILS') : '',
};