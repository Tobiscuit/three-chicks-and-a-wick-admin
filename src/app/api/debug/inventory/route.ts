import { NextResponse } from 'next/server';
import { fetchShopify } from '@/services/shopify';
import { SHOPIFY_CONFIG } from '@/lib/env-config';

/**
 * GET /api/debug/inventory
 * 
 * Debug endpoint to test inventory queries and see actual errors
 */
export async function GET() {
  const locationId = SHOPIFY_CONFIG.LOCATION_ID;
  
  try {
    // Simpler query - just get product variants with inventory
    const query = `
      query getVariantsWithInventory {
        productVariants(first: 10) {
          edges {
            node {
              id
              title
              sku
              inventoryQuantity
              product {
                id
                title
                totalInventory
              }
            }
          }
        }
      }
    `;

    const response = await fetchShopify<any>(query);
    
    return NextResponse.json({ 
      success: true,
      locationId,
      data: response.productVariants?.edges?.map((e: any) => ({
        variant: e.node.title,
        product: e.node.product?.title,
        sku: e.node.sku,
        inventoryQuantity: e.node.inventoryQuantity,
        productTotalInventory: e.node.product?.totalInventory,
      }))
    });
  } catch (error: any) {
    console.error('Inventory debug error:', error);
    return NextResponse.json({ 
      success: false,
      locationId,
      error: error.message,
      fullError: JSON.stringify(error, null, 2)
    }, { status: 500 });
  }
}
