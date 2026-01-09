'use server';

/**
 * Custom Candle Product Deployment Service
 * 
 * Handles the multi-step process of deploying custom candle products to Shopify.
 * Refactored from the monolithic "Magic Request" implementation into focused helpers.
 * 
 * Steps:
 * 1. Check if product exists (findOrCreateProduct)
 * 2. Set product metafields (setProductMetafields)
 * 3. Create options for Wax/Wick (createProductOptions)
 * 4. Create missing variants (syncVariants)
 * 5. Update variant prices (updateVariantPrices)
 * 6. Activate inventory at location (activateInventory)
 * 7. Publish to sales channel (publishToChannel)
 * 8. Activate product (activateProduct)
 */

import { fetchShopify } from '@/lib/shopify-client';

// ============================================================================
// Types
// ============================================================================

export type VesselConfig = {
  name: string;
  sizeOz: number;
  baseCostCents: number;
  marginPct?: number;
  supplier?: string;
  status?: 'enabled' | 'disabled' | 'deleted';
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
  inventoryQuantity?: number | null;
};

export type DeploymentProgress = {
  step: string;
  message: string;
  progress: number;
};

type DeploymentResult = {
  success: boolean;
  productId?: string;
  variantCount?: number;
  errors?: string[];
  progress?: DeploymentProgress[];
};

// ============================================================================
// Utility Functions
// ============================================================================

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

// ============================================================================
// Step 1: Find or Create Product
// ============================================================================

type ExistingProduct = {
  id: string;
  title: string;
  variants: { id: string; price: string; selectedOptions: { name: string; value: string }[] }[];
};

async function findOrCreateProduct(
  handle: string,
  title: string
): Promise<{ productId: string; isNew: boolean }> {
  const checkQuery = `
    query ($identifier: ProductIdentifierInput!) {
      productByIdentifier(identifier: $identifier) {
        id
        title
      }
    }
  `;
  
  const existing = await fetchShopify<{ productByIdentifier: { id: string } | null }>(
    checkQuery,
    { identifier: { handle } }
  );

  if (existing.productByIdentifier) {
    return { productId: existing.productByIdentifier.id, isNew: false };
  }

  const createMutation = `
    mutation productCreate($input: ProductInput!) {
      productCreate(input: $input) {
        product { id }
        userErrors { field message }
      }
    }
  `;

  const createResult = await fetchShopify<{
    productCreate: { product: { id: string } | null; userErrors: { message: string }[] };
  }>(createMutation, {
    input: {
      title,
      handle,
      productType: 'Custom Candle',
      tags: ['custom-candle', 'custom-request'],
      status: 'DRAFT',
      descriptionHtml: `<p>Custom ${title} vessel for personalized candles.</p>`,
    },
  });

  if (!createResult.productCreate.product) {
    throw new Error(
      `Failed to create product: ${createResult.productCreate.userErrors.map((e) => e.message).join(', ')}`
    );
  }

  return { productId: createResult.productCreate.product.id, isNew: true };
}

// ============================================================================
// Step 2: Set Product Metafields
// ============================================================================

