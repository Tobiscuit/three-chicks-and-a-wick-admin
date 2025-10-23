/**
 * Container-Size Management Service
 * 
 * Manages container-size combinations and ingredient-based availability
 * for the custom candle business model.
 */

import { fetchShopify } from './shopify';

// Container-Size Types
export interface ContainerSize {
  id: string;
  name: string;
  container: string;
  size: string;
  costPerUnit: number;
  supplier: string;
  quantity: number;
  unit: 'pieces';
}

export interface IngredientInventory {
  waxTypes: {
    [key: string]: {
      quantity: number;
      unit: 'pounds';
      costPerUnit: number;
      supplier: string;
    };
  };
  containerSizes: {
    [key: string]: {
      quantity: number;
      unit: 'pieces';
      costPerUnit: number;
      supplier: string;
    };
  };
  wicks: {
    [key: string]: {
      quantity: number;
      unit: 'pieces';
      costPerUnit: number;
      supplier: string;
    };
  };
}

export interface AvailableVariant {
  wax: string;
  wick: string;
  containerSize: string;
  inventory_quantity: number;
  estimatedQuantity: number;
  canMake: boolean;
}

// Default container-size options (MVP with real products)
export const DEFAULT_CONTAINER_SIZE_OPTIONS: ContainerSize[] = [
  {
    id: 'mason-jar-16oz',
    name: 'Mason Jar 16oz',
    container: 'Mason Jar',
    size: '16oz',
    costPerUnit: 0.96, // $11.56 / 12 = $0.96 per jar
    supplier: 'Bulk Supplier',
    quantity: 0
  },
  {
    id: 'metal-tin-8oz',
    name: 'Metal Tin 8oz',
    container: 'Metal Tin',
    size: '8oz',
    costPerUnit: 1.80, // Average of $1.70-$1.89
    supplier: 'Bulk Supplier',
    quantity: 0
  }
];

/**
 * Calculate available variants based on ingredient inventory
 */
export function calculateAvailableVariants(ingredients: IngredientInventory): AvailableVariant[] {
  const availableVariants: AvailableVariant[] = [];
  
  for (const wax of Object.keys(ingredients.waxTypes)) {
    for (const wick of Object.keys(ingredients.wicks)) {
      for (const containerSize of Object.keys(ingredients.containerSizes)) {
        const canMake = checkIngredientAvailability(wax, wick, containerSize, ingredients);
        const estimatedQuantity = canMake ? calculateMaxQuantity(wax, wick, containerSize, ingredients) : 0;
        
        availableVariants.push({
          wax,
          wick,
          containerSize,
          inventory_quantity: canMake ? 999 : 0, // Available in Shopify
          estimatedQuantity,
          canMake
        });
      }
    }
  }
  
  return availableVariants;
}

/**
 * Check if we have enough ingredients to make a specific variant
 */
function checkIngredientAvailability(
  wax: string, 
  wick: string, 
  containerSize: string, 
  ingredients: IngredientInventory
): boolean {
  const requiredWax = calculateWaxNeeded(containerSize);
  const requiredWick = 1; // One wick per candle
  const requiredContainer = 1; // One container per candle
  
  return (
    ingredients.waxTypes[wax]?.quantity >= requiredWax &&
    ingredients.wicks[wick]?.quantity >= requiredWick &&
    ingredients.containerSizes[containerSize]?.quantity >= requiredContainer
  );
}

/**
 * Calculate maximum quantity that can be made
 */
function calculateMaxQuantity(
  wax: string, 
  wick: string, 
  containerSize: string, 
  ingredients: IngredientInventory
): number {
  const waxAvailable = ingredients.waxTypes[wax]?.quantity || 0;
  const wickAvailable = ingredients.wicks[wick]?.quantity || 0;
  const containerAvailable = ingredients.containerSizes[containerSize]?.quantity || 0;
  
  const waxMax = Math.floor(waxAvailable / calculateWaxNeeded(containerSize));
  const wickMax = wickAvailable;
  const containerMax = containerAvailable;
  
  return Math.min(waxMax, wickMax, containerMax);
}

/**
 * Calculate wax needed for a specific container size
 */
