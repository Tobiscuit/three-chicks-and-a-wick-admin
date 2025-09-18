"use server";

import { fetchShopify } from '@/services/shopify';

export async function exposeDescriptionMetafieldToStorefront() {
    console.log('🔧 Creating metafield definition with PUBLIC_READ access...');
    
    const mutation = `
        mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
            metafieldDefinitionCreate(definition: $definition) {
                metafieldDefinition {
                    id
                    name
                    namespace
                    key
                    access {
                        storefront
                    }
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `;
    
    const variables = {
        definition: {
            namespace: "custom",
            key: "description",
            name: "Product Description",
            type: "multi_line_text_field",
            ownerType: "PRODUCT",
            access: {
                storefront: "PUBLIC_READ"
            }
        }
    };
    
    try {
        const result = await fetchShopify(mutation, variables);
        
        if (result.metafieldDefinitionCreate.userErrors?.length > 0) {
            const errors = result.metafieldDefinitionCreate.userErrors;
            console.error('❌ Errors:', errors);
            return { 
                success: false, 
                error: `Failed to create metafield definition: ${errors.map(e => e.message).join(', ')}` 
            };
        }
        
        if (result.metafieldDefinitionCreate.metafieldDefinition?.id) {
            console.log('✅ Success! Metafield definition created with PUBLIC_READ access');
            console.log('📋 Definition ID:', result.metafieldDefinitionCreate.metafieldDefinition.id);
            console.log('🎯 Storefront access:', result.metafieldDefinitionCreate.metafieldDefinition.access?.storefront);
            return { 
                success: true, 
                message: 'Metafield definition created with PUBLIC_READ access',
                definitionId: result.metafieldDefinitionCreate.metafieldDefinition.id
            };
        } else {
            return { 
                success: false, 
                error: 'No definition ID returned, but no errors either' 
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
