/**
 * Shopify Collections Service
 * 
 * Collection management operations: list, add products, remove products.
 */

import { fetchShopify } from './client';
import type { ShopifyCollection } from '@/types/shopify';

// ============================================================================
// Types
// ============================================================================

type GetCollectionsResponse = {
  collections: {
    edges: Array<{ node: ShopifyCollection }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
};

// ============================================================================
// Queries
// ============================================================================

const GET_COLLECTIONS_QUERY = `
  query getCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// ============================================================================
// Functions
// ============================================================================

/**
 * Get all collections.
 */
export async function getCollections(
  first: number = 50,
  after?: string
): Promise<ShopifyCollection[]> {
  const response = await fetchShopify<GetCollectionsResponse>(GET_COLLECTIONS_QUERY, {
    first,
    after,
  });
  return response.collections.edges.map(({ node }) => node);
}

/**
 * Add products to a collection.
 */
export async function collectionAddProducts(
  collectionId: string,
  productIds: string[]
): Promise<void> {
  const mutation = `
    mutation collectionAddProducts($id: ID!, $productIds: [ID!]!) {
      collectionAddProducts(id: $id, productIds: $productIds) {
        collection { id }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify(mutation, { id: collectionId, productIds });
}

/**
 * Remove products from a collection.
 */
export async function collectionRemoveProducts(
  collectionId: string,
  productIds: string[]
): Promise<void> {
  const mutation = `
    mutation collectionRemoveProducts($id: ID!, $productIds: [ID!]!) {
      collectionRemoveProducts(id: $id, productIds: $productIds) {
        collection { id }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify(mutation, { id: collectionId, productIds });
}