async function setProductMetafields(
  productId: string,
  vessel: VesselConfig,
  vesselName: string,
  config: PricingConfig
): Promise<void> {
  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }
  `;

  const waxValues = Object.keys(config.waxes);
  const wickValues = Object.keys(config.wicks);
  const containerType = `${vesselName} ${vessel.sizeOz}oz`;
  const deploymentVersion = `v${new Date().toISOString().slice(0, 16).replace(/[-T:]/g, '')}`;

  await fetchShopify(mutation, {
    metafields: [
      { ownerId: productId, namespace: 'custom_candle', key: 'sizeOz', type: 'number_integer', value: String(vessel.sizeOz) },
      { ownerId: productId, namespace: 'custom_candle', key: 'vesselBaseCostCents', type: 'number_integer', value: String(vessel.baseCostCents) },
      { ownerId: productId, namespace: 'custom_candle', key: 'marginPct', type: 'number_decimal', value: String(vessel.marginPct ?? config.marginPct) },
      { ownerId: productId, namespace: 'custom_candle', key: 'supplier', type: 'single_line_text_field', value: vessel.supplier ?? config.supplier },
      { ownerId: productId, namespace: 'custom_candle', key: 'deploymentVersion', type: 'single_line_text_field', value: deploymentVersion },
      { ownerId: productId, namespace: 'custom_candle', key: 'waxTypes', type: 'list.single_line_text_field', value: JSON.stringify(waxValues) },
      { ownerId: productId, namespace: 'custom_candle', key: 'wickTypes', type: 'list.single_line_text_field', value: JSON.stringify(wickValues) },
      { ownerId: productId, namespace: 'custom_candle', key: 'containerType', type: 'single_line_text_field', value: containerType },
    ],
  });
}

// ============================================================================
// Step 3: Create Product Options
// ============================================================================

async function createProductOptions(
  productId: string,
  waxValues: string[],
  wickValues: string[]
): Promise<void> {
  const mutation = `
    mutation productOptionsCreate($productId: ID!, $options: [OptionCreateInput!]!, $variantStrategy: ProductOptionCreateVariantStrategy) {
      productOptionsCreate(productId: $productId, options: $options, variantStrategy: $variantStrategy) {
        product { id }
        userErrors { field message }
      }
    }
  `;

  await fetchShopify(mutation, {
    productId,
    options: [
      { name: 'Wax', position: 1, values: waxValues.map((v) => ({ name: v })) },
      { name: 'Wick', position: 2, values: wickValues.map((v) => ({ name: v })) },
    ],
    variantStrategy: 'CREATE',
  });
}

// ============================================================================
// Step 4: Sync Variants (Create Missing)
// ============================================================================

type Variant = {
  id: string;
  selectedOptions: { name: string; value: string }[];
};

async function getProductVariants(productId: string): Promise<Variant[]> {
  const query = `
    query ($id: ID!) {
      product(id: $id) {
        variants(first: 100) {
          edges {
            node {
              id
              selectedOptions { name value }
            }
          }
        }
      }
    }
  `;
  const result = await fetchShopify<{ product: { variants: { edges: { node: Variant }[] } } }>(
    query,
    { id: productId }
  );
  return result.product.variants.edges.map((e) => e.node);
}

async function createMissingVariants(
  productId: string,
  vesselName: string,
  config: PricingConfig,
  existingVariants: Variant[]
): Promise<number> {
  const expectedCombinations: [string, string][] = [];
  for (const waxName of Object.keys(config.waxes)) {
    for (const wickName of Object.keys(config.wicks)) {
      expectedCombinations.push([waxName, wickName]);
    }
  }

  const existingSet = new Set(
    existingVariants
      .filter((v) => {
        const opts = Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value]));
        return opts['Wax'] && opts['Wick'];
      })
      .map((v) => {
        const opts = Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value]));
        return `${opts['Wax']}|${opts['Wick']}`;
      })
  );

  const missing = expectedCombinations.filter(([wax, wick]) => !existingSet.has(`${wax}|${wick}`));

  if (missing.length === 0) return 0;

  const mutation = `
    mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkCreate(productId: $productId, variants: $variants) {
        productVariants { id }
        userErrors { field message }
      }
    }
  `;

  const variantsToCreate = missing.map(([wax, wick]) => ({
    optionValues: [
      { optionName: 'Wax', name: wax },
      { optionName: 'Wick', name: wick },
    ],
    price: calculatePrice(vesselName, wax, wick, config),
  }));

  const result = await fetchShopify<{
    productVariantsBulkCreate: { productVariants: { id: string }[]; userErrors: { message: string }[] };
  }>(mutation, { productId, variants: variantsToCreate });

  return result.productVariantsBulkCreate.productVariants?.length || 0;
}

// ============================================================================
// Step 5: Update Variant Prices
// ============================================================================

async function updateVariantPrices(
  productId: string,
  vesselName: string,
  config: PricingConfig,
  variants: Variant[]
): Promise<number> {
  const updates = variants
    .map((v) => {
      const opts = Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value]));
      const wax = opts['Wax'];
      const wick = opts['Wick'];
      if (!wax || !wick) return null;
      return { id: v.id, price: calculatePrice(vesselName, wax, wick, config) };
    })
    .filter(Boolean);

  if (updates.length === 0) return 0;

  const mutation = `
    mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id }
        userErrors { field message }
      }
    }
  `;

  await fetchShopify(mutation, { productId, variants: updates });
  return updates.length;
}

// ============================================================================
// Step 6: Activate Inventory
// ============================================================================

async function getPrimaryLocationId(): Promise<string | null> {
  const query = `
    query {
      locations(first: 1, query: "isPrimary:true") {
        edges { node { id } }
      }
    }
  `;
  try {
    const result = await fetchShopify<{ locations: { edges: { node: { id: string } }[] } }>(query);
    return result.locations.edges[0]?.node.id || null;
  } catch {
    return null;
  }
}

async function activateInventory(
  productId: string,
  locationId: string,
  defaultQuantity: number
): Promise<number> {
  const query = `
    query ($id: ID!) {
      product(id: $id) {
        variants(first: 100) {
          edges {
            node {
              id
              inventoryItem { id tracked }
            }
          }
        }
      }
    }
  `;

  const data = await fetchShopify<{
    product: { variants: { edges: { node: { id: string; inventoryItem: { id: string; tracked: boolean } } }[] } };
  }>(query, { id: productId });

  let activated = 0;

  for (const { node } of data.product.variants.edges) {
    const inventoryItemId = node.inventoryItem?.id;
    if (!inventoryItemId) continue;

    // Enable tracking if not already
    if (!node.inventoryItem.tracked) {
      await fetchShopify(
        `mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
          inventoryItemUpdate(id: $id, input: $input) { inventoryItem { id } userErrors { message } }
        }`,
        { id: inventoryItemId, input: { tracked: true } }
      );
    }

    // Activate at location
    await fetchShopify(
      `mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!) {
        inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) {
          inventoryLevel { id } userErrors { message }
        }
      }`,
      { inventoryItemId, locationId }
    );

    // Set quantity
    await fetchShopify(
      `mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) { inventoryAdjustmentGroup { id } userErrors { message } }
      }`,
      {
        input: {
          name: 'available',
          reason: 'correction',
          ignoreCompareQuantity: true,
          quantities: [{ inventoryItemId, locationId, quantity: defaultQuantity }],
        },
      }
    );

    activated++;
  }

  return activated;
}

// ============================================================================
// Step 7: Publish to Channel
// ============================================================================

async function getPublicationId(name: string): Promise<string | null> {
  const query = `
    query {
      publications(first: 25) {
        edges { node { id name } }
      }
    }
  `;
  try {
    const result = await fetchShopify<{ publications: { edges: { node: { id: string; name: string } }[] } }>(query);
    const pub = result.publications.edges.find((e) => e.node.name === name);
    return pub?.node.id || null;
  } catch {
    return null;
  }
}

async function publishToChannel(productId: string, publicationId: string): Promise<void> {
  const mutation = `
    mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        publishable { ... on Product { id } }
        userErrors { message }
      }
    }
  `;
  await fetchShopify(mutation, { id: productId, input: [{ publicationId }] });
}

// ============================================================================
// Step 8: Activate Product
// ============================================================================

async function activateProduct(productId: string): Promise<void> {
  const mutation = `
    mutation productUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id }
        userErrors { message }
      }
    }
  `;
  await fetchShopify(mutation, { input: { id: productId, status: 'ACTIVE' } });
}

// ============================================================================
// Main Deployment Function (Orchestrator)
// ============================================================================

/**
 * Deploy or update a custom candle vessel product in Shopify.
 * 
 * Orchestrates the 8-step deployment process using extracted helper functions.
 */
export async function deployCustomCandleVessel(
  vesselName: string,
  config: PricingConfig,
  onProgress?: (progress: DeploymentProgress) => void
): Promise<DeploymentResult> {
  const vessel = config.vessels[vesselName];
  if (!vessel) {
    return { success: false, errors: [`Vessel "${vesselName}" not found in configuration`] };
  }

  const errors: string[] = [];
  const progressLog: DeploymentProgress[] = [];

  const report = (step: string, message: string, progress: number) => {
    const p = { step, message, progress };
    progressLog.push(p);
    onProgress?.(p);
  };

  try {
    const handle = slugify(`${vesselName} ${vessel.sizeOz}oz`);
    const title = `${vesselName} ${vessel.sizeOz}oz`;

    // Step 1: Find or create product
    report('find_product', `Checking product: ${title}`, 10);
    const { productId, isNew } = await findOrCreateProduct(handle, title);
    report('product_ready', isNew ? `Created: ${productId}` : `Found: ${productId}`, 20);

    // Step 2: Set metafields
    report('metafields', 'Setting product metafields', 30);
    await setProductMetafields(productId, vessel, vesselName, config);

    // Step 3: Create options (only for new products)
    if (isNew) {
      report('options', 'Creating Wax/Wick options', 40);
      await createProductOptions(productId, Object.keys(config.waxes), Object.keys(config.wicks));
    }

    // Step 4: Sync variants
    report('variants', 'Syncing variants', 50);
    let variants = await getProductVariants(productId);
    const created = await createMissingVariants(productId, vesselName, config, variants);
    if (created > 0) {
      variants = await getProductVariants(productId); // Refresh
      report('variants_created', `Created ${created} variants`, 55);
    }

    // Step 5: Update prices
    report('prices', 'Updating variant prices', 60);
    const updated = await updateVariantPrices(productId, vesselName, config, variants);
    report('prices_done', `Updated ${updated} prices`, 70);

    // Step 6: Activate inventory
    report('inventory', 'Activating inventory', 75);
    const locationId = await getPrimaryLocationId();
    if (locationId) {
      const defaultQty = (vessel as any).inventoryQuantity ?? config.inventoryQuantity ?? 999;
      const activated = await activateInventory(productId, locationId, defaultQty);
      report('inventory_done', `Activated ${activated} items`, 80);
    }

    // Step 7: Publish
    report('publish', 'Publishing to channel', 85);
    const pubId = await getPublicationId('Threechicksandawick Dev Headless');
    if (pubId) {
      await publishToChannel(productId, pubId);
    }

    // Step 8: Activate
    report('activate', 'Activating product', 95);
    await activateProduct(productId);

    report('complete', `Deployment complete: ${title}`, 100);

    return {
      success: errors.length === 0,
      productId,
      variantCount: variants.length,
      errors: errors.length > 0 ? errors : undefined,
      progress: progressLog,
    };
  } catch (error: any) {
    errors.push(error.message || 'Unknown error');
    report('error', `Error: ${error.message}`, -1);
    return { success: false, errors, progress: progressLog };
  }
}

// ============================================================================
// Legacy Alias (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use deployCustomCandleVessel instead
 */
export const deployMagicRequestVessel = deployCustomCandleVessel;
