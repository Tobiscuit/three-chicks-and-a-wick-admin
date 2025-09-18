"use server";

import { fetchShopify } from '@/services/shopify';

export async function exposeDescriptionMetafieldToStorefront() {
    console.log('🔧 Creating metafield definition with PUBLIC_READ access...');
    
    const mutation = `
        mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
            metafieldDefinitionCreate(definition: $definition) {
                createdDefinition {
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
        console.log('📤 Sending mutation:', JSON.stringify({ mutation, variables }, null, 2));
        const result = await fetchShopify(mutation, variables);
        console.log('📥 Full response:', JSON.stringify(result, null, 2));
        
        if (result.metafieldDefinitionCreate.userErrors?.length > 0) {
            const errors = result.metafieldDefinitionCreate.userErrors;
            console.error('❌ User Errors:', errors);
            const errorMsg = `Failed to create metafield definition: ${errors.map(e => e.message).join(', ')}`;
            console.error('❌ Error Message:', errorMsg);
            return { 
                success: false, 
                error: errorMsg
            };
        }
        
        if (result.metafieldDefinitionCreate.createdDefinition?.id) {
            console.log('✅ Success! Metafield definition created with PUBLIC_READ access');
            console.log('📋 Definition ID:', result.metafieldDefinitionCreate.createdDefinition.id);
            console.log('🎯 Storefront access:', result.metafieldDefinitionCreate.createdDefinition.access?.storefront);
            return { 
                success: true, 
                message: 'Metafield definition created with PUBLIC_READ access',
                definitionId: result.metafieldDefinitionCreate.createdDefinition.id
            };
        } else {
            const errorMsg = 'No definition ID returned, but no errors either';
            console.error('❌ Unexpected response structure:', errorMsg);
            console.error('❌ Full result structure:', JSON.stringify(result, null, 2));
            return { 
                success: false, 
                error: errorMsg
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
