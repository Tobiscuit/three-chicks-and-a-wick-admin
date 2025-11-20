/**
 * Test Price Update Script
 * 
 * This script tests updating Magic Request variant prices in Shopify.
 * It fetches current prices, calculates new prices based on the pricing config,
 * and updates them using the bulk update mutation.
 * 
 * Usage: node docs-internal/test-price-update.mjs
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

console.log('🧪 Testing Price Update');
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

// Pricing configuration (matches seed script)
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
};

// Calculate price: (vesselBaseCost + wickCost + waxPricePerOz × sizeOz) × (1 + margin%)
function calculatePrice(vesselName, waxName, wickName) {
  const vessel = PRICING_CONFIG.vessels[vesselName];
  const wax = PRICING_CONFIG.waxes[waxName];
  const wick = PRICING_CONFIG.wicks[wickName];
  
  if (!vessel || !wax || !wick) {
    throw new Error(`Missing pricing config for ${vesselName}/${waxName}/${wickName}`);
  }
  
  const baseCents = vessel.baseCostCents + wick.costCents + (wax.pricePerOzCents * vessel.sizeOz);
  const withMarginCents = Math.round(baseCents * (1 + PRICING_CONFIG.marginPct / 100));
  return (withMarginCents / 100).toFixed(2);
}

// Get all Magic Request products and variants
const GET_PRODUCTS_QUERY = `
  query GetMagicRequestProducts {
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
                title
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
    }
  }
`;

// Bulk update variant prices
const UPDATE_VARIANTS_MUTATION = `
  mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      product {
        id
        title
      }
      productVariants {
        id
        title
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function testPriceUpdate() {
  try {
    console.log('📦 Fetching current products and prices...\n');
    
    // 1. Fetch all Magic Request products
    const data = await fetchShopify(GET_PRODUCTS_QUERY);
    const products = data.products.edges.map(e => e.node);
    
    if (products.length === 0) {
      console.log('⚠️  No Magic Request products found. Run the seed script first.');
      return;
    }
    
    console.log(`Found ${products.length} product(s):\n`);
    
    // 2. Calculate new prices for each variant
    const updatesByProduct = {};
    let totalVariants = 0;
    let priceChanges = 0;
    
    for (const product of products) {
      // Extract vessel name and size from product title
      // Format: "Mason Jar 16oz" or "Metal Tin 8oz"
      const titleMatch = product.title.match(/^(.+?)\s+(\d+)oz$/i);
      if (!titleMatch) {
        console.log(`⚠️  Skipping product "${product.title}" - couldn't parse vessel name`);
        continue;
      }
      
      const vesselName = titleMatch[1].trim();
      const variants = product.variants.edges.map(e => e.node);
      
      console.log(`\n📦 ${product.title} (${variants.length} variants):`);
      
      if (!updatesByProduct[product.id]) {
        updatesByProduct[product.id] = [];
      }
      
      for (const variant of variants) {
        // Extract Wax and Wick from selectedOptions
        const options = {};
        variant.selectedOptions.forEach(opt => {
          options[opt.name] = opt.value;
        });
        
        const wax = options['Wax'];
        const wick = options['Wick'];
        
        if (!wax || !wick) {
          console.log(`  ⚠️  Variant "${variant.title}" missing Wax or Wick option`);
          continue;
        }
        
        // Calculate new price
        const newPrice = calculatePrice(vesselName, wax, wick);
        const oldPrice = parseFloat(variant.price);
        const newPriceFloat = parseFloat(newPrice);
        
        const changed = Math.abs(oldPrice - newPriceFloat) > 0.01; // Account for floating point
        
        if (changed) {
          priceChanges++;
          console.log(`  💰 ${variant.title}:`);
          console.log(`     Old: $${oldPrice.toFixed(2)} → New: $${newPrice} ${changed ? '🔄' : ''}`);
        } else {
          console.log(`  ✓ ${variant.title}: $${oldPrice.toFixed(2)} (no change)`);
        }
        
        updatesByProduct[product.id].push({
          id: variant.id,
          price: newPrice,
        });
        
        totalVariants++;
      }
    }
    
    console.log(`\n\n📊 Summary:`);
    console.log(`   Products: ${products.length}`);
    console.log(`   Total Variants: ${totalVariants}`);
    console.log(`   Price Changes: ${priceChanges}`);
    
    if (priceChanges === 0) {
      console.log('\n✅ All prices are already up to date!');
      return;
    }
    
    // 3. Ask for confirmation (in a real script, you'd use readline)
    console.log(`\n⚠️  About to update ${priceChanges} variant price(s) across ${Object.keys(updatesByProduct).length} product(s)`);
    console.log('   (In production, you would confirm here)\n');
    
    // 4. Update prices
    console.log('🔄 Updating prices...\n');
    
    const results = [];
    for (const [productId, variants] of Object.entries(updatesByProduct)) {
      const product = products.find(p => p.id === productId);
      console.log(`Updating ${product.title}...`);
      
      const result = await fetchShopify(UPDATE_VARIANTS_MUTATION, {
        productId,
        variants: variants.map(v => ({
          id: v.id,
          price: v.price,
        })),
      });
      
      if (result.productVariantsBulkUpdate.userErrors?.length > 0) {
        console.error('❌ Errors:', result.productVariantsBulkUpdate.userErrors);
        throw new Error(result.productVariantsBulkUpdate.userErrors.map(e => e.message).join(', '));
      }
      
      results.push(result.productVariantsBulkUpdate);
      console.log(`  ✅ Updated ${variants.length} variant(s)`);
    }
    
    console.log(`\n✅ Successfully updated ${priceChanges} variant price(s)!`);
    console.log(`   API Calls: ${results.length}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the test
testPriceUpdate();

