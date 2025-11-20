/**
 * Setup Magic Request Metafields Script
 * 
 * Creates metafield definitions and populates them on existing Magic Request products.
 * This allows the Ingredients tab to query metafields instead of parsing variant options.
 * 
 * Usage: node docs-internal/setup-magic-request-metafields.mjs
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
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

console.log('🔧 Setting up Magic Request Metafields');
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

/**
 * Create metafield definitions (one-time setup)
 */
async function createMetafieldDefinitions() {
  console.log('📋 Step 1: Creating metafield definitions...\n');
  
  const createDefinitionMutation = `
    mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          id
          name
          namespace
          key
          type {
            name
          }
          access {
            storefront
          }
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `;
  
  const definitions = [
    // Ingredient metafields (for Ingredients tab)
    {
      name: 'Magic Request Wax Types',
      namespace: 'magic_request',
      key: 'waxTypes',
      type: 'list.single_line_text_field',
      ownerType: 'PRODUCT',
      access: { storefront: 'NONE' }
    },
    {
      name: 'Magic Request Wick Types',
      namespace: 'magic_request',
      key: 'wickTypes',
      type: 'list.single_line_text_field',
      ownerType: 'PRODUCT',
      access: { storefront: 'NONE' }
    },
    {
      name: 'Magic Request Container Type',
      namespace: 'magic_request',
      key: 'containerType',
      type: 'single_line_text_field',
      ownerType: 'PRODUCT',
      access: { storefront: 'NONE' }
    },
    // Pricing metafields (for Pricing Manager)
    {
      name: 'Magic Request Size Ounces',
      namespace: 'magic_request',
      key: 'sizeOz',
      type: 'number_integer',
      ownerType: 'PRODUCT',
      access: { storefront: 'NONE' }
    },
    {
      name: 'Magic Request Vessel Base Cost Cents',
      namespace: 'magic_request',
      key: 'vesselBaseCostCents',
      type: 'number_integer',
      ownerType: 'PRODUCT',
      access: { storefront: 'NONE' }
    },
    {
      name: 'Magic Request Margin Percentage',
      namespace: 'magic_request',
      key: 'marginPct',
      type: 'number_decimal',
      ownerType: 'PRODUCT',
      access: { storefront: 'NONE' }
    },
    {
      name: 'Magic Request Wax Price Per Ounce Cents',
      namespace: 'magic_request',
      key: 'waxPricePerOzCents',
      type: 'number_integer',
      ownerType: 'PRODUCTVARIANT',
      access: { storefront: 'NONE' }
    },
    {
      name: 'Magic Request Wick Cost Cents',
      namespace: 'magic_request',
      key: 'wickCostCents',
      type: 'number_integer',
      ownerType: 'PRODUCTVARIANT',
      access: { storefront: 'NONE' }
    },
    {
      name: 'Magic Request Enabled',
      namespace: 'magic_request',
      key: 'enabled',
      type: 'number_integer',
      ownerType: 'PRODUCTVARIANT',
      access: { storefront: 'NONE' }
    },
    {
      name: 'Magic Request Supplier',
      namespace: 'magic_request',
      key: 'supplier',
      type: 'single_line_text_field',
      ownerType: 'PRODUCT',
      access: { storefront: 'NONE' }
    },
    {
      name: 'Magic Request Deployment Version',
      namespace: 'magic_request',
      key: 'deploymentVersion',
      type: 'single_line_text_field',
      ownerType: 'PRODUCT',
      access: { storefront: 'NONE' }
    }
  ];
  
  for (const def of definitions) {
    try {
      const result = await fetchShopify(createDefinitionMutation, { definition: def });
      
      if (result.metafieldDefinitionCreate.userErrors?.length > 0) {
        const errors = result.metafieldDefinitionCreate.userErrors;
        // Check if it's already defined (that's okay)
        if (errors.some(e => e.code === 'TAKEN' || e.message?.includes('already'))) {
          console.log(`  ✓ ${def.namespace}.${def.key} - already exists (skipping)`);
        } else {
          console.error(`  ❌ ${def.namespace}.${def.key} - Error:`, errors);
        }
      } else {
        console.log(`  ✅ Created ${def.namespace}.${def.key}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to create ${def.namespace}.${def.key}:`, error.message);
    }
  }
  
  console.log('');
}

/**
 * Fetch all Magic Request products with variants
 */
async function getMagicRequestProducts() {
  const query = `
    query {
      products(first: 50, query: "product_type:Magic Request") {
        edges {
          node {
            id
            title
            handle
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
  
  const result = await fetchShopify(query);
  return result.products.edges.map(e => e.node);
}

/**
 * Extract unique wax and wick types from product variants
 */
function extractOptionsFromProduct(product) {
  const waxTypes = new Set();
  const wickTypes = new Set();
  
  product.variants.edges.forEach(edge => {
    edge.node.selectedOptions.forEach(opt => {
      if (opt.name === 'Wax') {
        waxTypes.add(opt.value);
      } else if (opt.name === 'Wick') {
        wickTypes.add(opt.value);
      }
    });
  });
  
  return {
    waxTypes: Array.from(waxTypes).sort(),
    wickTypes: Array.from(wickTypes).sort(),
    containerType: product.title // e.g., "Mason Jar 16oz"
  };
}

/**
 * Populate metafields on products
 */
async function populateMetafields() {
  console.log('📦 Step 2: Fetching Magic Request products...\n');
  
  const products = await getMagicRequestProducts();
  
  if (products.length === 0) {
    console.log('⚠️  No Magic Request products found. Create products first using the seed script.');
    return;
  }
  
  console.log(`Found ${products.length} product(s):\n`);
  
  const setMetafieldsMutation = `
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  
  // Query to get existing metafields for migration
  const getMetafieldsQuery = `
    query GetProductMetafields($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          title
          mrSizeOz: metafield(namespace: "mr", key: "sizeOz") { value }
          mrVesselBaseCostCents: metafield(namespace: "mr", key: "vesselBaseCostCents") { value }
          mrMarginPct: metafield(namespace: "mr", key: "marginPct") { value }
          mrSupplier: metafield(namespace: "mr", key: "supplier") { value }
          mrDeploymentVersion: metafield(namespace: "mr", key: "deploymentVersion") { value }
          variants(first: 100) {
            edges {
              node {
                id
                mrWaxPricePerOzCents: metafield(namespace: "mr", key: "waxPricePerOzCents") { value }
                mrWickCostCents: metafield(namespace: "mr", key: "wickCostCents") { value }
                mrEnabled: metafield(namespace: "mr", key: "enabled") { value }
              }
            }
          }
        }
      }
    }
  `;
  
  // Get product IDs
  const productIds = products.map(p => p.id);
  let existingMetafields = null;
  
  try {
    const metafieldsResult = await fetchShopify(getMetafieldsQuery, { ids: productIds });
    existingMetafields = metafieldsResult.nodes || [];
  } catch (error) {
    console.log(`  ℹ️  Could not fetch existing metafields for migration (this is okay if products are new)`);
  }
  
  for (const product of products) {
    const { waxTypes, wickTypes, containerType } = extractOptionsFromProduct(product);
    
    console.log(`  📦 ${product.title}:`);
    console.log(`     Wax Types: ${waxTypes.join(', ')}`);
    console.log(`     Wick Types: ${wickTypes.join(', ')}`);
    console.log(`     Container: ${containerType}`);
    
    // Format list metafields: ["value1", "value2"] as JSON string
    const waxTypesJson = JSON.stringify(waxTypes);
    const wickTypesJson = JSON.stringify(wickTypes);
    
    const metafieldsToSet = [
      {
        ownerId: product.id,
        namespace: 'magic_request',
        key: 'waxTypes',
        type: 'list.single_line_text_field',
        value: waxTypesJson
      },
      {
        ownerId: product.id,
        namespace: 'magic_request',
        key: 'wickTypes',
        type: 'list.single_line_text_field',
        value: wickTypesJson
      },
      {
        ownerId: product.id,
        namespace: 'magic_request',
        key: 'containerType',
        type: 'single_line_text_field',
        value: containerType
      }
    ];
    
    // Migrate pricing metafields from mr.* to magic_request.* if they exist
    if (existingMetafields) {
      const productData = existingMetafields.find((n) => n?.id === product.id);
      if (productData) {
        // Migrate product-level pricing metafields
        if (productData.mrSizeOz?.value) {
          metafieldsToSet.push({
            ownerId: product.id,
            namespace: 'magic_request',
            key: 'sizeOz',
            type: 'number_integer',
            value: productData.mrSizeOz.value
          });
        }
        if (productData.mrVesselBaseCostCents?.value) {
          metafieldsToSet.push({
            ownerId: product.id,
            namespace: 'magic_request',
            key: 'vesselBaseCostCents',
            type: 'number_integer',
            value: productData.mrVesselBaseCostCents.value
          });
        }
        if (productData.mrMarginPct?.value) {
          metafieldsToSet.push({
            ownerId: product.id,
            namespace: 'magic_request',
            key: 'marginPct',
            type: 'number_decimal',
            value: productData.mrMarginPct.value
          });
        }
        if (productData.mrSupplier?.value) {
          metafieldsToSet.push({
            ownerId: product.id,
            namespace: 'magic_request',
            key: 'supplier',
            type: 'single_line_text_field',
            value: productData.mrSupplier.value
          });
        }
        if (productData.mrDeploymentVersion?.value) {
          metafieldsToSet.push({
            ownerId: product.id,
            namespace: 'magic_request',
            key: 'deploymentVersion',
            type: 'single_line_text_field',
            value: productData.mrDeploymentVersion.value
          });
        }
        
        // Migrate variant-level pricing metafields
        if (productData.variants) {
          for (const variantEdge of productData.variants.edges) {
            const variant = variantEdge.node;
            if (variant.mrWaxPricePerOzCents?.value) {
              metafieldsToSet.push({
                ownerId: variant.id,
                namespace: 'magic_request',
                key: 'waxPricePerOzCents',
                type: 'number_integer',
                value: variant.mrWaxPricePerOzCents.value
              });
            }
            if (variant.mrWickCostCents?.value) {
              metafieldsToSet.push({
                ownerId: variant.id,
                namespace: 'magic_request',
                key: 'wickCostCents',
                type: 'number_integer',
                value: variant.mrWickCostCents.value
              });
            }
            if (variant.mrEnabled?.value) {
              metafieldsToSet.push({
                ownerId: variant.id,
                namespace: 'magic_request',
                key: 'enabled',
                type: 'number_integer',
                value: variant.mrEnabled.value
              });
            }
          }
        }
      }
    }
    
    try {
      // Set metafields in batches of 25
      for (let i = 0; i < metafieldsToSet.length; i += 25) {
        const batch = metafieldsToSet.slice(i, i + 25);
        const result = await fetchShopify(setMetafieldsMutation, {
          metafields: batch
        });
        
        if (result.metafieldsSet.userErrors?.length > 0) {
          console.error(`     ❌ Errors (batch ${i / 25 + 1}):`, result.metafieldsSet.userErrors);
        } else {
          console.log(`     ✅ Set ${batch.length} metafield(s) (batch ${i / 25 + 1})`);
        }
      }
      console.log(`     ✅ All metafields set successfully`);
    } catch (error) {
      console.error(`     ❌ Failed:`, error.message);
    }
    
    console.log('');
  }
  
  console.log('✅ Metafield population complete!\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    await createMetafieldDefinitions();
    await populateMetafields();
    
    console.log('🎉 Setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update ContainerSizeManager to query these metafields');
    console.log('2. Update deployment service to set these metafields on new products');
    console.log('3. Test the Ingredients tab to see options from Shopify');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

