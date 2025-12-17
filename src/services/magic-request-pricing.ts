'use server';

/**
 * Magic Request Pricing Service
 * 
 * Handles pricing updates for Magic Request products:
 * - Fetch current pricing from Shopify metafields
 * - Calculate price changes when wax/wick/container prices change
 * - Preview changes before applying
 * - Bulk update all affected variants
 */

import { fetchShopify } from './shopify';

// Rate limiting: 2 requests/second = 500ms between requests
const RATE_LIMIT_DELAY = 500;
const MAX_RETRIES = 3;

// Helper to sleep
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to validate price changes (>50% change warning)
function validatePriceChange(current: number, newPrice: number): { valid: boolean; warning?: string } {
  if (current === 0) return { valid: true }; // Skip validation for zero prices
  const changePct = Math.abs((newPrice - current) / current * 100);
  if (changePct > 50) {
    return {
      valid: true,
      warning: `Price change >50% detected: $${current.toFixed(2)} → $${newPrice.toFixed(2)} (${changePct.toFixed(1)}% change)`,
    };
  }
  return { valid: true };
}

export type PricingUpdate = {
  waxPricePerOzCents?: number;  // Change price per oz for a wax type
  wickCostCents?: number;        // Change cost for a wick type
  vesselBaseCostCents?: number;  // Change base cost for a vessel
};

export type PriceChangePreview = {
  productId: string;
  productTitle: string;
  variantId: string;
  variantTitle: string;
  currentPrice: string;
  newPrice: string;
  change: string;  // e.g., "+$2.50" or "-$1.00"
  wax: string;
  wick: string;
  container: string;
};

export type PricingPreview = {
  changes: PriceChangePreview[];
  summary: {
    totalVariants: number;
    variantsWithChanges: number;
    totalPriceIncrease: number;
    totalPriceDecrease: number;
  };
};

/**
 * Get current pricing configuration from Shopify products
 */
