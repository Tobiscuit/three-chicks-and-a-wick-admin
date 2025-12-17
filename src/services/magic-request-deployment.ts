'use server';

/**
 * Magic Request Product Deployment Service
 * 
 * Handles the multi-step process of deploying Magic Request products to Shopify:
 * 1. Create/upsert vessel products
 * 2. Create/ensure product options (Wax, Wick)
 * 3. Create missing variants (Cartesian product)
 * 4. Update variant prices and metafields
 * 5. Activate inventory
 * 6. Publish to sales channel
 * 
 * This service is used by both the Admin Panel UI and the seeding script.
 */

import { fetchShopify } from '@/services/shopify';
import { SHOPIFY_CONFIG } from '@/lib/env-config';

export type VesselConfig = {
  name: string;
  sizeOz: number;
  baseCostCents: number;
  marginPct?: number;
  supplier?: string;
  status?: 'enabled' | 'disabled' | 'deleted'; // Admin Panel can set this
};

export type WaxConfig = {
  name: string;
  pricePerOzCents: number;
};

export type WickConfig = {
  name: string;
  costCents: number;
};

export type PricingConfig = {
  vessels: Record<string, VesselConfig>;
  waxes: Record<string, WaxConfig>;
  wicks: Record<string, WickConfig>;
  marginPct: number;
  supplier: string;
  inventoryQuantity?: number | null; // Optional: set quantity or null to skip
};

export type DeploymentProgress = {
  step: string;
  message: string;
  progress: number; // 0-100
};

type DeploymentResult = {
  success: boolean;
  productId?: string;
  variantCount?: number;
  errors?: string[];
  progress?: DeploymentProgress[];
};

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function calculatePrice(
  vesselName: string,
  waxName: string,
  wickName: string,
  config: PricingConfig
): string {
  const vessel = config.vessels[vesselName];
  const wax = config.waxes[waxName];
  const wick = config.wicks[wickName];
  
  if (!vessel || !wax || !wick) {
    throw new Error(`Missing pricing config for ${vesselName}/${waxName}/${wickName}`);
  }
  
  const baseCents = vessel.baseCostCents + wick.costCents + (wax.pricePerOzCents * vessel.sizeOz);
  const marginPct = vessel.marginPct ?? config.marginPct;
  const withMarginCents = Math.round(baseCents * (1 + marginPct / 100));
  return (withMarginCents / 100).toFixed(2);
}

async function getPrimaryLocationId(): Promise<string | null> {
  const query = `
    query {
      locations(first: 1, query: "isPrimary:true") {
        edges {
          node {
            id
          }
        }
      }
    }
  `;
  try {
    const result = await fetchShopify<any>(query);
    return result.locations.edges[0]?.node.id || null;
  } catch (error) {
    console.error('Failed to fetch primary location ID:', error);
    return null;
  }
}

async function getPublicationId(name: string): Promise<string | null> {
  const query = `
    query {
      publications(first: 25) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  `;
  try {
    const result = await fetchShopify<any>(query);
    const publication = result.publications.edges.find((e: any) => e.node.name === name);
    return publication?.node.id || null;
  } catch (error) {
    console.error(`Failed to find publication "${name}":`, error);
    return null;
  }
}

/**
 * Deploy or update a Magic Request vessel product in Shopify
 */
