/**
 * Magic Request Products Seeding Script
 * 
 * This script seeds the Shopify store with 2 base products (vessels) and their variants
 * for the Magic Request custom candle builder.
 * 
 * Usage: node docs-internal/seed-magic-request-products.mjs
 * 
 * Prerequisites:
 * - Shopify Admin access token set in .env.local
 * - Store URL configured
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root (.env.vercel takes priority, fallback to .env.local)
config({ path: resolve(__dirname, '../.env.vercel') });
config({ path: resolve(__dirname, '../.env.local') });

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-07';

if (!SHOPIFY_STORE_URL || !SHOPIFY_ADMIN_TOKEN) {
  console.error('❌ Missing required environment variables');
  console.error('Required: SHOPIFY_STORE_URL, SHOPIFY_ADMIN_ACCESS_TOKEN');
  process.exit(1);
}

const SHOPIFY_API_URL = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

console.log('🌱 Magic Request Products Seeding Script');
console.log('Store:', SHOPIFY_STORE_URL);
console.log('API Version:', SHOPIFY_API_VERSION);
console.log('');

// Helper to call Shopify GraphQL API
async function fetchShopify(query, variables = {}) {
  const response = await fetch(SHOPIFY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  
  const result = await response.json();
  if (result.errors) {
    console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
    const errorMessages = Array.isArray(result.errors) 
      ? result.errors.map(e => typeof e === 'string' ? e : (e.message || JSON.stringify(e))).join('\n')
      : JSON.stringify(result.errors);
    throw new Error(`GraphQL Error: ${errorMessages}`);
  }
  return result.data;
}

// Helper to slugify a string for handles
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Get deployment version
const deploymentVersion = `v${new Date().toISOString().slice(0, 16).replace(/[-T:]/g, '')}`;

// Pricing configuration
const PRICING_CONFIG = {
  vessels: {
    'Mason Jar': { sizeOz: 16, baseCostCents: 799 },
    'Metal Tin': { sizeOz: 8, baseCostCents: 399 },
  },
  waxes: {
    'Soy': { pricePerOzCents: 18 },
    'Paraffin-Soy': { pricePerOzCents: 15 },
  },
  wicks: {
    'Cotton': { costCents: 45 },
    'Hemp': { costCents: 55 },
    'Wood': { costCents: 65 },
  },
  marginPct: 20,
  supplier: 'Default Supplier',
};

// Calculate price in cents, then format to "0.00" string
function calculatePrice(vesselName, waxName, wickName) {
  const vessel = PRICING_CONFIG.vessels[vesselName];
  const wax = PRICING_CONFIG.waxes[waxName];
  const wick = PRICING_CONFIG.wicks[wickName];
  
  if (!vessel || !wax || !wick) {
    throw new Error(`Missing pricing config for ${vesselName}/${waxName}/${wickName}`);
  }
  
  const baseCents = vessel.baseCostCents + wick.costCents + (wax.pricePerOzCents * vessel.sizeOz);
  const withMarginCents = Math.round(baseCents * (1 + PRICING_CONFIG.marginPct / 100));
  const dollars = (withMarginCents / 100).toFixed(2);
  return dollars;
}

// Get primary location ID
async function getPrimaryLocationId() {
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
  const result = await fetchShopify(query);
  return result.locations.edges[0]?.node.id || null;
}

// Get publication ID by name
async function getPublicationId(name) {
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
  const result = await fetchShopify(query);
  const publication = result.publications.edges.find(e => e.node.name === name);
  return publication?.node.id || null;
}

// Create or update a vessel product
async function upsertVesselProduct(vesselName) {
  const config = PRICING_CONFIG.vessels[vesselName];
  const handle = slugify(`${vesselName} ${config.sizeOz}oz`);
  const title = `${vesselName} ${config.sizeOz}oz`;
  
  console.log(`📦 Upserting vessel: ${title}`);
  
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
  const existing = await fetchShopify(checkQuery, { identifier: { handle } });
  
  let productId;
  
  if (existing.productByIdentifier) {
    productId = existing.productByIdentifier.id;
    console.log(`   Product exists: ${productId}`);
  } else {
    // Create product
    const createMutation = `
      mutation productCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product { id }
          userErrors { field message }
        }
      }
    `;
    const createResult = await fetchShopify(createMutation, {
      input: {
        title,
        handle,
        productType: 'Magic Request',
        tags: ['custom-candle', 'magic-request'],
        status: 'DRAFT',
        descriptionHtml: `<p>Custom ${title} vessel for Magic Request candles.</p>`,
      },
    });
    productId = createResult.productCreate.product.id;
    console.log(`   ✅ Created product: ${productId}`);
  }
  
  // 2. Set product metafields
  const setProductMetafieldsMutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify(setProductMetafieldsMutation, {
    metafields: [
      { ownerId: productId, namespace: 'magic_request', key: 'sizeOz', type: 'number_integer', value: String(config.sizeOz) },
      { ownerId: productId, namespace: 'magic_request', key: 'vesselBaseCostCents', type: 'number_integer', value: String(config.baseCostCents) },
      { ownerId: productId, namespace: 'magic_request', key: 'marginPct', type: 'number_decimal', value: String(PRICING_CONFIG.marginPct) },
      { ownerId: productId, namespace: 'magic_request', key: 'supplier', type: 'single_line_text_field', value: PRICING_CONFIG.supplier },
      { ownerId: productId, namespace: 'magic_request', key: 'deploymentVersion', type: 'single_line_text_field', value: deploymentVersion },
    ],
  });
  console.log('   ✅ Set product metafields');
  
  // 3. Ensure options are "Wax" and "Wick"
  const waxValues = Object.keys(PRICING_CONFIG.waxes);
  const wickValues = Object.keys(PRICING_CONFIG.wicks);
  
  if (!existing.productByIdentifier) {
    // New product: create options with variantStrategy: CREATE to auto-generate all variants
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
    console.log('   ✅ Created product options (Wax, Wick) with auto-generated variants');
  } else {
    // Existing product: verify options exist, or create them without variantStrategy
    const getOptionsQuery = `
      query ($id: ID!) {
        product(id: $id) {
          options(first: 10) {
            id
            name
            position
          }
        }
      }
    `;
    const currentOptionsData = await fetchShopify(getOptionsQuery, { id: productId });
    const currentOptions = currentOptionsData.product.options || [];
    const optionNames = new Set(currentOptions.map(o => o.name));
    
    if (currentOptions.length === 0 || !optionNames.has('Wax') || !optionNames.has('Wick')) {
      // Options missing or incorrect - create them (won't auto-create variants for existing products)
      const createOptionsMutation = `
        mutation productOptionsCreate($productId: ID!, $options: [OptionCreateInput!]!) {
          productOptionsCreate(productId: $productId, options: $options) {
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
      });
      console.log('   ✅ Created product options (Wax, Wick) - variants will be created in next step');
    } else {
      console.log('   ℹ️  Product options already exist');
    }
  }

  // 4. Get all variants created by productOptionsCreate and bulk update their prices/metafields
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
  let allVariants = variantsData.product.variants.edges.map(e => e.node);
  
  // Calculate expected variants (Cartesian: Wax × Wick)
  const expectedCombinations = [];
  for (const waxName of Object.keys(PRICING_CONFIG.waxes)) {
    for (const wickName of Object.keys(PRICING_CONFIG.wicks)) {
      expectedCombinations.push([waxName, wickName]);
    }
  }
  
  // Check which variants exist
  const existingCombinations = new Set(
    allVariants
      .filter(v => {
        const options = v.selectedOptions.reduce((acc, opt) => {
          acc[opt.name] = opt.value;
          return acc;
        }, {});
        return options['Wax'] && options['Wick'];
      })
      .map(v => {
        const options = v.selectedOptions.reduce((acc, opt) => {
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
    console.log(`   Creating ${missingCombinations.length} missing variants...`);
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
      price: calculatePrice(vesselName, wax, wick),
    }));
    
    const createResult = await fetchShopify(bulkCreateMutation, {
      productId,
      variants: variantsToCreate,
    });
    
    if (createResult.productVariantsBulkCreate.userErrors?.length > 0) {
      console.error('   ⚠️ Errors creating variants:', createResult.productVariantsBulkCreate.userErrors);
    } else {
      console.log(`   ✅ Created ${createResult.productVariantsBulkCreate.productVariants?.length || 0} variants`);
      
      // Re-fetch variants to get the newly created ones
      const updatedVariantsData = await fetchShopify(getVariantsQuery, { id: productId });
      allVariants = updatedVariantsData.product.variants.edges.map(e => e.node);
    }
  }
  
  console.log(`   Found ${allVariants.length} total variants, updating prices and metafields...`);
  
  // Calculate prices for each variant and bulk update
  const variantUpdates = [];
  const variantMetafields = [];
  
  for (const variant of allVariants) {
    const options = variant.selectedOptions.reduce((acc, opt) => {
      acc[opt.name] = opt.value;
      return acc;
    }, {});
    
    const waxName = options['Wax'];
    const wickName = options['Wick'];
    
    if (!waxName || !wickName) continue;
    
    const price = calculatePrice(vesselName, waxName, wickName);
    variantUpdates.push({
      id: variant.id,
      price,
    });
    
    variantMetafields.push({
      ownerId: variant.id,
      metafields: [
        { ownerId: variant.id, namespace: 'magic_request', key: 'waxPricePerOzCents', type: 'number_integer', value: String(PRICING_CONFIG.waxes[waxName].pricePerOzCents) },
        { ownerId: variant.id, namespace: 'magic_request', key: 'wickCostCents', type: 'number_integer', value: String(PRICING_CONFIG.wicks[wickName].costCents) },
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
    console.log(`   ✅ Updated ${variantUpdates.length} variant prices`);
  }
  
  // Bulk set metafields
  if (variantMetafields.length > 0) {
    const allMetafields = variantMetafields.flatMap(v => v.metafields);
    await fetchShopify(setProductMetafieldsMutation, {
      metafields: allMetafields,
    });
    console.log(`   ✅ Set metafields for ${variantMetafields.length} variants`);
  }
  
  // 5. Activate inventory for variants
  const locationId = await getPrimaryLocationId();
  if (locationId) {
    const getVariantsQuery = `
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
    const variantsData = await fetchShopify(getVariantsQuery, { id: productId });
    
    let activatedCount = 0;
    for (const variant of variantsData.product.variants.edges) {
      const inventoryItem = variant.node.inventoryItem;
      if (!inventoryItem?.id) {
        console.warn(`   ⚠️  Variant ${variant.node.id} has no inventoryItem, skipping`);
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
        if (updateResult.inventoryItemUpdate.userErrors?.length > 0) {
          console.error(`   ⚠️  Failed to enable tracking for ${inventoryItemId}:`, updateResult.inventoryItemUpdate.userErrors);
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
      if (activateResult.inventoryActivate.userErrors?.length > 0) {
        console.error(`   ⚠️  Failed to activate inventory for ${inventoryItemId}:`, activateResult.inventoryActivate.userErrors);
        continue;
      }
      
      // Set inventory quantity
      const inventoryQuantity = 999; // Adjustable: set to null/undefined to skip
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
        if (quantityResult.inventorySetQuantities.userErrors?.length > 0) {
          console.error(`   ⚠️  Failed to set quantity for ${inventoryItemId}:`, quantityResult.inventorySetQuantities.userErrors);
        } else {
          activatedCount++;
        }
      } else {
        activatedCount++;
      }
    }
    console.log(`   ✅ Activated inventory for ${activatedCount}/${variantsData.product.variants.edges.length} variants`);
  }
  
  // 6. Publish to Dev Headless channel only (not Online Store)
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
    console.log('   ✅ Published to Dev Headless channel');
  }
  
  // 7. Activate product
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
  console.log('   ✅ Activated product');
  
  console.log(`   ✨ Done: ${title}`);
  console.log('');
  
  return productId;
}

// Main seeding function
async function seedMagicRequestProducts() {
  try {
    console.log('🚀 Starting Magic Request products seeding...');
    console.log('');
    
    const productIds = [];
    
    // Seed both vessels
    for (const vesselName of ['Mason Jar', 'Metal Tin']) {
      const productId = await upsertVesselProduct(vesselName);
      productIds.push(productId);
    }
    
    console.log('🎉 Seeding complete!');
    console.log('');
    console.log('✅ Products created/updated:');
    productIds.forEach(id => console.log(`   - ${id}`));
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Vessels: 2 (Mason Jar 16oz, Metal Tin 8oz)`);
    console.log(`   - Wax types: ${Object.keys(PRICING_CONFIG.waxes).length} (${Object.keys(PRICING_CONFIG.waxes).join(', ')})`);
    console.log(`   - Wick types: ${Object.keys(PRICING_CONFIG.wicks).length} (${Object.keys(PRICING_CONFIG.wicks).join(', ')})`);
    console.log(`   - Total variants: ${Object.keys(PRICING_CONFIG.waxes).length * Object.keys(PRICING_CONFIG.wicks).length * 2} (6 per vessel)`);
    console.log(`   - Deployment version: ${deploymentVersion}`);
    console.log('');
    console.log('🔍 Next steps:');
    console.log('   1. Verify products in Shopify Admin');
    console.log('   2. Test Magic Request form on custom storefront');
    console.log('   3. Verify variant resolution and pricing');
    console.log('');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the script
seedMagicRequestProducts();

