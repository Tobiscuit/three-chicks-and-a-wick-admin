/**
 * Check if Magic Request metafields exist on products
 * 
 * Usage: node scripts/check-metafields.mjs
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
  process.exit(1);
}

const SHOPIFY_API_URL = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

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
    throw new Error('GraphQL Error');
  }
  
  return result.data;
}

console.log('🔍 Checking Magic Request Metafields\n');

const query = `
  query CheckMetafields {
    products(first: 10, query: "product_type:Magic Request") {
      edges {
        node {
          id
          title
          handle
          magicRequestSizeOz: metafield(namespace: "magic_request", key: "sizeOz") {
            value
          }
          magicRequestVesselBaseCostCents: metafield(namespace: "magic_request", key: "vesselBaseCostCents") {
            value
          }
          magicRequestMarginPct: metafield(namespace: "magic_request", key: "marginPct") {
            value
          }
          magicRequestSupplier: metafield(namespace: "magic_request", key: "supplier") {
            value
          }
          magicRequestDeploymentVersion: metafield(namespace: "magic_request", key: "deploymentVersion") {
            value
          }
          magicRequestWaxTypes: metafield(namespace: "magic_request", key: "waxTypes") {
            value
          }
          magicRequestWickTypes: metafield(namespace: "magic_request", key: "wickTypes") {
            value
          }
          magicRequestContainerType: metafield(namespace: "magic_request", key: "containerType") {
            value
          }
          # Check legacy mr.* namespace
          mrSizeOz: metafield(namespace: "mr", key: "sizeOz") {
            value
          }
          mrVesselBaseCostCents: metafield(namespace: "mr", key: "vesselBaseCostCents") {
            value
          }
          mrMarginPct: metafield(namespace: "mr", key: "marginPct") {
            value
          }
          variants(first: 5) {
            edges {
              node {
                id
                title
                price
                magicRequestWaxPricePerOzCents: metafield(namespace: "magic_request", key: "waxPricePerOzCents") {
                  value
                }
                magicRequestWickCostCents: metafield(namespace: "magic_request", key: "wickCostCents") {
                  value
                }
                magicRequestEnabled: metafield(namespace: "magic_request", key: "enabled") {
                  value
                }
                mrWaxPricePerOzCents: metafield(namespace: "mr", key: "waxPricePerOzCents") {
                  value
                }
                mrWickCostCents: metafield(namespace: "mr", key: "wickCostCents") {
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

try {
  const data = await fetchShopify(query);
  const products = data.products.edges.map(e => e.node);
  
  console.log(`Found ${products.length} product(s):\n`);
  
  for (const product of products) {
    console.log(`📦 ${product.title} (${product.handle})`);
    console.log('   Product Metafields:');
    console.log(`     magic_request.sizeOz: ${product.magicRequestSizeOz?.value || '❌ MISSING'}`);
    console.log(`     magic_request.vesselBaseCostCents: ${product.magicRequestVesselBaseCostCents?.value || '❌ MISSING'}`);
    console.log(`     magic_request.marginPct: ${product.magicRequestMarginPct?.value || '❌ MISSING'}`);
    console.log(`     magic_request.supplier: ${product.magicRequestSupplier?.value || '❌ MISSING'}`);
    console.log(`     magic_request.deploymentVersion: ${product.magicRequestDeploymentVersion?.value || '❌ MISSING'}`);
    console.log(`     magic_request.waxTypes: ${product.magicRequestWaxTypes?.value || '❌ MISSING'}`);
    console.log(`     magic_request.wickTypes: ${product.magicRequestWickTypes?.value || '❌ MISSING'}`);
    console.log(`     magic_request.containerType: ${product.magicRequestContainerType?.value || '❌ MISSING'}`);
    
    // Check legacy namespace
    if (product.mrSizeOz?.value || product.mrVesselBaseCostCents?.value || product.mrMarginPct?.value) {
      console.log('   ⚠️  Legacy mr.* metafields found:');
      if (product.mrSizeOz?.value) console.log(`     mr.sizeOz: ${product.mrSizeOz.value} (needs migration)`);
      if (product.mrVesselBaseCostCents?.value) console.log(`     mr.vesselBaseCostCents: ${product.mrVesselBaseCostCents.value} (needs migration)`);
      if (product.mrMarginPct?.value) console.log(`     mr.marginPct: ${product.mrMarginPct.value} (needs migration)`);
    }
    
    console.log('   Variants:');
    for (const variantEdge of product.variants.edges) {
      const variant = variantEdge.node;
      const options = variant.selectedOptions.map(o => `${o.name}=${o.value}`).join(', ');
      console.log(`     ${variant.title} (${options})`);
      console.log(`       Price: $${variant.price}`);
      console.log(`       magic_request.waxPricePerOzCents: ${variant.magicRequestWaxPricePerOzCents?.value || '❌ MISSING'}`);
      console.log(`       magic_request.wickCostCents: ${variant.magicRequestWickCostCents?.value || '❌ MISSING'}`);
      console.log(`       magic_request.enabled: ${variant.magicRequestEnabled?.value || '❌ MISSING'}`);
      
      if (variant.mrWaxPricePerOzCents?.value || variant.mrWickCostCents?.value) {
        console.log(`       ⚠️  Legacy mr.* found (needs migration)`);
      }
    }
    console.log('');
  }
  
  // Check if legacy mr.* metafields exist
  console.log('\n🔍 Checking for legacy mr.* metafields...\n');
  
  const legacyQuery = `
    query CheckLegacyMetafields {
      products(first: 10, query: "product_type:Magic Request") {
        edges {
          node {
            id
            title
            mrSizeOz: metafield(namespace: "mr", key: "sizeOz") { value }
            mrVesselBaseCostCents: metafield(namespace: "mr", key: "vesselBaseCostCents") { value }
            mrMarginPct: metafield(namespace: "mr", key: "marginPct") { value }
            mrSupplier: metafield(namespace: "mr", key: "supplier") { value }
            mrDeploymentVersion: metafield(namespace: "mr", key: "deploymentVersion") { value }
            variants(first: 5) {
              edges {
                node {
                  id
                  title
                  mrWaxPricePerOzCents: metafield(namespace: "mr", key: "waxPricePerOzCents") { value }
                  mrWickCostCents: metafield(namespace: "mr", key: "wickCostCents") { value }
                  mrEnabled: metafield(namespace: "mr", key: "enabled") { value }
                }
              }
            }
          }
        }
      }
    }
  `;
  
  const legacyData = await fetchShopify(legacyQuery);
  const legacyProducts = legacyData.products.edges.map(e => e.node);
  
  let hasLegacyData = false;
  for (const product of legacyProducts) {
    const hasProductLegacy = product.mrSizeOz?.value || product.mrVesselBaseCostCents?.value || product.mrMarginPct?.value;
    const hasVariantLegacy = product.variants.edges.some((e) => 
      e.node.mrWaxPricePerOzCents?.value || e.node.mrWickCostCents?.value || e.node.mrEnabled?.value
    );
    
    if (hasProductLegacy || hasVariantLegacy) {
      hasLegacyData = true;
      console.log(`📦 ${product.title}:`);
      if (product.mrSizeOz?.value) console.log(`   ⚠️  mr.sizeOz: ${product.mrSizeOz.value} (needs migration)`);
      if (product.mrVesselBaseCostCents?.value) console.log(`   ⚠️  mr.vesselBaseCostCents: ${product.mrVesselBaseCostCents.value} (needs migration)`);
      if (product.mrMarginPct?.value) console.log(`   ⚠️  mr.marginPct: ${product.mrMarginPct.value} (needs migration)`);
      
      for (const variantEdge of product.variants.edges) {
        const variant = variantEdge.node;
        if (variant.mrWaxPricePerOzCents?.value || variant.mrWickCostCents?.value || variant.mrEnabled?.value) {
          console.log(`   ⚠️  Variant ${variant.title}:`);
          if (variant.mrWaxPricePerOzCents?.value) console.log(`      mr.waxPricePerOzCents: ${variant.mrWaxPricePerOzCents.value}`);
          if (variant.mrWickCostCents?.value) console.log(`      mr.wickCostCents: ${variant.mrWickCostCents.value}`);
          if (variant.mrEnabled?.value) console.log(`      mr.enabled: ${variant.mrEnabled.value}`);
        }
      }
    }
  }
  
  if (!hasLegacyData) {
    console.log('✅ No legacy mr.* metafields found - products need to be deployed/redeployed');
    console.log('\n💡 Solution: Run the Admin Panel "Deploy to Shopify" feature to populate metafields');
  }
  
  console.log('\n✅ Check complete!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