export async function deployMagicRequestVessel(
  vesselName: string,
  config: PricingConfig,
  onProgress?: (progress: DeploymentProgress) => void
): Promise<DeploymentResult> {
  const vessel = config.vessels[vesselName];
  if (!vessel) {
    return {
      success: false,
      errors: [`Vessel "${vesselName}" not found in configuration`],
    };
  }

  const errors: string[] = [];
  const progressLog: DeploymentProgress[] = [];
  
  const reportProgress = (step: string, message: string, progress: number) => {
    const p: DeploymentProgress = { step, message, progress };
    progressLog.push(p);
    onProgress?.(p);
  };

  try {
    const handle = slugify(`${vesselName} ${vessel.sizeOz}oz`);
    const title = `${vesselName} ${vessel.sizeOz}oz`;
    const deploymentVersion = `v${new Date().toISOString().slice(0, 16).replace(/[-T:]/g, '')}`;

    reportProgress('check_product', `Checking if product exists: ${title}`, 10);

    // 1. Check if product exists
    const checkQuery = `
      query ($identifier: ProductIdentifierInput!) {
        productByIdentifier(identifier: $identifier) {
          id
          title
          variants(first: 100) {
            edges {
              node {
                id
                price
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    `;
    const existing = await fetchShopify<{
      productByIdentifier: {
        id: string;
        title: string;
        variants: { edges: { node: { id: string; price: string; selectedOptions: { name: string; value: string }[] } }[] };
      } | null;
    }>(checkQuery, { identifier: { handle } });
    
    let productId: string;
    
    if (existing.productByIdentifier) {
      productId = existing.productByIdentifier.id;
      reportProgress('product_exists', `Product exists: ${productId}`, 15);
    } else {
      reportProgress('create_product', `Creating product: ${title}`, 20);
      const createMutation = `
        mutation productCreate($input: ProductInput!) {
          productCreate(input: $input) {
            product { id }
            userErrors { field message }
          }
        }
      `;
      const createResult = await fetchShopify<{
        productCreate: {
          product: { id: string } | null;
          userErrors: { field: string[]; message: string }[];
        };
      }>(createMutation, {
        input: {
          title,
          handle,
          productType: 'Magic Request',
          tags: ['custom-candle', 'magic-request'],
          status: 'DRAFT',
          descriptionHtml: `<p>Custom ${title} vessel for Magic Request candles.</p>`,
        },
      });
      if (!createResult.productCreate.product) {
        throw new Error(
          `Failed to create product ${title}: ${createResult.productCreate.userErrors
            .map((e) => e.message)
            .join(', ') || 'Unknown error'}`
        );
      }

      productId = createResult.productCreate.product.id;
      reportProgress('product_created', `Product created: ${productId}`, 25);
    }

    // 2. Set product metafields
    reportProgress('set_metafields', 'Setting product metafields', 30);
    const setProductMetafieldsMutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }
    `;
    // Extract unique wax and wick types for metafields and options
    const waxValues = Object.keys(config.waxes);
    const wickValues = Object.keys(config.wicks);
    const containerType = `${vesselName} ${vessel.sizeOz}oz`;
    
    await fetchShopify(setProductMetafieldsMutation, {
      metafields: [
        // Pricing metafields (migrated to magic_request.* namespace for consistency and Shopify's 3+ char requirement)
        { ownerId: productId, namespace: 'magic_request', key: 'sizeOz', type: 'number_integer', value: String(vessel.sizeOz) },
        { ownerId: productId, namespace: 'magic_request', key: 'vesselBaseCostCents', type: 'number_integer', value: String(vessel.baseCostCents) },
        { ownerId: productId, namespace: 'magic_request', key: 'marginPct', type: 'number_decimal', value: String(vessel.marginPct ?? config.marginPct) },
        { ownerId: productId, namespace: 'magic_request', key: 'supplier', type: 'single_line_text_field', value: vessel.supplier ?? config.supplier },
        { ownerId: productId, namespace: 'magic_request', key: 'deploymentVersion', type: 'single_line_text_field', value: deploymentVersion },
        // Ingredient metafields for Ingredients tab
        { ownerId: productId, namespace: 'magic_request', key: 'waxTypes', type: 'list.single_line_text_field', value: JSON.stringify(waxValues) },
        { ownerId: productId, namespace: 'magic_request', key: 'wickTypes', type: 'list.single_line_text_field', value: JSON.stringify(wickValues) },
        { ownerId: productId, namespace: 'magic_request', key: 'containerType', type: 'single_line_text_field', value: containerType },
      ],
    });

    // 3. Ensure options are "Wax" and "Wick"
    if (!existing.productByIdentifier) {
      reportProgress('create_options', 'Creating product options (Wax, Wick)', 35);
      
      const createOptionsMutation = `
        mutation productOptionsCreate($productId: ID!, $options: [OptionCreateInput!]!, $variantStrategy: ProductOptionCreateVariantStrategy) {
          productOptionsCreate(productId: $productId, options: $options, variantStrategy: $variantStrategy) {
            product { id }
            userErrors { field message }
          }
        }
      `;
      await fetchShopify(createOptionsMutation, {
        productId,
        options: [
          { name: 'Wax', position: 1, values: waxValues.map(v => ({ name: v })) },
          { name: 'Wick', position: 2, values: wickValues.map(v => ({ name: v })) },
        ],
        variantStrategy: 'CREATE',
      });
    }

    // 4. Get existing variants and create missing ones
    reportProgress('check_variants', 'Checking existing variants', 40);
    const getVariantsQuery = `
      query ($id: ID!) {
        product(id: $id) {
          variants(first: 100) {
            edges {
              node {
                id
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    `;
    const variantsData = await fetchShopify(getVariantsQuery, { id: productId });
    let allVariants = variantsData.product.variants.edges.map((e: any) => e.node);
    
    // Calculate expected variants (Cartesian: Wax × Wick)
    const expectedCombinations: [string, string][] = [];
    for (const waxName of Object.keys(config.waxes)) {
      for (const wickName of Object.keys(config.wicks)) {
        expectedCombinations.push([waxName, wickName]);
      }
    }
    
    // Check which variants exist
    const existingCombinations = new Set(
      allVariants
        .filter((v: any) => {
          const options = v.selectedOptions.reduce((acc: any, opt: any) => {
            acc[opt.name] = opt.value;
            return acc;
          }, {});
          return options['Wax'] && options['Wick'];
        })
        .map((v: any) => {
          const options = v.selectedOptions.reduce((acc: any, opt: any) => {
            acc[opt.name] = opt.value;
            return acc;
          }, {});
          return `${options['Wax']}|${options['Wick']}`;
        })
    );
    
    // Find missing combinations
    const missingCombinations = expectedCombinations.filter(
      ([wax, wick]) => !existingCombinations.has(`${wax}|${wick}`)
    );
    
    // Create missing variants if any
    if (missingCombinations.length > 0) {
      reportProgress('create_variants', `Creating ${missingCombinations.length} missing variants`, 45);
      const bulkCreateMutation = `
        mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(productId: $productId, variants: $variants) {
            productVariants { id }
            userErrors { field message }
          }
        }
      `;
      
      const variantsToCreate = missingCombinations.map(([wax, wick]) => ({
        optionValues: [
          { optionName: 'Wax', name: wax },
          { optionName: 'Wick', name: wick },
        ],
        price: calculatePrice(vesselName, wax, wick, config),
      }));
      
      const createResult = await fetchShopify(bulkCreateMutation, {
        productId,
        variants: variantsToCreate,
      });
      
      if (createResult.productVariantsBulkCreate.userErrors?.length > 0) {
        const errorMessages = createResult.productVariantsBulkCreate.userErrors.map((e: any) => e.message);
        errors.push(...errorMessages);
        console.warn('Errors creating variants:', errorMessages);
      } else {
        reportProgress('variants_created', `Created ${createResult.productVariantsBulkCreate.productVariants?.length || 0} variants`, 50);
        
        // Re-fetch variants to get the newly created ones
        const updatedVariantsData = await fetchShopify(getVariantsQuery, { id: productId });
        allVariants = updatedVariantsData.product.variants.edges.map((e: any) => e.node);
      }
    }

    reportProgress('update_prices', `Updating prices for ${allVariants.length} variants`, 55);

    // 5. Update prices and metafields for all variants
    const variantUpdates: any[] = [];
    const variantMetafields: any[] = [];
    
    for (const variant of allVariants) {
      const options = variant.selectedOptions.reduce((acc: any, opt: any) => {
        acc[opt.name] = opt.value;
        return acc;
      }, {});
      
      const waxName = options['Wax'];
      const wickName = options['Wick'];
      
      if (!waxName || !wickName) continue;
      
      const price = calculatePrice(vesselName, waxName, wickName, config);
      variantUpdates.push({
        id: variant.id,
        price,
      });
      
      variantMetafields.push({
        ownerId: variant.id,
        metafields: [
          // Pricing metafields (using magic_request.* namespace)
          { ownerId: variant.id, namespace: 'magic_request', key: 'waxPricePerOzCents', type: 'number_integer', value: String(config.waxes[waxName].pricePerOzCents) },
          { ownerId: variant.id, namespace: 'magic_request', key: 'wickCostCents', type: 'number_integer', value: String(config.wicks[wickName].costCents) },
          { ownerId: variant.id, namespace: 'magic_request', key: 'enabled', type: 'number_integer', value: '1' },
        ],
      });
    }
    
    // Bulk update prices
    if (variantUpdates.length > 0) {
      const updateVariantsMutation = `
        mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants { id }
            userErrors { field message }
          }
        }
      `;
      await fetchShopify(updateVariantsMutation, {
        productId,
        variants: variantUpdates,
      });
      reportProgress('prices_updated', `Updated ${variantUpdates.length} variant prices`, 65);
    }
    
    // Bulk set metafields
    if (variantMetafields.length > 0) {
      const allMetafields = variantMetafields.flatMap((v: any) => v.metafields);
      await fetchShopify(setProductMetafieldsMutation, {
        metafields: allMetafields,
      });
      reportProgress('metafields_set', `Set metafields for ${variantMetafields.length} variants`, 70);
    }

    // 6. Activate inventory
    reportProgress('activate_inventory', 'Activating inventory', 75);
    const locationId = await getPrimaryLocationId();
    if (locationId) {
      const getInventoryQuery = `
        query ($id: ID!) {
          product(id: $id) {
            variants(first: 100) {
              edges {
                node {
                  id
                  inventoryItem { 
                    id
                    tracked
                  }
                }
              }
            }
          }
        }
      `;
      const inventoryData = await fetchShopify(getInventoryQuery, { id: productId });
      
      let activatedCount = 0;
      for (const variant of inventoryData.product.variants.edges) {
        const inventoryItem = variant.node.inventoryItem;
        if (!inventoryItem?.id) {
          reportProgress('inventory_warning', `Variant ${variant.node.id} has no inventoryItem`, 75);
          continue;
        }
        
        const inventoryItemId = inventoryItem.id;
        
        // First, ensure tracking is enabled on the inventory item
        if (!inventoryItem.tracked) {
          const updateItemMutation = `
            mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
              inventoryItemUpdate(id: $id, input: $input) {
                inventoryItem { id tracked }
                userErrors { field message }
              }
            }
          `;
          const updateResult = await fetchShopify(updateItemMutation, {
            id: inventoryItemId,
            input: {
              tracked: true,
            },
          });
          if (updateResult.inventoryItemUpdate?.userErrors?.length > 0) {
            reportProgress('inventory_error', `Failed to enable tracking for ${inventoryItemId}`, 75);
            continue;
          }
        }
        
        // Then activate inventory at the location
        const activateMutation = `
          mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!) {
            inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) {
              inventoryLevel { id }
              userErrors { field message }
            }
          }
        `;
        const activateResult = await fetchShopify(activateMutation, { inventoryItemId, locationId });
        if (activateResult.inventoryActivate?.userErrors?.length > 0) {
          reportProgress('inventory_error', `Failed to activate inventory for ${inventoryItemId}`, 75);
          continue;
        }
        
        // Set quantity (if configured)
        // Note: inventoryQuantity can be passed in config or left null to skip
        const inventoryQuantity = (vessel as any).inventoryQuantity ?? (config as any).inventoryQuantity ?? 999;
        if (inventoryQuantity !== null && inventoryQuantity !== undefined) {
          const setQuantitiesMutation = `
            mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
              inventorySetQuantities(input: $input) {
                inventoryAdjustmentGroup { id }
                userErrors { field message }
              }
            }
          `;
          const quantityResult = await fetchShopify(setQuantitiesMutation, {
            input: {
              name: 'available',
              reason: 'correction',
              ignoreCompareQuantity: true,
              quantities: [{ inventoryItemId, locationId, quantity: inventoryQuantity }],
            },
          });
          if (quantityResult.inventorySetQuantities?.userErrors?.length > 0) {
            reportProgress('inventory_error', `Failed to set quantity for ${inventoryItemId}`, 75);
          } else {
            activatedCount++;
          }
        } else {
          activatedCount++;
        }
      }
      reportProgress('inventory_complete', `Activated inventory for ${activatedCount}/${inventoryData.product.variants.edges.length} variants`, 80);
    }

    // 7. Publish to Dev Headless channel only
    reportProgress('publish', 'Publishing to Dev Headless channel', 85);
    const devHeadlessPublicationId = await getPublicationId('Threechicksandawick Dev Headless');
    if (devHeadlessPublicationId) {
      const publishMutation = `
        mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
          publishablePublish(id: $id, input: $input) {
            publishable {
              ... on Product {
                id
                status
              }
            }
            userErrors { field message }
          }
        }
      `;
      await fetchShopify(publishMutation, {
        id: productId,
        input: [{ publicationId: devHeadlessPublicationId }],
      });
    }

    // 8. Activate product
    reportProgress('activate_product', 'Activating product', 90);
    const updateProductMutation = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product { id }
          userErrors { field message }
        }
      }
    `;
    await fetchShopify(updateProductMutation, {
      input: {
        id: productId,
        status: 'ACTIVE',
      },
    });

    reportProgress('complete', `Deployment complete: ${title}`, 100);

    return {
      success: errors.length === 0,
      productId,
      variantCount: allVariants.length,
      errors: errors.length > 0 ? errors : undefined,
      progress: progressLog,
    };

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    errors.push(errorMessage);
    reportProgress('error', `Error: ${errorMessage}`, -1);
    
    return {
      success: false,
      errors,
      progress: progressLog,
    };
  }
}

