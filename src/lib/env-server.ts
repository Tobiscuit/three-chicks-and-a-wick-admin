/**
 * Server-Only Environment Configuration
 * 
 * This module uses the `server-only` package to GUARANTEE that these
 * environment variables can NEVER leak to the client bundle.
 * 
 * If any client component imports this module (directly or transitively),
 * Next.js will throw a BUILD-TIME ERROR - not a runtime error.
 * 
 * This is the January 2026 bleeding-edge pattern for secure env handling.
 */

import 'server-only';

// ============================================================================
// Server Environment Helpers
// ============================================================================

function getRequiredServerEnvVar(key: string): string {
  const value = process.env[key];
  
  // During build, return placeholder to prevent build failure
  if (!value && process.env.npm_lifecycle_event === 'build') {
    console.warn(`[ENV-CONFIG] WARNING: ${key} is missing during build. Using placeholder.`);
    if (key === 'FIREBASE_SERVICE_ACCOUNT') {
      return JSON.stringify({
        project_id: "build-placeholder",
        client_email: "build@placeholder.iam.gserviceaccount.com",
        private_key: "-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n"
      });
    }
    return "BUILD_PLACEHOLDER";
  }
  
  if (!value) {
    throw new Error(`Required server environment variable ${key} is not set`);
  }
  
  return value;
}

function getServerEnvVar(key: string, fallback?: string): string | undefined {
  return process.env[key] || fallback;
}

// ============================================================================
// Firebase Admin Configuration (server-only)
// ============================================================================

export const FIREBASE_ADMIN_CONFIG = {
  PROJECT_ID: getRequiredServerEnvVar('FIREBASE_PROJECT_ID'),
  SERVICE_ACCOUNT: getRequiredServerEnvVar('FIREBASE_SERVICE_ACCOUNT'),
  STORAGE_BUCKET_ADMIN: getRequiredServerEnvVar('FIREBASE_STORAGE_BUCKET_ADMIN'),
};

// ============================================================================
// Shopify Configuration (server-only - contains admin token)
// ============================================================================

export const SHOPIFY_SERVER_CONFIG = {
  STORE_URL: getRequiredServerEnvVar('SHOPIFY_STORE_URL'),
  ADMIN_ACCESS_TOKEN: getRequiredServerEnvVar('SHOPIFY_ADMIN_ACCESS_TOKEN'),
  API_VERSION: getServerEnvVar('SHOPIFY_API_VERSION', '2025-10'),
  WEBHOOK_SECRET: getRequiredServerEnvVar('SHOPIFY_WEBHOOK_SECRET'),
  LOCATION_ID: getServerEnvVar('SHOPIFY_LOCATION_ID', 'gid://shopify/Location/83900891193'),
};

// ============================================================================
// Google AI Configuration (server-only - contains API key)
// ============================================================================

export const GOOGLE_AI_SERVER_CONFIG = {
  API_KEY: getRequiredServerEnvVar('GEMINI_API_KEY'),
};

// ============================================================================
// App Server Configuration (server-only)
// ============================================================================

export const APP_SERVER_CONFIG = {
  AUTHORIZED_EMAILS: getRequiredServerEnvVar('AUTHORIZED_EMAILS'),
};
