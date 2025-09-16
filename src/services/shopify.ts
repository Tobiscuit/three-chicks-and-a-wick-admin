'use server';

import { ShopifyProduct } from "@/types/shopify";

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

const SHOPIFY_API_URL = process.env.SHOPIFY_STORE_URL!;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;

export async function fetchShopify<T>(query: string, variables?: Record<string, any>): Promise<T> {
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
      cache: 'no-store',
      next: { revalidate: 0 }
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
      description: metafield(namespace: "custom", key: "description") {
        value
      }
      featuredImage {
        url(transform: {maxWidth: 1024, maxHeight: 1024})
      }
      images(first: 10) {
        edges {
          node {
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
        description: { value: string } | null;
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
          description: metafield(namespace: "custom", key: "description") {
            value
          }
          featuredImage {
            url(transform: {maxWidth: 1024, maxHeight: 1024})
          }
          images(first: 10) {
            edges {
              node {
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
                description: { value: string } | null;
            } & Omit<ShopifyProduct, 'description'>;
        }>;
        pageInfo: {
            hasNextPage: boolean;
            endCursor: string;
        };
    };
};

export async function getOrders(first: number = 50, after?: string): Promise<ShopifyOrder[]> {
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
}

export async function getProducts(first: number = 50, after?: string): Promise<ShopifyProduct[]> {
    const response = await fetchShopify<GetProductsResponse>(GET_PRODUCTS_QUERY, { first, after });
    
    return response.products.edges.map(({ node }) => {
        const { description: descriptionMetafield, ...restOfProduct } = node;
        return {
            ...restOfProduct,
            description: descriptionMetafield?.value || "",
        };
    });
}

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

    const { description: descriptionMetafield, ...restOfProduct } = response.product;
    let product: ShopifyProduct = {
        ...restOfProduct,
        description: descriptionMetafield?.value || "",
    };
    
    // Step 2: Perform a more precise, real-time inventory check
    const inventoryItemId = product.variants.edges[0]?.node.inventoryItem.id;
    if (inventoryItemId) {
        try {
            const locationId = await getPrimaryLocationId();
            if (locationId) {
                const inventoryQuery = `
                    query getInventoryLevel($id: ID!) {
                        inventoryLevel(id: $id) {
                            available
                        }
                    }
                `;
                // Construct the complex InventoryLevel GID that Shopify needs
                const inventoryLevelId = `gid://shopify/InventoryLevel/${inventoryItemId.split('/').pop()}?location=${locationId.split('/').pop()}`;
                
                const inventoryResult = await fetchShopify<any>(inventoryQuery, { id: inventoryLevelId });
                
                if (typeof inventoryResult.inventoryLevel?.available === 'number') {
                    // Overwrite the incorrect totalInventory with the real-time value
                    product.totalInventory = inventoryResult.inventoryLevel.available;
                }
            }
        } catch (error) {
            console.warn("Could not fetch real-time inventory, falling back to totalInventory. Error:", error);
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
  const channelsToPublish = ['Online Store', 'Threechicksandawick Headless'];
  const publicationIds = await getPublicationIds(channelsToPublish);

  if (publicationIds.length === 0) {
      console.warn(`No valid publication channels found to publish product ${productId}`);
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
      console.log(`Successfully published product ${productId} to ${publicationIds.length} channel(s).`);
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
    status: productData.status
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
  }
  
  // Step 7: Attach images
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

  // Step 8: Set the description via metafield
  await updateProductDescription(productId, productData.description);
  
  // Step 9: Publish the product to the sales channel
  try {
    await publishProductToChannel(productId);
  } catch (error) {
    console.warn("Product was created but failed to publish to the Online Store channel.", error);
  }

  return { product: { id: productId } };
}

export async function updateProduct(productId: string, productInput: { title?: string, tags?: string, status?: string }) {
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
        throw new Error(`Product update failed: ${userErrors.map((e:any) => e.message).join(', ')}`);
    }
    return result;
}

export async function updateProductDescription(productId: string, description: string) {
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
        throw new Error(`Description update failed: ${userErrors.map((e:any) => e.message).join(', ')}`);
    }
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
    
    // Log successful update
    if (result.inventorySetQuantities.inventoryAdjustmentGroup) {
        console.log(`[SERVICE] Inventory successfully updated. Adjustment ID: ${result.inventorySetQuantities.inventoryAdjustmentGroup.id}`);
        console.log(`[SERVICE] New quantity: ${result.inventorySetQuantities.inventoryAdjustmentGroup.changes[0]?.quantityAfterChange}`);
    }
    
    return result;
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