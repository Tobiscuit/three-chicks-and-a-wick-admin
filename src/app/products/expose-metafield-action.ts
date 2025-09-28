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
        console.log('📤 Sending metafieldDefinitionCreate mutation with variables:', JSON.stringify(variables, null, 2));
        const result = await fetchShopify(mutation, variables) as any;
        console.log('📥 Response structure:', {
            hasUserErrors: !!result.metafieldDefinitionCreate?.userErrors,
            userErrorCount: result.metafieldDefinitionCreate?.userErrors?.length || 0,
            hasCreatedDefinition: !!result.metafieldDefinitionCreate?.createdDefinition,
            definitionId: result.metafieldDefinitionCreate?.createdDefinition?.id || 'none'
        });
        
        if (result.metafieldDefinitionCreate.userErrors?.length > 0) {
            const errors = result.metafieldDefinitionCreate.userErrors;
            console.error('❌ User Errors:', errors);
            const errorMsg = `Failed to create metafield definition: ${errors.map((e: any) => e.message).join(', ')}`;
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
            console.error('❌ Available fields in result:', Object.keys(result.metafieldDefinitionCreate || {}));
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
