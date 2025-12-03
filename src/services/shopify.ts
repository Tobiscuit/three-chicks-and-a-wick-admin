'use server';

import { cache } from 'react';

import { ShopifyProduct } from "@/types/shopify";
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { encodeShopifyId } from '@/lib/utils';

export type { ShopifyProduct };

export type ShopifyOrder = {
  id: string;
  name: string;
  createdAt: string;
  processedAt: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  customer?: {
    firstName: string;
    lastName: string;
  };
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  lineItems: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        quantity: number;
        product?: {
          id: string;
          title: string;
        };
      };
    }>;
  };
};

type ShopifyGraphQLResponse<T> = {
  data: T;
  errors?: { message: string, field?: string[] }[];
};

export type ShopifyCollection = {
  id: string;
  title: string;
  handle: string;
}

import { SHOPIFY_CONFIG } from '@/lib/env-config';

const SHOPIFY_API_URL = `https://${SHOPIFY_CONFIG.STORE_URL}/admin/api/${SHOPIFY_CONFIG.API_VERSION}/graphql.json`;
const SHOPIFY_ADMIN_TOKEN = SHOPIFY_CONFIG.ADMIN_ACCESS_TOKEN;

// Debug logging for admin token
console.log('[Shopify] Admin token last 4 chars:', SHOPIFY_ADMIN_TOKEN?.slice(-4) || 'NOT SET');
console.log('[Shopify] Store URL:', SHOPIFY_CONFIG.STORE_URL);
console.log('[Shopify] API Version:', SHOPIFY_CONFIG.API_VERSION);
console.log('[Shopify] Full API URL:', SHOPIFY_API_URL);

export async function fetchShopify<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
  if (!SHOPIFY_API_URL || !SHOPIFY_ADMIN_TOKEN) {
    throw new Error('Shopify environment variables are not set.');
  }
  try {
    const response = await fetch(SHOPIFY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      next: {
        revalidate: 60, // Cache for 60 seconds
        tags: ['shopify-data'] // For on-demand revalidation if needed
      }
    });
    const result: ShopifyGraphQLResponse<T> = await response.json();
    if (result.errors) {
      console.error("[Shopify Service] GraphQL Errors:", JSON.stringify(result.errors, null, 2));
      throw new Error(`GraphQL Error: ${result.errors.map(e => e.message).join('\n')}`);
    }
    return result.data;
  } catch (error: any) {
    console.error("[Shopify Service] Unhandled fetch error:", error);
    throw error;
  }
}

const GET_PRODUCT_BY_ID_QUERY = `
  query getProductById($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      status
      productType
      tags
      totalInventory
      onlineStoreUrl
      description
      descriptionHtml
      customDescription: metafield(namespace: "custom", key: "description") {
        value
      }
      featuredImage {
        url(transform: {maxWidth: 1024, maxHeight: 1024})
      }
      images(first: 20) {
        edges {
          node {
            id
            url(transform: {maxWidth: 1024, maxHeight: 1024})
            altText
          }
        }
      }
      priceRange: priceRangeV2 {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 1) {
        edges {
          node {
            id
            sku
            inventoryItem {
              id
            }
          }
        }
      }
      collections(first: 10) {
        edges {
            node {
                id
                title
            }
        }
      }
    }
  }
`;

type GetProductByIdResponse = {
  product: {
    description: string;
    descriptionHtml: string;
    customDescription: { value: string } | null;
  } & Omit<ShopifyProduct, 'description'> | null;
};

