/**
 * Shopify Admin API Client
 * 
 * Core utility for making authenticated GraphQL requests to Shopify Admin API.
 * Used by all other Shopify service modules.
 */

import { SHOPIFY_CONFIG } from '@/lib/env-config';

// ============================================================================
// Types
// ============================================================================

type ShopifyGraphQLResponse<T> = {
  data: T;
  errors?: { message: string; field?: string[] }[];
};

// ============================================================================
// Configuration
// ============================================================================

const SHOPIFY_API_URL = `https://${SHOPIFY_CONFIG.STORE_URL}/admin/api/${SHOPIFY_CONFIG.API_VERSION}/graphql.json`;
const SHOPIFY_ADMIN_TOKEN = SHOPIFY_CONFIG.ADMIN_ACCESS_TOKEN;

// ============================================================================
// Core Fetch Utility
// ============================================================================

/**
 * Make an authenticated GraphQL request to Shopify Admin API.
 * 
 * @param query - GraphQL query or mutation string
 * @param variables - Optional variables for the query
 * @returns The data portion of the GraphQL response
 * @throws Error if the request fails or returns GraphQL errors
 */
export async function fetchShopify<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!SHOPIFY_API_URL || !SHOPIFY_ADMIN_TOKEN) {
    throw new Error('Shopify environment variables are not set.');
  }

  try {
    const response = await fetch(SHOPIFY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      cache: 'force-cache', // 2026: Explicit caching
      next: {
        revalidate: 60,
        tags: ['shopify-data'],
      },
    });

    const result: ShopifyGraphQLResponse<T> = await response.json();

    if (result.errors) {
      console.error('[Shopify Client] GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      throw new Error(`GraphQL Error: ${result.errors.map((e) => e.message).join('\n')}`);
    }

    return result.data;
  } catch (error) {
    console.error('[Shopify Client] Unhandled fetch error:', error);
    throw error;
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Sleep utility for rate limiting and retries.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
