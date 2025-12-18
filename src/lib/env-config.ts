// Check if we're running on server-side
const isServer = typeof window === 'undefined';
const ENV_CONFIG_DEBUG = process.env.ENV_CONFIG_DEBUG === 'true';
const debugLog = (...args: unknown[]) => {
  if (ENV_CONFIG_DEBUG) {
    console.log(...args);
  }
};

if (ENV_CONFIG_DEBUG) {
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

  console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
  console.log('A_FIREBASE_PROJECT_ID:', process.env.A_FIREBASE_PROJECT_ID);
  console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.log('=== ENV-CONFIG DEBUG END ===');
}

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
    // Fall back to regular NEXT_PUBLIC_ variable if A_NEXT_PUBLIC_ doesn't exist
    return process.env[`NEXT_PUBLIC_${key}`] || fallback;
  }
  return process.env[`NEXT_PUBLIC_${key}`] || fallback;
}

function getRequiredEnvVar(key: string): string {
  debugLog(`[ENV-CONFIG] getRequiredEnvVar called for: ${key}`);
  debugLog(`[ENV-CONFIG] USE_A_PREFIX: ${USE_A_PREFIX}`);
  debugLog(`[ENV-CONFIG] Looking for: ${USE_A_PREFIX ? 'A_' : ''}${key}`);

  const value = getEnvVar(key);
  debugLog(`[ENV-CONFIG] Found value: ${value ? 'SET' : 'NOT SET'}`);

  if (!value) {
    // During build time, return a placeholder to prevent build failure
    // Next.js build process checks for these variables
    if (process.env.npm_lifecycle_event === 'build') {
      console.warn(`[ENV-CONFIG] WARNING: ${key} is missing during build. Using placeholder.`);
      if (key === 'FIREBASE_SERVICE_ACCOUNT') {
        return JSON.stringify({
          project_id: "mock-project-id",
          client_email: "mock-client-email@mock-project-id.iam.gserviceaccount.com",
          private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCnh0fU3mKK7Yxu\n3zNoCgvtT36zqT4rY6djRX5GRAa0FlzTWtW5FavB7NDlxyXFjep4r7X282PDC8Zr\nqh4BHImCsG57p80vAvMwxj/uShQxVTj5GhHiyyuM7GPyYc+P3y+e5sfFga+Zhn3F\nFmMhTYYBsQO8oZu5X0pB0J02YSDawEG9ccvLtD8/wmYMhINbMYN7mItXTQIUPUyB\nnVatqI/oRcWT8Kzfr/K8l5iOzLZdzoeW2rQUZQkeuKkgIr0m96smgOZBzO5kXxdy\n8eg2w6rNwnI/oIKSoIX31M6vdCekxXBLejMXJjnlUh0QH0R0HTzSCpXFZDDLZjz4\n6t5lfHGfAgMBAAECggEAA0wsY8pE0ks+umf2URPxjChGbC7mpF//yXpys9te7miK\nRzbAgjYk/Vo1+m/jFHJorRt4T3YW/p3at//PO2Jeao4ifpic91Hti4Y7d+tJXnc4\n+d5Df91T7CAzD3BRb5mLDGuqfv7AgBsfmqOIK/2kp5/eXPYpZIq1oXoDvjBHP0cF\nXLfuL7fkpoDtmCY0aBqAcLi56OMjKu5/xApaEiFndMWDy/LCDb3NeoRKSD0yKnoU\nLIyDNzX87zvIauxnWzdgfYV4X5XHTQmeLU8wz8WOEQv6plpDrmw3tLQDsSPZMBVc\n+YJtOUbdTNsnWAv33ncgqfezTk3e32cpsOl2kXYO4QKBgQDTUIdVLwoHBrn1UCdU\nBi+4Rvd8/FLS6EZ3pfPpVYx5V5fBMcTfhIN83nzNSuV7xBRy8h80DZh+hyEBKEPa\nPIDLKfI0HwVb6t+8ojJztO/HT51xPv/QqXagCB/1ad5p8oseupSm6hTYEOhLBmFm\n5kcSfdCiOdsNDCK1hMgibCcrpwKBgQDK9GYdxrhvUCMDX+0mJGewXt2oCDbmIOrJ\nPawu7265p+d0amVaKACPNKyxwjiDTEhwM+B1XXsl7youYH0xk8t5Aupmg/1f6AzO\nhqc4YmZgZYcZJcE75Tb4aGtYDOtn+sBCtSIgrNoZQK1A7n37PEZDg2KUSdBZE2Y9\nN/mPVnrpSQKBgQC5H4VQBSOdwDDNTmkF3V2U7OcIIe1VQ5PoYgRq2D12WFxkLfux\nbV/b1vYyy3h7ku3vPVpEudxsjGlHoETBPdv/IEJFkx+YxQ05LkdQwqSFUaQ2f+CQ\npsV7sWJ+Fz94RbnHM+Hi0JNuLnGyuGZARWDiPEK4vELBDW6i4y6JqYIvZQKBgGKq\nwH5XXtDW377DQvKZHkOzSwVmwPHOLPaa4fuLcYQWqcKB+zYCXotAa3ib2IeUbV8H\nCWdlg/okNJiJVjPlCzWQgk5GesbGdHtvIRqbU/QnR6+lGDU7MSdA9HbBCSzqzc9g\nafACuKEwPUpk56BdZDdsR1+aJw03DixS6yORQn3pAoGAQXDAOAtmlmVbMB+a+C8w\nl+jqAU+EbKJCKe5TYKRwHge/iducjbXxnMPQKMWpvb6+miVCvtWpmeIQSrg+Iis5\n4fYFZwjGRrobdo173T0f25VqPZnbhjus3qS0kJeTg09a9RX4ZhSYnk5yEkJ9KCkz\nKmHQINzv9y/E3iGU59u6kGY=\\n-----END PRIVATE KEY-----\\n"
        });
      }
      return "BUILD_PLACEHOLDER";
    }

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
  API_VERSION: getEnvVar('SHOPIFY_API_VERSION', '2025-10'), // Latest stable (Winter 2026 Editions)
  WEBHOOK_SECRET: getRequiredEnvVar('SHOPIFY_WEBHOOK_SECRET'),
  LOCATION_ID: getEnvVar('SHOPIFY_LOCATION_ID', 'gid://shopify/Location/83900891193'), // Primary inventory location
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