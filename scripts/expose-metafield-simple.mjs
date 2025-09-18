/**
 * Simple script to expose custom.description metafield to Storefront API
 * Run this once to make the metafield visible to your storefront
 */

// You can run this in the browser console on your admin panel
// or copy this mutation to GraphiQL

const mutation = `
mutation {
  metafieldStorefrontVisibilityCreate(
    input: {
      namespace: "custom"
      key: "description"
      ownerType: PRODUCT
    }
  ) {
    metafieldStorefrontVisibility {
      id
    }
    userErrors {
      field
      message
    }
  }
}
`;

console.log('🔧 Copy this mutation to GraphiQL or run in browser console:');
console.log(mutation);
console.log('');
console.log('📋 Or use the Shopify Admin GraphQL API directly:');
console.log('https://your-shop.myshopify.com/admin/api/2025-07/graphql.json');
console.log('');
console.log('✅ After running this, your storefront will be able to access:');
console.log('   product.metafields.custom.description.value');
