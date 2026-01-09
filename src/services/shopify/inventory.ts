/**
 * Shopify Inventory Service
 * 
 * Inventory operations: get locations, update quantities.
 */

import { fetchShopify } from './client';
import type { ShopifyLocation } from '@/types/shopify';

// ============================================================================
// Types
// ============================================================================

type GetLocationsResponse = {
  locations: {
    edges: Array<{ node: ShopifyLocation }>;
  };
};

// ============================================================================
// Functions
// ============================================================================

/**
 * Get the primary location ID for inventory operations.
 */
export async function getPrimaryLocationId(): Promise<string | null> {
  const query = `
    query {
      locations(first: 1, query: "isPrimary:true") {
        edges { node { id } }
      }
    }
  `;
  try {
    const response = await fetchShopify<{ locations: { edges: Array<{ node: { id: string } }> } }>(query);
    return response.locations.edges[0]?.node.id || null;
  } catch (error) {
    console.error('[Inventory] Failed to fetch primary location ID:', error);
    return null;
  }
}

/**
 * Get all locations.
 */
export async function getLocations(): Promise<ShopifyLocation[]> {
  const query = `
    query GetLocations {
      locations(first: 10) {
        edges {
          node {
            id
            name
            address { address1 city province country }
            isActive
            fulfillsOnlineOrders
          }
        }
      }
    }
  `;
  const response = await fetchShopify<GetLocationsResponse>(query);
  return response.locations.edges.map((e) => e.node);
}

/**
 * Update inventory quantity for an item at a location.
 */
export async function updateInventoryQuantity(
  inventoryItemId: string,
  quantity: number,
  locationId: string
): Promise<void> {
  const mutation = `
    mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        inventoryAdjustmentGroup { createdAt }
        userErrors { field message }
      }
    }
  `;

  await fetchShopify(mutation, {
    input: {
      name: 'available',
      reason: 'correction',
      quantities: [
        {
          inventoryItemId,
          locationId,
          quantity,
        },
      ],
    },
  });
}

/**
 * Activate inventory tracking for an item at a location.
 */
export async function activateInventory(
  inventoryItemId: string,
  locationId: string
): Promise<void> {
  const mutation = `
    mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!) {
      inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) {
        inventoryLevel { id }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify(mutation, { inventoryItemId, locationId });
}
