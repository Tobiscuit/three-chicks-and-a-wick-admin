"use server";

import { fetchShopify } from '@/services/shopify';

export async function exposeDescriptionMetafieldToStorefront() {
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
            const errors = result.metafieldStorefrontVisibilityCreate.userErrors;
            console.error('❌ Errors:', errors);
            return { 
                success: false, 
                error: `Failed to expose metafield: ${errors.map(e => e.message).join(', ')}` 
            };
        }
        
        if (result.metafieldStorefrontVisibilityCreate.metafieldStorefrontVisibility?.id) {
            console.log('✅ Success! Metafield exposed to Storefront API');
            console.log('📋 Visibility ID:', result.metafieldStorefrontVisibilityCreate.metafieldStorefrontVisibility.id);
            return { 
                success: true, 
                message: 'Metafield successfully exposed to Storefront API',
                visibilityId: result.metafieldStorefrontVisibilityCreate.metafieldStorefrontVisibility.id
            };
        } else {
            return { 
                success: false, 
                error: 'No visibility ID returned, but no errors either' 
            };
        }
        
    } catch (error) {
        console.error('❌ Failed to expose metafield:', error);
        return { 
            success: false, 
            error: `Failed to expose metafield: ${error}` 
        };
    }
}
