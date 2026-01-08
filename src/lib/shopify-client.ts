/**
 * Shopify Client - Data Fetching Layer
 * 
 * NO 'use server' directive - these functions run on the server
 * automatically when called from Server Components.
 * 
 * This separation is required for Next.js 16 Turbopack compatibility.
 */

import { cache } from 'react';
import { SHOPIFY_CONFIG } from '@/lib/env-config';
import type { ShopifyProduct, ShopifyOrder, ShopifyCollection, ShopifyLocation } from '@/types/shopify';

// ============================================================================
// Types (internal to this client)
// ============================================================================

type ShopifyGraphQLResponse<T> = {
  data: T;
  errors?: { message: string; field?: string[] }[];
};

// ============================================================================
// Core Fetch Utility
// ============================================================================

const SHOPIFY_API_URL = `https://${SHOPIFY_CONFIG.STORE_URL}/admin/api/${SHOPIFY_CONFIG.API_VERSION}/graphql.json`;
const SHOPIFY_ADMIN_TOKEN = SHOPIFY_CONFIG.ADMIN_ACCESS_TOKEN;

export async function fetchShopify<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!SHOPIFY_API_URL || !SHOPIFY_ADMIN_TOKEN) {
    throw new Error('Shopify environment variables are not set.');
  }

  const response = await fetch(SHOPIFY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    next: {
      revalidate: 60,
      tags: ['shopify-data'],
    },
  });

  const result: ShopifyGraphQLResponse<T> = await response.json();

  if (result.errors) {
    console.error('[shopify-client] GraphQL Errors:', JSON.stringify(result.errors, null, 2));
    throw new Error(`GraphQL Error: ${result.errors.map((e) => e.message).join('\n')}`);
  }

  return result.data;
}

// ============================================================================
// GraphQL Queries
// ============================================================================

const GET_PRODUCTS_QUERY = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          status
          productType
          tags
          totalInventory
          onlineStoreUrl
          description
          descriptionHtml
          customDescription: metafield(namespace: "custom", key: "description") {
            value
          }
          featuredImage {
            url(transform: {maxWidth: 1024, maxHeight: 1024})
          }
          images(first: 100) {
            edges {
              node {
                id
                url(transform: {maxWidth: 1024, maxHeight: 1024})
                altText
              }
            }
          }
          priceRange: priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                sku
                inventoryItem {
                  id
                }
              }
            }
          }
          collections(first: 10) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const GET_PRODUCT_BY_ID_QUERY = `
  query getProductById($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      status
      productType
      tags
      totalInventory
      onlineStoreUrl
      description
      descriptionHtml
      customDescription: metafield(namespace: "custom", key: "description") {
        value
      }
      featuredImage {
        url(transform: {maxWidth: 1024, maxHeight: 1024})
      }
      images(first: 20) {
        edges {
          node {
            id
            url(transform: {maxWidth: 1024, maxHeight: 1024})
            altText
          }
        }
      }
      priceRange: priceRangeV2 {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 1) {
        edges {
          node {
            id
            sku
            inventoryItem {
              id
            }
          }
        }
      }
      collections(first: 10) {
        edges {
          node {
            id
            title
          }
        }
      }
    }
  }
`;

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

const GET_ORDERS_QUERY = `
  query getOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          processedAt
          tags
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalShippingPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalTaxSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            firstName
            lastName
            email
          }
          shippingAddress {
            address1
            address2
            city
            province
            zip
            country
          }
          displayFinancialStatus
          displayFulfillmentStatus
          lineItems(first: 10) {
            edges {
              node {
                id
                title
                quantity
                product {
                  id
                  title
                  featuredImage {
                    url
                    altText
                  }
                }
                variant {
                  title
                  sku
                }
                customAttributes {
                  key
                  value
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const GET_LOCATIONS_QUERY = `
  query GetLocations {
    locations(first: 10) {
      edges {
        node {
          id
          name
          address {
            address1
            city
            province
            country
          }
          isActive
          fulfillsOnlineOrders
        }
      }
    }
  }