export async function getCurrentPricingConfig(): Promise<{
  waxes: Record<string, { pricePerOzCents: number }>;
  wicks: Record<string, { costCents: number }>;
  vessels: Record<string, { baseCostCents: number; sizeOz: number; marginPct: number }>;
}> {
  const query = `
    query GetMagicRequestPricing {
      products(first: 50, query: "product_type:Magic Request") {
        edges {
          node {
            id
            title
            handle
            mrSizeOz: metafield(namespace: "magic_request", key: "sizeOz") {
              value
            }
            mrVesselBaseCostCents: metafield(namespace: "magic_request", key: "vesselBaseCostCents") {
              value
            }
            mrMarginPct: metafield(namespace: "magic_request", key: "marginPct") {
              value
            }
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  price
                  mrWaxPricePerOzCents: metafield(namespace: "magic_request", key: "waxPricePerOzCents") {
                    value
                  }
                  mrWickCostCents: metafield(namespace: "magic_request", key: "wickCostCents") {
                    value
                  }
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

  const result = await fetchShopify<any>(query);
  const products = result.products.edges.map((e: any) => e.node);

  const waxes: Record<string, { pricePerOzCents: number }> = {};
  const wicks: Record<string, { costCents: number }> = {};
  const vessels: Record<string, { baseCostCents: number; sizeOz: number; marginPct: number }> = {};

  // Extract unique values from all variants
  const waxSet = new Map<string, number>();
  const wickSet = new Map<string, number>();
  const vesselSet = new Map<string, { baseCostCents: number; sizeOz: number; marginPct: number }>();

  for (const product of products) {
    const sizeOz = parseInt(product.mrSizeOz?.value || '0');
    const baseCostCents = parseInt(product.mrVesselBaseCostCents?.value || '0');
    const marginPct = parseFloat(product.mrMarginPct?.value || '20');

    // Extract vessel name from title (e.g., "Mason Jar 16oz" -> "Mason Jar")
    const vesselMatch = product.title.match(/^(.+?)\s+\d+oz$/i);
    const vesselName = vesselMatch ? vesselMatch[1].trim() : product.title;

    if (sizeOz > 0 && baseCostCents > 0) {
      // Use full "VesselName SizeOz" as key to handle multiple sizes of same vessel
      const vesselKey = `${vesselName} ${sizeOz}oz`;
      vesselSet.set(vesselKey, { baseCostCents, sizeOz, marginPct });
    }

    for (const variantEdge of product.variants.edges) {
      const variant = variantEdge.node;
      const options: Record<string, string> = {};
      variant.selectedOptions.forEach((opt: any) => {
        options[opt.name] = opt.value;
      });

      const wax = options['Wax'];
      const wick = options['Wick'];

      if (wax && variant.mrWaxPricePerOzCents?.value) {
        const pricePerOzCents = parseInt(variant.mrWaxPricePerOzCents.value);
        if (!waxSet.has(wax) || waxSet.get(wax)! !== pricePerOzCents) {
          waxSet.set(wax, pricePerOzCents);
        }
      }

      if (wick && variant.mrWickCostCents?.value) {
        const costCents = parseInt(variant.mrWickCostCents.value);
        if (!wickSet.has(wick) || wickSet.get(wick)! !== costCents) {
          wickSet.set(wick, costCents);
        }
      }
    }
  }

  // Convert Maps to Records
  waxSet.forEach((pricePerOzCents, wax) => {
    waxes[wax] = { pricePerOzCents };
  });

  wickSet.forEach((costCents, wick) => {
    wicks[wick] = { costCents };
  });

  vesselSet.forEach((config, vessel) => {
    vessels[vessel] = config;
  });

  return { waxes, wicks, vessels };
}

/**
 * Preview price changes before applying
 */
export async function previewPriceChanges(
  updates: {
    wax?: Record<string, { pricePerOzCents: number }>;
    wick?: Record<string, { costCents: number }>;
    vessel?: Record<string, { baseCostCents: number }>;
  }
): Promise<PricingPreview> {
  const query = `
    query PreviewPriceChanges {
      products(first: 50, query: "product_type:Magic Request") {
        edges {
          node {
            id
            title
            handle
            mrSizeOz: metafield(namespace: "magic_request", key: "sizeOz") {
              value
            }
            mrVesselBaseCostCents: metafield(namespace: "magic_request", key: "vesselBaseCostCents") {
              value
            }
            mrMarginPct: metafield(namespace: "magic_request", key: "marginPct") {
              value
            }
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  price
                  mrWaxPricePerOzCents: metafield(namespace: "magic_request", key: "waxPricePerOzCents") {
                    value
                  }
                  mrWickCostCents: metafield(namespace: "magic_request", key: "wickCostCents") {
                    value
                  }
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

  const result = await fetchShopify<any>(query);
  const products = result.products.edges.map((e: any) => e.node);

  const changes: PriceChangePreview[] = [];
  let totalIncrease = 0;
  let totalDecrease = 0;

  for (const product of products) {
    const sizeOz = parseInt(product.mrSizeOz?.value || '0');
    let baseCostCents = parseInt(product.mrVesselBaseCostCents?.value || '0');
    const marginPct = parseFloat(product.mrMarginPct?.value || '20');

    // Extract vessel name and size to form full key
    const vesselMatch = product.title.match(/^(.+?)\s+(\d+)oz$/i);
    const vesselName = vesselMatch ? vesselMatch[1].trim() : product.title;
    const vesselSizeOz = vesselMatch ? parseInt(vesselMatch[2], 10) : sizeOz;
    const vesselKey = `${vesselName} ${vesselSizeOz}oz`;

    // Check if vessel base cost is being updated (using full key format)
    if (updates.vessel?.[vesselKey]) {
      baseCostCents = updates.vessel[vesselKey].baseCostCents;
    }

    for (const variantEdge of product.variants.edges) {
      const variant = variantEdge.node;
      const options: Record<string, string> = {};
      variant.selectedOptions.forEach((opt: any) => {
        options[opt.name] = opt.value;
      });

      const wax = options['Wax'];
      const wick = options['Wick'];

      if (!wax || !wick) continue;

      // Get current prices
      let waxPricePerOzCents = parseInt(variant.mrWaxPricePerOzCents?.value || '0');
      let wickCostCents = parseInt(variant.mrWickCostCents?.value || '0');

      // Apply updates
      if (updates.wax?.[wax]) {
        waxPricePerOzCents = updates.wax[wax].pricePerOzCents;
      }
      if (updates.wick?.[wick]) {
        wickCostCents = updates.wick[wick].costCents;
      }

      // Calculate current and new prices
      const currentPriceCents = Math.round(parseFloat(variant.price) * 100);
      const baseCents = baseCostCents + wickCostCents + (waxPricePerOzCents * sizeOz);
      const withMarginCents = Math.round(baseCents * (1 + marginPct / 100));
      const newPriceCents = withMarginCents;

      if (currentPriceCents !== newPriceCents) {
      const change = newPriceCents - currentPriceCents;
      if (change > 0) totalIncrease += change;
      else totalDecrease += Math.abs(change);

      // Validate price change (warn if >50%)
      const currentPriceDollars = currentPriceCents / 100;
      const newPriceDollars = newPriceCents / 100;
      const validation = validatePriceChange(currentPriceDollars, newPriceDollars);

      changes.push({
        productId: product.id,
        productTitle: product.title,
        variantId: variant.id,
        variantTitle: variant.title,
        currentPrice: currentPriceDollars.toFixed(2),
        newPrice: newPriceDollars.toFixed(2),
        change: `${change > 0 ? '+' : ''}$${(change / 100).toFixed(2)}${validation.warning ? ' ⚠️' : ''}`,
        wax,
        wick,
        container: product.title,
      });
    }
  }
  }

  // Get total variant count
  const totalVariants = products.reduce((sum: number, p: any) => {
    return sum + p.variants.edges.length;
  }, 0);

  return {
    changes,
    summary: {
      totalVariants,
      variantsWithChanges: changes.length,
      totalPriceIncrease: totalIncrease / 100,
      totalPriceDecrease: totalDecrease / 100,
    },
  };
}

/**
 * Apply price changes to Shopify
 */
export async function applyPriceChanges(
  updates: {
    wax?: Record<string, { pricePerOzCents: number }>;
    wick?: Record<string, { costCents: number }>;
    vessel?: Record<string, { baseCostCents: number }>;
  }
): Promise<{ success: boolean; variantsUpdated: number; errors?: string[]; warnings?: string[] }> {
  const preview = await previewPriceChanges(updates);
  
  if (preview.changes.length === 0) {
    return { success: true, variantsUpdated: 0 };
  }

  // Group changes by product
  const changesByProduct = new Map<string, PriceChangePreview[]>();
  for (const change of preview.changes) {
    if (!changesByProduct.has(change.productId)) {
      changesByProduct.set(change.productId, []);
    }
    changesByProduct.get(change.productId)!.push(change);
  }

  const mutation = `
    mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id }
        userErrors { field message }
      }
    }
  `;

  const errors: string[] = [];
  const warnings: string[] = [];
  let variantsUpdated = 0;

  // Validate all price changes first
  for (const change of preview.changes) {
    const current = parseFloat(change.currentPrice);
    const newPrice = parseFloat(change.newPrice);
    const validation = validatePriceChange(current, newPrice);
    if (validation.warning) {
      warnings.push(`${change.productTitle} - ${change.variantTitle}: ${validation.warning}`);
    }
  }

  // Update metafields for wax/wick prices (build list first)
  const metafieldUpdates: any[] = [];
  
  for (const change of preview.changes) {
    // Get updated wax/wick prices
    let waxPricePerOzCents = null;
    let wickCostCents = null;

    if (updates.wax?.[change.wax]) {
      waxPricePerOzCents = updates.wax[change.wax].pricePerOzCents;
    }
    if (updates.wick?.[change.wick]) {
      wickCostCents = updates.wick[change.wick].costCents;
    }

    // Only update metafields if prices changed
      if (waxPricePerOzCents !== null || wickCostCents !== null) {
        const metafields: any[] = [];
        if (waxPricePerOzCents !== null) {
          metafields.push({
            ownerId: change.variantId,
            namespace: 'magic_request',
            key: 'waxPricePerOzCents',
            type: 'number_integer',
            value: String(waxPricePerOzCents),
          });
        }
        if (wickCostCents !== null) {
          metafields.push({
            ownerId: change.variantId,
            namespace: 'magic_request',
            key: 'wickCostCents',
            type: 'number_integer',
            value: String(wickCostCents),
          });
        }
      if (metafields.length > 0) {
        metafieldUpdates.push(...metafields);
      }
    }
  }

  // Update vessel base costs in metafields
  if (updates.vessel) {
    const vesselMetafieldUpdates: any[] = [];
    
    // Get all products to find which ones match the vessel
    const query = `
      query GetVesselProducts {
        products(first: 50, query: "product_type:Magic Request") {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }
    `;
    
    const productsResult = await fetchShopify<any>(query);
    const allProducts = productsResult.products.edges.map((e: any) => e.node);
    
    for (const [vesselKey, config] of Object.entries(updates.vessel)) {
      // Find products matching this vessel key (e.g., "Mason Jar 16oz")
      const matchingProducts = allProducts.filter((p: any) => {
        // Extract vessel key from product title
        const vesselMatch = p.title.match(/^(.+?)\s+(\d+)oz$/i);
        if (!vesselMatch) return false;
        const productVesselKey = `${vesselMatch[1].trim()} ${vesselMatch[2]}oz`;
        return productVesselKey === vesselKey;
      });
      
      for (const product of matchingProducts) {
        vesselMetafieldUpdates.push({
          ownerId: product.id,
          namespace: 'magic_request',
          key: 'vesselBaseCostCents',
          type: 'number_integer',
          value: String(config.baseCostCents),
        });
      }
    }
    
    // Update vessel metafields in batches
    if (vesselMetafieldUpdates.length > 0) {
      const setMetafieldsMutation = `
        mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields { id }
            userErrors { field message }
          }
        }
      `;
      
      for (let i = 0; i < vesselMetafieldUpdates.length; i += 25) {
        const batch = vesselMetafieldUpdates.slice(i, i + 25);
        try {
          const result = await fetchShopify(setMetafieldsMutation, {
            metafields: batch,
          });
          
          if (result.metafieldsSet.userErrors?.length > 0) {
            errors.push(...result.metafieldsSet.userErrors.map((e: any) => e.message));
          }
        } catch (error) {
          errors.push(`Failed to update vessel metafields: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  }

  // STEP 1: Update variant prices first (critical - prices are customer-facing)
  // Use rate limiting: 2 requests/second = 500ms between requests
  const productEntries = Array.from(changesByProduct.entries());
  for (let idx = 0; idx < productEntries.length; idx++) {
    const [productId, productChanges] = productEntries[idx];
    let attempt = 0;
    let success = false;

    while (attempt < MAX_RETRIES && !success) {
      try {
        const variants = productChanges.map(c => ({
          id: c.variantId,
          price: c.newPrice,
        }));

        const result = await fetchShopify(mutation, {
          productId,
          variants,
        });

        if (result.productVariantsBulkUpdate.userErrors?.length > 0) {
          const errorMessages = result.productVariantsBulkUpdate.userErrors.map((e: any) => e.message);
          // Check if throttled
          if (
            errorMessages.some(
              (msg: string) =>
                msg.toLowerCase().includes('throttle') ||
                msg.toLowerCase().includes('rate limit')
            )
          ) {
            attempt++;
            const backoffDelay = 1000 * Math.pow(2, attempt); // Exponential backoff
            console.warn(`[Rate Limit] Throttled, retrying in ${backoffDelay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(backoffDelay);
            continue;
          }
          errors.push(...errorMessages);
          break;
        } else {
          variantsUpdated += variants.length;
          success = true;
        }

        // Rate limit: wait 500ms between requests (2 req/sec) - except after last product
        if (idx < productEntries.length - 1) {
          await sleep(RATE_LIMIT_DELAY);
        }
      } catch (error: any) {
        // Check if throttled
        if (error.message?.toLowerCase().includes('throttle') || error.message?.toLowerCase().includes('rate limit')) {
          attempt++;
          const backoffDelay = 1000 * Math.pow(2, attempt);
          console.warn(`[Rate Limit] Throttled, retrying in ${backoffDelay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await sleep(backoffDelay);
          continue;
        }
        errors.push(`Failed to update product ${productId}: ${error.message || 'Unknown error'}`);
        break;
      }
    }

    if (!success && attempt >= MAX_RETRIES) {
      errors.push(`Failed to update product ${productId} after ${MAX_RETRIES} attempts`);
    }
  }

  // STEP 2: Update metafields second (source of truth - less critical than prices)
  // If this fails, log it but don't rollback prices (Shopify doesn't support transactions)
  if (metafieldUpdates.length > 0) {
    const setMetafieldsMutation = `
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }
    `;

    try {
      // Batch metafields (Shopify has limits, so do in chunks of 25)
      for (let i = 0; i < metafieldUpdates.length; i += 25) {
        const batch = metafieldUpdates.slice(i, i + 25);
        let attempt = 0;
        let success = false;

        while (attempt < MAX_RETRIES && !success) {
          try {
            const result = await fetchShopify(setMetafieldsMutation, {
              metafields: batch,
            });

            if (result.metafieldsSet.userErrors?.length > 0) {
              const errorMessages = result.metafieldsSet.userErrors.map((e: any) => e.message);
              // Check if throttled
              if (
                errorMessages.some(
                  (msg: string) =>
                    msg.toLowerCase().includes('throttle') ||
                    msg.toLowerCase().includes('rate limit')
                )
              ) {
                attempt++;
                const backoffDelay = 1000 * Math.pow(2, attempt);
                console.warn(`[Rate Limit] Metafield update throttled, retrying in ${backoffDelay}ms`);
                await sleep(backoffDelay);
                continue;
              }
              // Log metafield errors but don't fail the whole operation
              console.warn(`[Metafield Update] Errors for batch ${i}:`, errorMessages);
              warnings.push(`Metafield update errors: ${errorMessages.join(', ')}`);
              break;
            }
            success = true;

            // Rate limit: wait 500ms between batches
            if (i + 25 < metafieldUpdates.length) {
              await sleep(RATE_LIMIT_DELAY);
            }
          } catch (error: any) {
            if (error.message?.toLowerCase().includes('throttle') || error.message?.toLowerCase().includes('rate limit')) {
              attempt++;
              const backoffDelay = 1000 * Math.pow(2, attempt);
              console.warn(`[Rate Limit] Metafield update throttled, retrying in ${backoffDelay}ms`);
              await sleep(backoffDelay);
              continue;
            }
            // Log but don't fail - prices are more important than metafields
            console.warn(`[Metafield Update] Failed for batch ${i}:`, error.message);
            warnings.push(`Metafield update failed for batch ${i}: ${error.message}`);
            break;
          }
        }
      }
    } catch (error) {
      // Log but don't fail - prices are already updated
      console.warn(`[Metafield Update] Critical error:`, error);
      warnings.push(`Metafield update critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    success: errors.length === 0,
    variantsUpdated,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

