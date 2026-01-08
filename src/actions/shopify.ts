'use server';

/**
 * Shopify Server Actions - Mutations Layer
 * 
 * Following Next.js 16 pattern: 'use server' inside each function body
 * This separation is required for Turbopack compatibility.
 * 
 * These functions handle data mutations (create, update, delete).
 * For data fetching, use @/lib/shopify-client instead.
 */

import { fetchShopify, getPrimaryLocationId } from '@/lib/shopify-client';
import { revalidateTag } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { encodeShopifyId } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type ProductData = {
  title: string;
  description: string;
  tags: string;
  price: string;
  sku: string;
  status: string;
  inventory: number;
  imageUrls: string[];
  collections?: string[];
  metafields?: { namespace: string; key: string; value: string; type: string }[];
};

// ============================================================================
// Internal Helpers (not server actions)
// ============================================================================

async function getPublicationIds(channelNames: string[]): Promise<string[]> {
  const query = `
    query getPublications {
      publications(first: 25) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  `;
  const result = await fetchShopify<{ publications: { edges: Array<{ node: { id: string; name: string } }> } }>(query);
  const allPublications = result.publications.edges.map((e) => e.node);

  return allPublications
    .filter((p) => channelNames.includes(p.name))
    .map((p) => p.id);
}