const GET_PRODUCTS_QUERY = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          status
          productType
          tags
          totalInventory
          onlineStoreUrl
          description
          descriptionHtml
          customDescription: metafield(namespace: "custom", key: "description") {
            value
          }
          featuredImage {
            url(transform: {maxWidth: 1024, maxHeight: 1024})
          }
          images(first: 100) {
            edges {
              node {
                id
                url(transform: {maxWidth: 1024, maxHeight: 1024})
                altText
              }
            }
          }
          priceRange: priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                sku
                inventoryItem {
                  id
                }
              }
            }
          }
          collections(first: 10) {
            edges {
                node {
                    id
                    title
                }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

type GetProductsResponse = {
  products: {
    edges: Array<{
      node: {
        description: string;
        descriptionHtml: string;
        customDescription: { value: string } | null;
      } & Omit<ShopifyProduct, 'description'>;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
};

// Collection management functions
export async function collectionAddProducts(collectionId: string, productIds: string[]) {
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

export async function collectionRemoveProducts(collectionId: string, productIds: string[]) {
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

export const getOrders = cache(async (first: number = 50, after?: string): Promise<ShopifyOrder[]> => {
  const query = `
    query getOrders($first: Int!, $after: String) {
      orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            processedAt
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            customer {
              firstName
              lastName
            }
            displayFinancialStatus
            displayFulfillmentStatus
            lineItems(first: 10) {
              edges {
                node {
                  id
                  title
                  quantity
                  product {
                    id
                    title
                  }
                  variant {
                    title
                    sku
                  }
                  customAttributes {
                    key
                    value
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  try {
    const result = await fetchShopify<any>(query, { first, after });
    return result.orders.edges.map((edge: any) => edge.node);
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
});

export const getProducts = cache(async (first: number = 50, after?: string): Promise<ShopifyProduct[]> => {
  const response = await fetchShopify<GetProductsResponse>(GET_PRODUCTS_QUERY, { first, after });

  return response.products.edges.map(({ node }) => {
    const { description, descriptionHtml, customDescription, ...restOfProduct } = node;
    return {
      ...restOfProduct,
      description: description || descriptionHtml || customDescription?.value || "",
    };
  });
});

const GET_COLLECTIONS_QUERY = `
  query getCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

type GetCollectionsResponse = {
  collections: {
    edges: Array<{
      node: ShopifyCollection;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
};

export async function getCollections(first: number = 50, after?: string): Promise<ShopifyCollection[]> {
  const response = await fetchShopify<GetCollectionsResponse>(GET_COLLECTIONS_QUERY, { first, after });

  return response.collections.edges.map(({ node }) => node);
}

export async function getProductById(id: string): Promise<ShopifyProduct | null> {
  // Step 1: Fetch the main product data
  const response = await fetchShopify<GetProductByIdResponse>(GET_PRODUCT_BY_ID_QUERY, { id });
  if (!response.product) return null;

  // Load Shadow Description from Firestore (Authoritative Source)
  const { loadShadowDescription } = await import('@/services/product-shadow');
  const shadowDescription = await loadShadowDescription(id);

  const { description, descriptionHtml, customDescription, ...restOfProduct } = response.product;

  // Prioritization: Shadow > HTML > Custom Metafield > Plain Text
  const finalDescription = shadowDescription || descriptionHtml || customDescription?.value || description || "";

  let product: ShopifyProduct = {
    ...restOfProduct,
    description: finalDescription,
  };

  // Step 2: Perform a more precise, real-time inventory check
  const inventoryItemId = product.variants.edges[0]?.node.inventoryItem.id;
  if (inventoryItemId) {
    try {
      // This new query fetches the correct, stable InventoryLevel ID
      const inventoryLevelsQuery = `
                query getInventoryLevels($id: ID!) {
                    inventoryItem(id: $id) {
                        inventoryLevels(first: 5) {
      edges {
        node {
          id
                                    available
                                    location { id }
                                }
        }
      }
    }
  }
`;
      const inventoryLevelsResult = await fetchShopify<any>(inventoryLevelsQuery, { id: inventoryItemId });
      const locationId = await getPrimaryLocationId();

      // Find the specific inventory level for our primary location
      const primaryLocationLevel = inventoryLevelsResult.inventoryItem?.inventoryLevels.edges
        .find((edge: any) => edge.node.location.id === locationId)?.node;

      if (primaryLocationLevel) {
        product.totalInventory = primaryLocationLevel.available;
      }

    } catch (error) {
      console.warn("Could not fetch real-time inventory. Error:", error);
    }
  }

  return product;
}

export async function getPrimaryLocationId(): Promise<string | null> {
  const query = `
  query {
    locations(first: 1, query: "isPrimary:true") {
      edges {
          node { id }
      }
    }
  }
`;
  try {
    const response = await fetchShopify<any>(query);
    return response.locations.edges[0]?.node.id || null;
  } catch (error) {
    console.error("Failed to fetch primary location ID:", error);
    return null;
  }
}

type ProductData = {
  title: string;
  description: string;
  tags: string;
  price: string;
  sku: string;
  status: string;
  inventory: number; // Ensure this is part of the type
  imageUrls: string[];
  collections?: string[]; // Add collections support
};

// REPLACEMENT for getOnlineStorePublicationId
// This new version can find multiple channels by their names.
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
  const result = await fetchShopify<any>(query);
  const allPublications = result.publications.edges.map((e: any) => e.node);

  const publicationIds = allPublications
    .filter((p: { name: string }) => channelNames.includes(p.name))
    .map((p: { id: string }) => p.id);

  if (publicationIds.length === 0) {
    console.warn("Could not find any of the requested sales channels:", channelNames);
  }

  return publicationIds;
}

// REPLACEMENT for publishProductToChannel
// This new version publishes a product to all the channels we find.
async function publishProductToChannel(productId: string) {
  // Define all the channels you want to publish to here
  // TODO: Update channel name for production - currently using dev headless channel
  const channelsToPublish = ['Online Store', 'Threechicksandawick Dev Headless'];
  const publicationIds = await getPublicationIds(channelsToPublish);

  if (publicationIds.length === 0) {
    console.warn(`No valid publication channels found to publish product ${productId}`);
    console.warn(`⚠️  PRODUCTION WARNING: Channel names may need updating for production deployment`);
    console.warn(`Current channels searched:`, channelsToPublish);
    return; // Stop if no channels were found
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

  // The 'input' is now an array of all the channel IDs we want to publish to
  const result = await fetchShopify<any>(mutation, {
    id: productId,
    input: publicationIds.map(id => ({ publicationId: id }))
  });

  const userErrors = result.publishablePublish.userErrors;
  if (userErrors && userErrors.length > 0) {
    console.warn(`Failed to publish product ${productId}: ${JSON.stringify(userErrors)}`);
  } else {
    console.log(`✅ Successfully published product ${productId} to ${publicationIds.length} channel(s):`, channelsToPublish);
    console.log(`Published to publication IDs:`, publicationIds);
  }
}

export async function createProduct(productData: ProductData) {
  // 1. Create the product shell (title, tags, status)
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
    descriptionHtml: productData.description
  };
  const createProductResult = await fetchShopify<any>(createProductMutation, { input: productInput });
  const productId = createProductResult.productCreate.product?.id;
  if (!productId) throw new Error(`Product create failed: ${JSON.stringify(createProductResult.productCreate.userErrors)}`);

  // 2. Get the default variant and its inventoryItemId
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
  const getVariantResult = await fetchShopify<any>(getVariantQuery, { id: productId });
  const variantNode = getVariantResult.product.variants.edges[0]?.node;
  if (!variantNode) throw new Error("No default variant found");
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
  await fetchShopify<any>(updateVariantMutation, {
    productId,
    variants: [{ id: variantId, price: productData.price }]
  });

  // --- Step from Shopify Docs: Enable Inventory Tracking ---
  // 4. Update the inventory item to set the SKU and explicitly enable tracking.
  const updateInventoryItemMutation = `
    mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem { id sku tracked }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify<any>(updateInventoryItemMutation, {
    id: inventoryItemId,
    input: {
      sku: productData.sku,
      tracked: true // Explicitly enable tracking as required.
    }
  });

  // --- THIS IS THE NEW, CRUCIAL STEP ---
  // Step 5: Activate the inventory item at the primary location
  const locationId = await getPrimaryLocationId();
  if (!locationId) {
    throw new Error("Could not determine primary location to activate inventory.");
  }
  const inventoryActivateMutation = `
    mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!) {
      inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) {
        inventoryLevel { id }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify<any>(inventoryActivateMutation, { inventoryItemId, locationId });
  // --- END OF NEW STEP ---

  // Step 6: Set the absolute inventory quantity now that it's activated
  if (typeof productData.inventory === 'number') {
    await updateInventoryQuantity(inventoryItemId, productData.inventory, locationId);

    // Also write to Firestore for real-time updates
    const docId = encodeShopifyId(inventoryItemId);
    await adminDb.collection('inventoryStatus').doc(docId).set({
      quantity: productData.inventory,
      status: 'confirmed',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  // Step 7: Add product to selected collections
  if (productData.collections && productData.collections.length > 0) {
    for (const collectionId of productData.collections) {
      await collectionAddProducts(collectionId, [productId]);
    }
  }

  // Step 8: Attach images
  if (productData.imageUrls.length > 0) {
    const createMediaMutation = `
        mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
            productCreateMedia(productId: $productId, media: $media) {
                media { ... on MediaImage { id } }
                userErrors { field message }
            }
        }
    `;
    await fetchShopify<any>(createMediaMutation, {
      productId,
      media: productData.imageUrls.map(url => ({ originalSource: url, mediaContentType: 'IMAGE' }))
    });
  }

  // Step 9: Set the description via metafield for backward compatibility
  await updateProductDescription(productId, productData.description);

  // Step 10: Publish the product to the sales channel
  try {
    await publishProductToChannel(productId);
  } catch (error) {
    console.warn("Product was created but failed to publish to the Online Store channel.", error);
  }

  return { product: { id: productId } };
}

export async function updateProduct(productId: string, productInput: { title?: string, tags?: string, status?: string, descriptionHtml?: string }) {
  const updateProductMutation = `
        mutation productUpdate($input: ProductInput!) {
            productUpdate(input: $input) {
                product { id }
                userErrors { field message }
            }
        }
    `;
  const validProductInput = {
    id: productId,
    ...productInput
  };
  const result = await fetchShopify<any>(updateProductMutation, { input: validProductInput });
  const userErrors = result.productUpdate.userErrors;
  if (userErrors && userErrors.length > 0) {
    throw new Error(`Product update failed: ${userErrors.map((e: any) => e.message).join(', ')}`);
  }
  return result;
}

export async function updateProductDescription(productId: string, description: string) {
  // First, ensure the metafield definition exists with Storefront API access
  const createDefinitionMutation = `
        mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
            metafieldDefinitionCreate(definition: $definition) {
                createdDefinition {
                    id
                    name
                    namespace
                    key
                }
                userErrors {
                    field
                    message
                    code
                }
            }
        }
    `;

  try {
    // Create metafield definition with Storefront API access
    await fetchShopify<any>(createDefinitionMutation, {
      definition: {
        name: "Custom Description",
        namespace: "custom",
        key: "description",
        type: "multi_line_text_field",
        ownerType: "PRODUCT",
        access: {
          storefront: "PUBLIC_READ"
        }
      }
    });
    console.log('✅ Metafield definition created with Storefront API access');
  } catch (error) {
    // Definition might already exist, which is fine
    console.log('ℹ️ Metafield definition creation skipped (may already exist)');
  }

  // Then set the metafield value
  const setMetafieldMutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
            metafields { id }
            userErrors { field message }
        }
    }
  `;
  const result = await fetchShopify<any>(setMetafieldMutation, {
    metafields: [{
      ownerId: productId,
      namespace: "custom",
      key: "description",
      type: "multi_line_text_field",
      value: description
    }]
  });
  const userErrors = result.metafieldsSet.userErrors;
  if (userErrors && userErrors.length > 0) {
    console.warn(`Metafield update failed: ${JSON.stringify(userErrors)}`);
    throw new Error(`Description update failed: ${userErrors.map((e: any) => e.message).join(', ')}`);
  }
  console.log('✅ Product description saved to metafield with Storefront API access');
  return result;
}

export async function updateInventoryQuantity(inventoryItemId: string, quantity: number, locationId: string) {
  const mutation = `
        mutation InventorySetQuantities($input: InventorySetQuantitiesInput!) {
            inventorySetQuantities(input: $input) {
                inventoryAdjustmentGroup {
                    id
                    changes {
                        name
                        delta
                        quantityAfterChange
                    }
                    reason
                    referenceDocumentUri
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `;

  // --- ADD THIS LOG ---
  console.log(`[SERVICE] Sending to Shopify: Set inventory for item ${inventoryItemId} at location ${locationId} to quantity ${quantity}`);

  const variables = {
    input: {
      name: "available",
      reason: "correction",
      ignoreCompareQuantity: true,
      quantities: [
        {
          inventoryItemId,
          locationId,
          quantity,
        },
      ],
    },
  };
  const result = await fetchShopify<any>(mutation, variables);

  // Check for user errors
  if (result.inventorySetQuantities.userErrors && result.inventorySetQuantities.userErrors.length > 0) {
    const errors = result.inventorySetQuantities.userErrors.map((e: any) => e.message).join(', ');
    throw new Error(`Inventory update failed: ${errors}`);
  }
}

export async function productDeleteMedia(productId: string, mediaIds: string[]) {
  if (mediaIds.length === 0) return;
  const mutation = `
        mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
            productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
                deletedMediaIds
                userErrors { field message }
            }
        }
    `;
  await fetchShopify<any>(mutation, { productId, mediaIds });
}

export async function productReorderMedia(productId: string, moves: { id: string, newPosition: string }[]) {
  if (moves.length === 0) return;
  const mutation = `
        mutation productReorderMedia($productId: ID!, $moves: [MoveInput!]!) {
            productReorderMedia(id: $productId, moves: $moves) {
                job { id }
                userErrors { field message }
            }
    `;
  return await fetchShopify<any>(mutation, { productId, moves });
}

// Helper: Sleep utility
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function updateProductImages(productId: string, newImageUrls: string[]) {
  console.log(`[Shopify Service] Syncing images for product ${productId}`);

  try {
    // 1. Get current media
    let product = await getProductById(productId);
    if (!product) throw new Error("Product not found");

    // Map current images: URL -> ID
    // Note: We use the transformed URL from getProductById. 
    // We assume the frontend sends back the same URLs for existing images.
    let currentImages = product.images.edges.map((e: any) => ({
      id: e.node.id,
      url: e.node.url
    }));

    // 2. Identify images to delete
    // Delete any current image whose URL is NOT in the new list
    const imagesToDelete = currentImages.filter(img => !newImageUrls.includes(img.url));
    if (imagesToDelete.length > 0) {
      console.log(`[Shopify Service] Deleting ${imagesToDelete.length} images`);
      await productDeleteMedia(productId, imagesToDelete.map(img => img.id));
    }

    // 3. Identify images to add
    // Add any URL in the new list that is NOT in the current list
    const imagesToAdd = newImageUrls.filter(url => !currentImages.find(img => img.url === url));

    if (imagesToAdd.length > 0) {
      console.log(`[Shopify Service] Adding ${imagesToAdd.length} new images`);
      const createMediaMutation = `
                mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
                    productCreateMedia(productId: $productId, media: $media) {
                        media { 
                            ... on MediaImage { 
                                id 
                                image { url(transform: {maxWidth: 1024, maxHeight: 1024}) }
                            } 
                        }
                        userErrors { field message }
                    }
                }
            `;

      const result = await fetchShopify<any>(createMediaMutation, {
        productId,
        media: imagesToAdd.map(url => ({ originalSource: url, mediaContentType: 'IMAGE' }))
      });

      if (result.productCreateMedia.userErrors?.length > 0) {
        throw new Error(`Failed to add images: ${result.productCreateMedia.userErrors.map((e: any) => e.message).join(', ')}`);
      }

      // Wait for media to be processed
      console.log(`[Shopify Service] Waiting for media processing...`);
      await sleep(2000);

      // Re-fetch product to get new media IDs
      product = await getProductById(productId);
      if (!product) throw new Error("Product not found after update");

      currentImages = product.images.edges.map((e: any) => ({
        id: e.node.id,
        url: e.node.url
      }));
    }

    // 4. Reorder images
    // Construct moves using 1-based indexing
    const moves = newImageUrls.map((url, index) => {
      // Find the ID for this URL
      // We need to match loosely because Shopify might transform the URL slightly?
      // Actually, let's try exact match first.
      const media = currentImages.find(img => img.url === url);

      if (!media) {
        console.warn(`[Shopify Service] Could not find media ID for URL: ${url}`);
        return null;
      }

      return {
        id: media.id,
        newPosition: (index + 1).toString() // 1-indexed!
      };
    }).filter(m => m !== null) as { id: string, newPosition: string }[];

    if (moves.length > 1) {
      console.log(`[Shopify Service] Reordering ${moves.length} images`);
      console.log(`[Shopify Service] Moves:`, JSON.stringify(moves, null, 2));

      const reorderResult = await productReorderMedia(productId, moves);
      console.log(`[Shopify Service] Reorder result:`, JSON.stringify(reorderResult, null, 2));

      if (reorderResult.productReorderMedia?.userErrors?.length > 0) {
        console.error(`[Shopify Service] Reorder errors:`, reorderResult.productReorderMedia.userErrors);
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`[Shopify Service] Error syncing images:`, error);
    throw error;
  }
}

export async function deleteProduct(productId: string) {
  const mutation = `
  mutation productDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors { field message }
    }
  }
`;
  const result = await fetchShopify<any>(mutation, { input: { id: productId } });
  return result.productDelete;
}



export async function addTagsToOrder(orderId: string, tags: string[]) {
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

  return result.tagsAdd.node;
}

export async function removeTagsFromOrder(orderId: string, tags: string[]) {
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

  return result.tagsRemove.node;
}

// ADD THIS ENTIRE NEW FUNCTION
export async function listAllSalesChannels() {
  console.log(`--- DIAGNOSTIC --- Fetching all sales channels (Publications)...`);
  const query = `
    query GetPublications {
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
  try {
    const result = await fetchShopify<any>(query);
    const publications = result.publications.edges.map((e: any) => e.node);

    console.log('--- DIAGNOSTIC: SALES CHANNEL REPORT ---');
    if (publications.length === 0) {
      console.log('No sales channels found.');
    } else {
      console.log(JSON.stringify(publications, null, 2));
    }
    console.log('--- END SALES CHANNEL REPORT ---');

    return publications;
  } catch (error) {
    console.error("Error fetching sales channels:", error);
    return null;
  }
}

export async function getBusinessSnapshot() {
  try {
    // Get recent orders and products for business analysis
    const [orders, products] = await Promise.all([
      getOrders(10), // Get last 10 orders
      getProducts(20) // Get last 20 products
    ]);

    // Format data for AI to ensure clarity (Flatten structure, parse numbers)
    const formattedOrders = orders.map(order => ({
      id: order.id,
      name: order.name,
      created_at: order.createdAt,
      total_price: parseFloat(order.totalPriceSet?.shopMoney?.amount || "0"),
      currency: order.totalPriceSet?.shopMoney?.currencyCode,
      customer_name: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : "Guest",
      items: order.lineItems.edges.map(edge => ({
        title: edge.node.title,
        quantity: edge.node.quantity,
        price: "0.00" // Line item price not currently fetched, defaulting to avoid confusion
      }))
    }));

    return {
      orders: formattedOrders,
      products,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to get business snapshot:', error);
    throw new Error('Failed to retrieve business data');
  }
}

export async function getOrder(id: string) {
  const query = `
    query getOrder($id: ID!) {
      order(id: $id) {
        id
        name
        createdAt
        processedAt
        displayFulfillmentStatus
        note
        customer {
          firstName
          lastName
          email
        }
        shippingAddress {
          address1
          address2
          city
          province
          zip
          country
        }
        lineItems(first: 50) {
          edges {
            node {
              id
              title
              quantity
              variant {
                title
                sku
              }
              product {
                id
                title
                descriptionHtml
                tags
              }
              customAttributes {
                key
                value
              }
            }
          }
        }
      }
    }
  `;

  const result = await fetchShopify<any>(query, { id });
  return result.order;
}

export async function getOrderByNumber(orderNumber: string) {
  // Ensure order number has # prefix for the query
  const queryTerm = orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`;

  const query = `
    query getOrderByNumber($query: String!) {
      orders(first: 1, query: $query) {
        edges {
          node {
            id
            name
            createdAt
            processedAt
            displayFulfillmentStatus
            note
            customer {
              firstName
              lastName
              email
            }
            shippingAddress {
              address1
              address2
              city
              province
              zip
              country
            }
            lineItems(first: 50) {
              edges {
                node {
                  id
                  title
                  quantity
                  variant {
                    title
                    sku
                  }
                  product {
                    id
                    title
                    descriptionHtml
                    tags
                  }
                  customAttributes {
                    key
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

  const result = await fetchShopify<any>(query, { query: `name:${queryTerm}` });
  return result.orders.edges[0]?.node || null;
}