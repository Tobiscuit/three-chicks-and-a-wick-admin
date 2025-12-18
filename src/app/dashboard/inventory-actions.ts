'use server';

import { fetchShopify } from '@/services/shopify';
import { SHOPIFY_CONFIG } from '@/lib/env-config';

export type InventoryItem = {
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  inventoryQuantity: number;
  imageUrl: string | null;
};

/**
 * Get products with low inventory levels
 */
export async function getLowStockProducts(threshold: number = 10) {
  const locationId = SHOPIFY_CONFIG.LOCATION_ID;
  
  const query = `
    query getLowStockProducts($first: Int!, $locationId: ID!) {
      productVariants(first: $first, query: "inventory_total:<=${threshold}") {
        edges {
          node {
            id
            title
            sku
            displayName
            inventoryQuantity
            product {
              id
              title
              featuredImage {
                url(transform: {maxWidth: 100, maxHeight: 100})
              }
            }
            inventoryItem {
              inventoryLevel(locationId: $locationId) {
                quantities(names: "available") {
                  name
                  quantity
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetchShopify<{
      productVariants: {
        edges: Array<{
          node: {
            id: string;
            title: string;
            sku: string | null;
            displayName: string;
            inventoryQuantity: number;
            product: {
              id: string;
              title: string;
              featuredImage: { url: string } | null;
            };
            inventoryItem: {
              inventoryLevel: { 
                quantities: Array<{ name: string; quantity: number }>;
              } | null;
            };
          };
        }>;
      };
    }>(query, { first: 20, locationId });

    // Filter and map to simpler structure
    const items = response.productVariants.edges
      .map(edge => {
        // Get available quantity from new quantities array structure
        const availableQty = edge.node.inventoryItem?.inventoryLevel?.quantities?.[0]?.quantity 
          ?? edge.node.inventoryQuantity;
        
        return {
          productId: edge.node.product.id,
          productTitle: edge.node.product.title,
          variantTitle: edge.node.title,
          sku: edge.node.sku,
          inventoryQuantity: availableQty,
          imageUrl: edge.node.product.featuredImage?.url ?? null,
        };
      })
      .filter(item => item.inventoryQuantity <= threshold)
      .sort((a, b) => a.inventoryQuantity - b.inventoryQuantity);

    return { success: true, items };
  } catch (error) {
    console.error('Failed to fetch low stock products:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      items: []
    };
  }
}