export type DeploymentDiff = {
  vesselsToCreate: string[];
  vesselsToUpdate: string[];
  vesselsToDisable: string[]; // Set magic_request.enabled=false (reversible)
  vesselsToDelete: string[];  // Actually delete from Shopify (irreversible)
  summary: string;
};

/**
 * Compute diff between Admin Panel config and current Shopify state
 */
export async function computeDeploymentDiff(config: PricingConfig): Promise<DeploymentDiff> {
  // Fetch all Magic Request products from Shopify
  const query = `
    query {
      products(first: 50, query: "product_type:Magic Request") {
        edges {
          node {
            id
            handle
            title
            status
            variants(first: 100) {
              edges {
                node {
                  id
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  
  const shopifyData = await fetchShopify<any>(query);
  const existingProducts = shopifyData.products.edges.map((e: any) => e.node);
  
  const vesselsToCreate: string[] = [];
  const vesselsToUpdate: string[] = [];
  const vesselsToDisable: string[] = [];
  const vesselsToDelete: string[] = [];
  
  const desiredVesselHandles = new Set(
    Object.keys(config.vessels).map(name => {
      const vessel = config.vessels[name];
      return slugify(`${name} ${vessel.sizeOz}oz`);
    })
  );
  
  const handleToVesselName = new Map(
    Object.keys(config.vessels).map(name => {
      const vessel = config.vessels[name];
      return [slugify(`${name} ${vessel.sizeOz}oz`), name];
    })
  );
  
  const existingHandles = new Set(existingProducts.map((p: any) => p.handle));
  
  // Find vessels to create/update (check status in config)
  for (const vesselName of Object.keys(config.vessels)) {
    const vessel = config.vessels[vesselName];
    const handle = slugify(`${vesselName} ${vessel.sizeOz}oz`);
    
    // Skip disabled/deleted vessels in config (they'll be handled separately)
    if (vessel.status === 'disabled' || vessel.status === 'deleted') {
      continue;
    }
    
    if (!existingHandles.has(handle)) {
      vesselsToCreate.push(vesselName);
    } else {
      vesselsToUpdate.push(vesselName);
    }
  }
  
  // Find vessels to disable or delete (check status in config OR missing from config)
  for (const product of existingProducts) {
    const vesselName = handleToVesselName.get(product.handle);
    
    if (vesselName) {
      // Vessel exists in config - check status
      const vessel = config.vessels[vesselName];
      if (vessel.status === 'disabled') {
        vesselsToDisable.push(product.id); // Use product ID for deletion/disable
      } else if (vessel.status === 'deleted') {
        vesselsToDelete.push(product.id);
      }
    } else {
      // Vessel doesn't exist in config - default to disable (safer than delete)
      vesselsToDisable.push(product.id);
    }
  }
  
  const summary = [
    vesselsToCreate.length > 0 && `${vesselsToCreate.length} vessel(s) to create`,
    vesselsToUpdate.length > 0 && `${vesselsToUpdate.length} vessel(s) to update`,
    vesselsToDisable.length > 0 && `${vesselsToDisable.length} vessel(s) to disable`,
    vesselsToDelete.length > 0 && `${vesselsToDelete.length} vessel(s) to delete`,
  ].filter(Boolean).join(', ') || 'No changes needed';
  
  return {
    vesselsToCreate,
    vesselsToUpdate,
    vesselsToDisable,
    vesselsToDelete,
    summary,
  };
}

/**
 * Unified deploy function with diff-based updates
 * 
 * This is the main function for Admin Panel "Deploy to Shopify" button.
 * It computes a diff, shows what will change, then applies only necessary updates.
 */
export async function deployMagicRequestProducts(
  config: PricingConfig,
  onProgress?: (progress: DeploymentProgress) => void
): Promise<{ success: boolean; results: DeploymentResult[]; diff: DeploymentDiff; errors?: string[] }> {
  const errors: string[] = [];
  const results: DeploymentResult[] = [];
  
  // 1. Compute diff
  onProgress?.({ step: 'compute_diff', message: 'Computing changes...', progress: 5 });
  const diff = await computeDeploymentDiff(config);
  
  onProgress?.({ step: 'diff_complete', message: diff.summary, progress: 10 });
  
  // 2. Disable vessels (set magic_request.enabled=false on all variants)
  if (diff.vesselsToDisable.length > 0) {
    onProgress?.({ step: 'disable_vessels', message: `Disabling ${diff.vesselsToDisable.length} vessel(s)...`, progress: 15 });
    
    for (const productId of diff.vesselsToDisable) {
      try {
        // Get all variants
        const getVariantsQuery = `
          query ($id: ID!) {
            product(id: $id) {
              id
              title
              variants(first: 100) {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        `;
        const productData = await fetchShopify(getVariantsQuery, { id: productId });
        
        if (productData.product) {
          const variants = productData.product.variants.edges.map((e: any) => e.node);
          
          // Set magic_request.enabled=false on all variants
          if (variants.length > 0) {
            const metafields = variants.map((v: any) => ({
              ownerId: v.id,
              namespace: 'magic_request',
              key: 'enabled',
              type: 'number_integer',
              value: '0', // false
            }));
            
            const setProductMetafieldsMutation = `
              mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) {
                  metafields { id }
                  userErrors { field message }
                }
              }
            `;
            await fetchShopify(setProductMetafieldsMutation, { metafields });
            onProgress?.({ step: 'vessel_disabled', message: `Disabled ${variants.length} variants for ${productData.product.title}`, progress: 16 });
          }
        }
      } catch (error: any) {
        errors.push(`Failed to disable vessel ${productId}: ${error.message}`);
      }
    }
  }

  // 3. Delete vessels (permanently remove from Shopify)
  if (diff.vesselsToDelete.length > 0) {
    onProgress?.({ step: 'delete_vessels', message: `Deleting ${diff.vesselsToDelete.length} vessel(s)...`, progress: 17 });
    
    for (const productId of diff.vesselsToDelete) {
      try {
        const deleteMutation = `
          mutation productDelete($input: ProductDeleteInput!) {
            productDelete(input: $input) {
              deletedProductId
              userErrors { field message }
            }
          }
        `;
        const result = await fetchShopify(deleteMutation, {
          input: { id: productId },
        });
        
        if (result.productDelete.deletedProductId) {
          onProgress?.({ step: 'vessel_deleted', message: `Deleted product ${productId}`, progress: 18 });
        } else if (result.productDelete.userErrors?.length > 0) {
          errors.push(`Failed to delete ${productId}: ${result.productDelete.userErrors.map((e: any) => e.message).join(', ')}`);
        }
      } catch (error: any) {
        errors.push(`Failed to delete vessel ${productId}: ${error.message}`);
      }
    }
  }
  
  // 4. Deploy vessels (create + update)
  const allVessels = [...diff.vesselsToCreate, ...diff.vesselsToUpdate];
  const totalSteps = allVessels.length;
  
  for (let i = 0; i < allVessels.length; i++) {
    const vesselName = allVessels[i];
    const baseProgress = 20 + (i / totalSteps) * 70;
    
    onProgress?.({ 
      step: 'deploy_vessel', 
      message: `${diff.vesselsToCreate.includes(vesselName) ? 'Creating' : 'Updating'} ${vesselName}...`, 
      progress: Math.round(baseProgress)
    });
    
    const result = await deployMagicRequestVessel(
      vesselName,
      config,
      (progress) => {
        // Scale progress to vessel's portion of total
        const vesselProgress = baseProgress + (progress.progress / 100) * (70 / totalSteps);
        onProgress?.({
          ...progress,
          progress: Math.round(vesselProgress),
        });
      }
    );
    
    results.push(result);
    if (!result.success && result.errors) {
      errors.push(...result.errors);
    }
  }
  
  onProgress?.({ step: 'complete', message: 'Deployment complete!', progress: 100 });
  
  return {
    success: errors.length === 0,
    results,
    diff,
    errors: errors.length > 0 ? errors : undefined,
  };
}

