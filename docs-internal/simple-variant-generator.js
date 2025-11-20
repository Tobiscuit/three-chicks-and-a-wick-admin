/**
 * Simple Cartesian Product Variant Generator
 * 
 * Generates all possible product variants for the custom candle business
 * using Cartesian Product combinatorics.
 * 
 * Math: |wax| × |wicks| × |containers| = total variants
 * 3 × 3 × 2 = 18 variants
 */

// Product attribute sets
const WAX_TYPES = ['Soy', 'Beeswax', 'Coconut Soy'];
const WICK_TYPES = ['Cotton', 'Hemp', 'Wood'];
const CONTAINER_SIZES = [
  { name: 'Mason Jar 16oz', size: 16, cost: 0.96 },
  { name: 'Metal Tin 8oz', size: 8, cost: 1.80 }
];

// Pricing data (per ounce for wax, fixed for wicks)
const WAX_COSTS = {
  'Soy': 1.5,
  'Beeswax': 2.5,
  'Coconut Soy': 2.0
};

const WICK_COSTS = {
  'Cotton': 0.0,
  'Hemp': 0.5,
  'Wood': 2.0
};

/**
 * Generate all possible variants using Cartesian Product
 * Time Complexity: O(n × m × p)
 * Space Complexity: O(n × m × p)
 */
function generateAllVariants() {
  const variants = [];
  
  console.log('🧮 Generating variants using Cartesian Product...');
  console.log(`Input sets: ${WAX_TYPES.length} wax × ${WICK_TYPES.length} wicks × ${CONTAINER_SIZES.length} containers`);
  
  for (const wax of WAX_TYPES) {
    for (const wick of WICK_TYPES) {
      for (const container of CONTAINER_SIZES) {
        const variant = createVariant(wax, wick, container);
        variants.push(variant);
      }
    }
  }
  
  console.log(`✅ Generated ${variants.length} variants`);
  return variants;
}

/**
 * Create a single variant with calculated pricing
 */
function createVariant(wax, wick, container) {
  const title = `${wax} Candle - ${wick} Wick - ${container.name}`;
  const sku = generateSKU(wax, wick, container.name);
  const price = calculatePrice(wax, wick, container);
  
  return {
    title,
    sku,
    price,
    attributes: {
      wax,
      wick,
      container: container.name,
      size: container.size
    }
  };
}

/**
 * Generate unique SKU for variant
 */
function generateSKU(wax, wick, container) {
  const waxCode = wax.replace(/\s+/g, '').substring(0, 3).toUpperCase();
  const wickCode = wick.substring(0, 3).toUpperCase();
  const containerCode = container.replace(/\s+/g, '').substring(0, 6).toUpperCase();
  
  return `${waxCode}-${wickCode}-${containerCode}`;
}

/**
 * Calculate price using business formula:
 * finalPrice = (waxPricePerOz × sizeInOz) + wickPrice + containerPrice
 */
function calculatePrice(wax, wick, container) {
  const waxPrice = WAX_COSTS[wax] * container.size;
  const wickPrice = WICK_COSTS[wick];
  const containerPrice = container.cost;
  
  const price = Math.round((waxPrice + wickPrice + containerPrice) * 100) / 100;
  return parseFloat(price.toFixed(2));
}

/**
 * Main execution function
 */
function main() {
  console.log('🎯 Starting Cartesian Product Variant Generation...\n');
  
  try {
    // Step 1: Generate all variants
    const variants = generateAllVariants();
    
    // Step 2: Display generated variants
    console.log('\n📋 Generated Variants:');
    console.log('='.repeat(80));
    variants.forEach((variant, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${variant.title}`);
      console.log(`    SKU: ${variant.sku} | Price: $${variant.price.toFixed(2)}`);
      console.log(`    Attributes: ${variant.attributes.wax} + ${variant.attributes.wick} + ${variant.attributes.container} (${variant.attributes.size}oz)`);
      console.log('');
    });
    
    console.log('\n🎉 Variant generation complete!');
    console.log(`📈 Total variants created: ${variants.length}`);
    console.log('💡 This demonstrates Cartesian Product combinatorics in e-commerce!');
    console.log('\n🚀 Next step: Push these variants to Shopify via API');
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