async function publishProductToChannel(productId: string) {
  const channelsToPublish = ['Online Store', 'Threechicksandawick Dev Headless'];
  const publicationIds = await getPublicationIds(channelsToPublish);

  if (publicationIds.length === 0) {
    console.warn(`No valid publication channels found to publish product ${productId}`);
    return;
  }

  const mutation = `
    mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        publishable {
          ... on Product {
            id
            status
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  await fetchShopify(mutation, {
    id: productId,
    input: publicationIds.map((id) => ({ publicationId: id })),
  });
}

async function updateInventoryQuantity(inventoryItemId: string, quantity: number, locationId: string) {
  const mutation = `
    mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
      inventorySetOnHandQuantities(input: $input) {
        inventoryAdjustmentGroup { id }
        userErrors { field message }
      }
    }
  `;

  await fetchShopify(mutation, {
    input: {
      reason: 'correction',
      setQuantities: [
        {
          inventoryItemId,
          locationId,
          quantity,
        },
      ],
    },
  });
}

async function collectionAddProducts(collectionId: string, productIds: string[]) {
  const mutation = `
    mutation collectionAddProducts($id: ID!, $productIds: [ID!]!) {
      collectionAddProducts(id: $id, productIds: $productIds) {
        collection { id }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify(mutation, { id: collectionId, productIds });
}

async function collectionRemoveProducts(collectionId: string, productIds: string[]) {
  const mutation = `
    mutation collectionRemoveProducts($id: ID!, $productIds: [ID!]!) {
      collectionRemoveProducts(id: $id, productIds: $productIds) {
        collection { id }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify(mutation, { id: collectionId, productIds });
}

// ============================================================================
// Server Actions (with 'use server' inside each function)
// ============================================================================

/**
 * Create a new product in Shopify
 */
export async function createProductAction(productData: ProductData) {
  'use server';

  // 1. Create the product shell
  const createProductMutation = `
    mutation productCreate($input: ProductInput!) {
      productCreate(input: $input) {
        product { id }
        userErrors { field message }
      }
    }
  `;

  const productInput = {
    title: productData.title,
    tags: productData.tags,
    status: productData.status,
    descriptionHtml: productData.description,
    metafields: productData.metafields,
  };

  const createProductResult = await fetchShopify<{
    productCreate: {
      product: { id: string } | null;
      userErrors: Array<{ field: string; message: string }>;
    };
  }>(createProductMutation, { input: productInput });

  const productId = createProductResult.productCreate.product?.id;
  if (!productId) {
    throw new Error(`Product create failed: ${JSON.stringify(createProductResult.productCreate.userErrors)}`);
  }

  // 2. Get the default variant
  const getVariantQuery = `
    query getProductVariant($id: ID!) {
      product(id: $id) {
        variants(first: 1) {
          edges {
            node {
              id
              inventoryItem { id }
            }
          }
        }
      }
    }
  `;

  const getVariantResult = await fetchShopify<{
    product: { variants: { edges: Array<{ node: { id: string; inventoryItem: { id: string } } }> } };
  }>(getVariantQuery, { id: productId });

  const variantNode = getVariantResult.product.variants.edges[0]?.node;
  if (!variantNode) throw new Error('No default variant found');

  const { id: variantId, inventoryItem: { id: inventoryItemId } } = variantNode;

  // 3. Update the variant's price
  const updateVariantMutation = `
    mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id }
        userErrors { field message }
      }
    }
  `;

  await fetchShopify(updateVariantMutation, {
    productId,
    variants: [{ id: variantId, price: productData.price }],
  });

  // 4. Enable inventory tracking
  const updateInventoryItemMutation = `
    mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem { id sku tracked }
        userErrors { field message }
      }
    }
  `;

  await fetchShopify(updateInventoryItemMutation, {
    id: inventoryItemId,
    input: {
      sku: productData.sku,
      tracked: true,
    },
  });

  // 5. Activate inventory at primary location
  const locationId = await getPrimaryLocationId();
  if (!locationId) {
    throw new Error('Could not determine primary location to activate inventory.');
  }

  const inventoryActivateMutation = `
    mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!) {
      inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) {
        inventoryLevel { id }
        userErrors { field message }
      }
    }
  `;

  await fetchShopify(inventoryActivateMutation, { inventoryItemId, locationId });

  // 6. Set inventory quantity
  if (typeof productData.inventory === 'number') {
    await updateInventoryQuantity(inventoryItemId, productData.inventory, locationId);

    const docId = encodeShopifyId(inventoryItemId);
    await adminDb.collection('inventoryStatus').doc(docId).set(
      {
        quantity: productData.inventory,
        status: 'confirmed',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  // 7. Add product to collections
  if (productData.collections && productData.collections.length > 0) {
    for (const collectionId of productData.collections) {
      await collectionAddProducts(collectionId, [productId]);
    }
  }

  // 8. Attach images
  if (productData.imageUrls.length > 0) {
    const createMediaMutation = `
      mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media { ... on MediaImage { id } }
          userErrors { field message }
        }
      }
    `;

    await fetchShopify(createMediaMutation, {
      productId,
      media: productData.imageUrls.map((url) => ({
        originalSource: url,
        mediaContentType: 'IMAGE',
      })),
    });
  }

  // 9. Publish to sales channels
  await publishProductToChannel(productId);

  // Revalidate cache
  revalidateTag('shopify-data');

  return { success: true, productId };
}

/**
 * Delete a product from Shopify
 */
export async function deleteProductAction(productId: string) {
  'use server';

  const mutation = `
    mutation productDelete($input: ProductDeleteInput!) {
      productDelete(input: $input) {
        deletedProductId
        userErrors { field message }
      }
    }
  `;

  const result = await fetchShopify<{
    productDelete: {
      deletedProductId: string | null;
      userErrors: Array<{ field: string; message: string }>;
    };
  }>(mutation, { input: { id: productId } });

  if (result.productDelete.userErrors.length > 0) {
    throw new Error(`Delete failed: ${JSON.stringify(result.productDelete.userErrors)}`);
  }

  revalidateTag('shopify-data');

  return { success: true, deletedProductId: result.productDelete.deletedProductId };
}

/**
 * Fulfill an order (mark as shipped)
 */
export async function fulfillOrderAction(orderId: string) {
  'use server';

  // Get fulfillment order info
  const getOrderQuery = `
    query getOrderFulfillmentInfo($id: ID!) {
      order(id: $id) {
        id
        name
        fulfillmentOrders(first: 5) {
          edges {
            node {
              id
              status
              lineItems(first: 50) {
                edges {
                  node {
                    id
                    remainingQuantity
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const orderResponse = await fetchShopify<{
    order: {
      id: string;
      name: string;
      fulfillmentOrders: {
        edges: Array<{
          node: {
            id: string;
            status: string;
            lineItems: {
              edges: Array<{ node: { id: string; remainingQuantity: number } }>;
            };
          };
        }>;
      };
    } | null;
  }>(getOrderQuery, { id: orderId });

  if (!orderResponse.order) {
    throw new Error('Order not found');
  }

  const openFulfillmentOrders = orderResponse.order.fulfillmentOrders.edges
    .filter((edge) => edge.node.status === 'OPEN' || edge.node.status === 'IN_PROGRESS')
    .map((edge) => edge.node);

  if (openFulfillmentOrders.length === 0) {
    throw new Error('No open fulfillment orders found. Order may already be fulfilled.');
  }

  const results = [];

  for (const fulfillmentOrder of openFulfillmentOrders) {
    const lineItemsToFulfill = fulfillmentOrder.lineItems.edges
      .filter((edge) => edge.node.remainingQuantity > 0)
      .map((edge) => ({
        fulfillmentOrderLineItemId: edge.node.id,
        quantity: edge.node.remainingQuantity,
      }));

    if (lineItemsToFulfill.length === 0) continue;

    const fulfillMutation = `
      mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
        fulfillmentCreateV2(fulfillment: $fulfillment) {
          fulfillment {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const fulfillResponse = await fetchShopify<{
      fulfillmentCreateV2: {
        fulfillment: { id: string; status: string } | null;
        userErrors: Array<{ field: string[]; message: string }>;
      };
    }>(fulfillMutation, {
      fulfillment: {
        lineItemsByFulfillmentOrder: [
          {
            fulfillmentOrderId: fulfillmentOrder.id,
            fulfillmentOrderLineItems: lineItemsToFulfill,
          },
        ],
        notifyCustomer: true,
      },
    });

    if (fulfillResponse.fulfillmentCreateV2.userErrors.length > 0) {
      throw new Error(fulfillResponse.fulfillmentCreateV2.userErrors.map((e) => e.message).join(', '));
    }

    results.push(fulfillResponse.fulfillmentCreateV2.fulfillment);
  }

  revalidateTag('shopify-data');

  return {
    success: true,
    orderName: orderResponse.order.name,
    fulfillments: results,
  };
}

/**
 * Add products to a collection
 */
export async function addToCollectionAction(collectionId: string, productIds: string[]) {
  'use server';

  await collectionAddProducts(collectionId, productIds);
  revalidateTag('shopify-data');

  return { success: true };
}

/**
 * Remove products from a collection
 */
export async function removeFromCollectionAction(collectionId: string, productIds: string[]) {
  'use server';

  await collectionRemoveProducts(collectionId, productIds);
  revalidateTag('shopify-data');

  return { success: true };
}

/**
 * Update inventory quantity for a product
 */
export async function updateInventoryAction(inventoryItemId: string, quantity: number) {
  'use server';

  const locationId = await getPrimaryLocationId();
  if (!locationId) {
    throw new Error('Could not determine primary location');
  }

  await updateInventoryQuantity(inventoryItemId, quantity, locationId);

  // Update Firestore for real-time sync
  const docId = encodeShopifyId(inventoryItemId);
  await adminDb.collection('inventoryStatus').doc(docId).set(
    {
      quantity,
      status: 'confirmed',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  revalidateTag('shopify-data');

  return { success: true };
}

export async function addTagsToOrderAction(orderId: string, tags: string[]) {
  'use server';
  console.log('Adding tags to order:', orderId, tags);
  
  const mutation = `
    mutation tagsAdd($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        node {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const result = await fetchShopify<any>(mutation, { id: orderId, tags });

  if (result.tagsAdd.userErrors && result.tagsAdd.userErrors.length > 0) {
    throw new Error(`Failed to add tags: ${result.tagsAdd.userErrors.map((e: any) => e.message).join(', ')}`);
  }

  // Revalidate orders
  revalidateTag('shopify-data');
  
  return result.tagsAdd.node;
}

export async function removeTagsFromOrderAction(orderId: string, tags: string[]) {
  'use server';
  console.log('Removing tags from order:', orderId, tags);
  
  const mutation = `
    mutation tagsRemove($id: ID!, $tags: [String!]!) {
      tagsRemove(id: $id, tags: $tags) {
        node {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const result = await fetchShopify<any>(mutation, { id: orderId, tags });

  if (result.tagsRemove.userErrors && result.tagsRemove.userErrors.length > 0) {
    throw new Error(`Failed to remove tags: ${result.tagsRemove.userErrors.map((e: any) => e.message).join(', ')}`);
  }

  // Revalidate orders
  revalidateTag('shopify-data');

  return result.tagsRemove.node;
}