function calculateWaxNeeded(containerSize: string): number {
  // Wax needed per candle (in pounds)
  const waxPerCandle = {
    '8oz': 0.5,   // 8oz candle needs ~0.5 lbs wax
    '12oz': 0.75, // 12oz candle needs ~0.75 lbs wax
    '16oz': 1.0   // 16oz candle needs ~1.0 lbs wax
  };
  
  const size = containerSize.split('-').pop(); // Extract size from containerSize
  return waxPerCandle[size as keyof typeof waxPerCandle] || 1.0;
}

/**
 * Get container-size options from Shopify
 */
export async function getContainerSizeOptionsFromShopify(): Promise<ContainerSize[]> {
  try {
    const query = `
      query getContainerSizeProducts {
        products(first: 50, query: "tag:container-size OR tag:custom-candle") {
          edges {
            node {
              id
              title
              tags
              metafields(first: 10) {
                edges {
                  node {
                    namespace
                    key
                    value
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    const result = await fetchShopify<any>(query);
    const products = result.products.edges.map((edge: any) => edge.node);
    
    return products.map((product: any) => {
      const metafields = product.metafields.edges.reduce((acc: any, edge: any) => {
        acc[`${edge.node.namespace}.${edge.node.key}`] = edge.node.value;
        return acc;
      }, {});
      
      return {
        id: product.id,
        name: product.title,
        container: metafields['custom.container'] || 'Unknown',
        size: metafields['custom.size'] || 'Unknown',
        costPerUnit: parseFloat(metafields['custom.costPerUnit']) || 0,
        supplier: metafields['custom.supplier'] || 'Unknown',
        quantity: parseInt(metafields['custom.quantity']) || 0
      };
    });
  } catch (error) {
    console.error('Error fetching container-size options from Shopify:', error);
    return DEFAULT_CONTAINER_SIZE_OPTIONS;
  }
}

/**
 * Update ingredient inventory
 */
export async function updateIngredientInventory(
  ingredientType: 'wax' | 'containerSize' | 'wick',
  ingredientName: string,
  quantity: number,
  costPerUnit: number,
  supplier: string
): Promise<void> {
  // This would typically update a database or Shopify metafields
  // For now, we'll just log the update
  console.log(`Updating ${ingredientType} inventory:`, {
    name: ingredientName,
    quantity,
    costPerUnit,
    supplier
  });
  
  // TODO: Implement actual inventory update logic
  // This could involve:
  // 1. Updating Shopify metafields
  // 2. Updating a local database
  // 3. Syncing with external inventory system
}

/**
 * Sync available variants to Shopify
 */
export async function syncVariantsToShopify(availableVariants: AvailableVariant[]): Promise<void> {
  try {
    // This would update Shopify product variants based on availability
    // For now, we'll just log what would be synced
    console.log('Syncing variants to Shopify:', availableVariants);
    
    // TODO: Implement actual Shopify sync logic
    // This could involve:
    // 1. Enabling/disabling variants based on availability
    // 2. Updating inventory quantities
    // 3. Updating product status
  } catch (error) {
    console.error('Error syncing variants to Shopify:', error);
  }
}

/**
 * Get ingredient inventory (mock data for now)
 */
export function getMockIngredientInventory(): IngredientInventory {
  return {
    waxTypes: {
      'Soy': { quantity: 50, unit: 'pounds', costPerUnit: 8.00, supplier: 'Bulk Supplier' },
      'Beeswax': { quantity: 25, unit: 'pounds', costPerUnit: 12.00, supplier: 'Bulk Supplier' },
      'Coconut Soy': { quantity: 30, unit: 'pounds', costPerUnit: 9.00, supplier: 'Bulk Supplier' }
    },
    containerSizes: {
      'mason-jar-16oz': { quantity: 120, unit: 'pieces', costPerUnit: 0.96, supplier: 'Bulk Supplier' },
      'metal-tin-8oz': { quantity: 500, unit: 'pieces', costPerUnit: 1.80, supplier: 'Bulk Supplier' }
    },
    wicks: {
      'Cotton': { quantity: 500, unit: 'pieces', costPerUnit: 0.25, supplier: 'Bulk Supplier' },
      'Wood': { quantity: 300, unit: 'pieces', costPerUnit: 0.50, supplier: 'Bulk Supplier' },
      'Hemp': { quantity: 150, unit: 'pieces', costPerUnit: 0.75, supplier: 'Bulk Supplier' }
    }
  };
}
