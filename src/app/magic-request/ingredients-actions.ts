'use server';

import { getMagicRequestIngredientsFromShopify } from '@/services/container-size-management';

/**
 * Server action to fetch Magic Request ingredients from Shopify
 * This is called from the client-side ContainerSizeManager component
 */
export async function fetchMagicRequestIngredients() {
  try {
    const ingredients = await getMagicRequestIngredientsFromShopify();
    return {
      success: true,
      data: ingredients
    };
  } catch (error) {
    console.error('[Ingredients Action] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch ingredients'
    };
  }
}