`;

// ============================================================================
// Data Fetching Functions (Cached)
// ============================================================================

type GetProductsResponse = {
  products: {
    edges: Array<{
      node: {
        description: string;
        descriptionHtml: string;
        customDescription: { value: string } | null;
      } & Omit<ShopifyProduct, 'description'>;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
};

type GetProductByIdResponse = {
  product: {
    description: string;
    descriptionHtml: string;
    customDescription: { value: string } | null;
  } & Omit<ShopifyProduct, 'description'> | null;
};

type GetCollectionsResponse = {
  collections: {
    edges: Array<{ node: ShopifyCollection }>;
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
};

type GetOrdersResponse = {
  orders: {
    edges: Array<{ node: ShopifyOrder }>;
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
};

type GetLocationsResponse = {
  locations: {
    edges: Array<{ node: ShopifyLocation }>;
  };
};

/**
 * Get all products with React cache memoization
 */
export const getProducts = cache(async (first: number = 50, after?: string): Promise<ShopifyProduct[]> => {
  const response = await fetchShopify<GetProductsResponse>(GET_PRODUCTS_QUERY, { first, after });

  return response.products.edges.map(({ node }) => {
    const { description, descriptionHtml, customDescription, ...restOfProduct } = node;
    return {
      ...restOfProduct,
      description: description || descriptionHtml || customDescription?.value || '',
    };
  });
});

/**
 * Get a single product by ID with React cache memoization
 */
export const getProductById = cache(async (id: string): Promise<ShopifyProduct | null> => {
  const response = await fetchShopify<GetProductByIdResponse>(GET_PRODUCT_BY_ID_QUERY, { id });

  if (!response.product) return null;

  const { description, descriptionHtml, customDescription, ...restOfProduct } = response.product;

  return {
    ...restOfProduct,
    description: description || descriptionHtml || customDescription?.value || '',
  };
});

/**
 * Get all collections with React cache memoization
 */
export const getCollections = cache(async (first: number = 50, after?: string): Promise<ShopifyCollection[]> => {
  const response = await fetchShopify<GetCollectionsResponse>(GET_COLLECTIONS_QUERY, { first, after });
  return response.collections.edges.map(({ node }) => node);
});

/**
 * Get all orders with React cache memoization
 */
export const getOrders = cache(async (first: number = 50, after?: string): Promise<ShopifyOrder[]> => {
  const response = await fetchShopify<GetOrdersResponse>(GET_ORDERS_QUERY, { first, after });
  return response.orders.edges.map((edge) => edge.node);
});

/**
 * Get a single order by ID
 */
export const getOrder = cache(async (id: string): Promise<ShopifyOrder | null> => {
  const query = `
    query getOrder($id: ID!) {
      order(id: $id) {
        id
        name
        createdAt
        processedAt
        tags
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        totalShippingPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        totalTaxSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        customer {
          firstName
          lastName
          email
        }
        shippingAddress {
          address1
          address2
          city
          province
          zip
          country
        }
        displayFinancialStatus
        displayFulfillmentStatus
        lineItems(first: 20) {
          edges {
            node {
              id
              title
              quantity
              product {
                id
                title
                featuredImage {
                  url
                  altText
                }
              }
              variant {
                title
                sku
              }
              customAttributes {
                key
                value
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetchShopify<{ order: ShopifyOrder }>(query, { id });
  return response.order || null;
});

/**
 * Get all locations (for inventory management)
 */
export const getLocations = cache(async (): Promise<ShopifyLocation[]> => {
  const response = await fetchShopify<GetLocationsResponse>(GET_LOCATIONS_QUERY);
  return response.locations.edges.map((edge) => edge.node);
});

/**
 * Get the primary location ID
 */
export async function getPrimaryLocationId(): Promise<string | null> {
  const query = `
    query {
      locations(first: 1, query: "isPrimary:true") {
        edges {
          node { id }
        }
      }
    }
  `;

  const response = await fetchShopify<{ locations: { edges: Array<{ node: { id: string } }> } }>(query);
  return response.locations.edges[0]?.node.id || null;
}

// ============================================================================
// NOTE: Functions from @/services/shopify are NOT re-exported here
// to prevent bundling firebase-admin in client components.
// 
// For client components, use server actions from @/actions/shopify.ts instead.
// For server components, import directly from @/services/shopify.ts.
// ============================================================================
