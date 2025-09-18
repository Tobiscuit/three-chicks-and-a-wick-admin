#!/usr/bin/env node

/**
 * Script to expose the custom.description metafield to the Storefront API
 * This only needs to be run once per metafield definition
 */

const { fetchShopify } = require('../src/services/shopify');

async function exposeMetafieldToStorefront() {
    console.log('🔧 Exposing custom.description metafield to Storefront API...');
    
    const mutation = `
        mutation metafieldStorefrontVisibilityCreate($input: MetafieldStorefrontVisibilityInput!) {
            metafieldStorefrontVisibilityCreate(input: $input) {
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
    
    const variables = {
        input: {
            namespace: "custom",
            key: "description", 
            ownerType: "PRODUCT"
        }
    };
    
    try {
        const result = await fetchShopify(mutation, variables);
        
        if (result.metafieldStorefrontVisibilityCreate.userErrors?.length > 0) {
            console.error('❌ Errors:', result.metafieldStorefrontVisibilityCreate.userErrors);
            return;
        }
        
        if (result.metafieldStorefrontVisibilityCreate.metafieldStorefrontVisibility?.id) {
            console.log('✅ Success! Metafield exposed to Storefront API');
            console.log('📋 Visibility ID:', result.metafieldStorefrontVisibilityCreate.metafieldStorefrontVisibility.id);
            console.log('🎯 Storefront can now access: custom.description');
        } else {
            console.log('⚠️  No visibility ID returned, but no errors either');
        }
        
    } catch (error) {
        console.error('❌ Failed to expose metafield:', error);
    }
}

// Run the script
exposeMetafieldToStorefront()
    .then(() => {
        console.log('🏁 Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
