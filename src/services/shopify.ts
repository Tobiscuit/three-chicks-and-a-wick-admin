
'use server';

import { ShopifyProduct } from "@/types/shopify";

// A service for interacting with the Shopify Admin GraphQL API.
// Note: This service is intended for server-side use only.
// Do not expose your Shopify Admin Access Token to the client.

type ShopifyGraphQLResponse<T> = {
  data: T;
  errors?: { message: string, field?: string[] }[];
};

export type ShopifyCollection = {
    id: string;
    title: string;
    handle: string;
}

export type ShopifyOrder = {
    id: string;
    name: string;
    processedAt: string;
    totalPriceSet: {
        shopMoney: {
            amount: string;
            currencyCode: string;
        }
    };
    lineItems: {
        edges: {
            node: {
                title: string;
                quantity: number;
                product: {
                    id: string | null;
                } | null;
            }
        }[]
    }
}

const SHOPIFY_API_URL = process.env.SHOPIFY_STORE_URL!;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;

export async function fetchShopify<T>(query: string, variables?: Record<string, any>): Promise<T> {
  
  if (!SHOPIFY_API_URL || !SHOPIFY_ADMIN_TOKEN) {
    throw new Error('Shopify environment variables are not set.');
  }

  // Log the query and variables for debugging
  console.log("--- Shopify API Call ---");
  console.log("Endpoint:", SHOPIFY_API_URL);
  console.log("Query:", query.trim().replace(/\s+/g, ' '));
  if (variables) {
    console.log("Variables:", JSON.stringify(variables, null, 2));
  }
  console.log("------------------------");


  try {
    const response = await fetch(SHOPIFY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store', // Disables caching for this fetch request
      next: { revalidate: 0 } // Forces revalidation every time
    });

    const rawResponseText = await response.text();

    const result: ShopifyGraphQLResponse<T> = JSON.parse(rawResponseText);


    if (!response.ok) {
        let errorMessage = `Shopify API request failed with status ${response.status}: ${response.statusText}`;
        if (result.errors) {
            errorMessage += `\nGraphQL Errors: ${result.errors.map(e => e.message).join('\n')}`;
        }
        throw new Error(errorMessage);
    }
    
    if (result.errors) {
        // Log the full error for server-side debugging
        console.error("[Shopify Service] GraphQL Errors:", JSON.stringify(result.errors, null, 2));
        throw new Error(`GraphQL Error: ${result.errors.map(e => e.message).join('\n')}`);
    }
    
    return result.data;

  } catch (error: any) {
    console.error("[Shopify Service] Unhandled fetch error:", error);
    throw error;
  }
}

const GET_PRODUCTS_QUERY = `
  query getProducts($first: Int!) {
    products(first: $first, sortKey: TITLE, reverse: false) {
      edges {
        node {
          id
          title
          handle
          status
          totalInventory
          tags
          featuredImage {
            url(transform: {maxWidth: 512, maxHeight: 512})
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
                inventoryItem { id }
              }
            }
          }
        }
      }
    }
  }
`;

type GetProductsResponse = {
  products: {
    edges: {
      node: ShopifyProduct;
    }[];
  };
};

export async function getProducts(count: number = 25): Promise<ShopifyProduct[]> {
  const response = await fetchShopify<GetProductsResponse>(GET_PRODUCTS_QUERY, { first: count });
  const products = response.products.edges.map(edge => edge.node);
  return products;
}

const GET_PRODUCT_BY_ID_QUERY = `
  query getProductById($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      status
      description
      productType
      tags
      totalInventory
      onlineStoreUrl
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
    product: ShopifyProduct | null;
};

export async function getProductById(id: string): Promise<ShopifyProduct | null> {
    const response = await fetchShopify<GetProductByIdResponse>(GET_PRODUCT_BY_ID_QUERY, { id });
    return response.product;
}


const GET_COLLECTIONS_QUERY = `
  query getCollections($first: Int!) {
    collections(first: $first, sortKey: TITLE) {
      edges {
        node {
          id
          title
          handle
        }
      }
    }
  }
`;

type GetCollectionsResponse = {
    collections: {
        edges: {
            node: ShopifyCollection;
        }[];
    };
};

export async function getCollections(count: number = 50): Promise<ShopifyCollection[]> {
    const response = await fetchShopify<GetCollectionsResponse>(GET_COLLECTIONS_QUERY, { first: count });
    return response.collections.edges.map(edge => edge.node);
}

const GET_PRIMARY_LOCATION_ID_QUERY = `
  query {
    locations(first: 1, query: "isPrimary:true") {
      edges {
        node {
          id
        }
      }
    }
  }
`;

type GetLocationResponse = {
  locations: {
    edges: { node: { id: string } }[]
  }
}

export async function getPrimaryLocationId(): Promise<string | null> {
  try {
    const response = await fetchShopify<GetLocationResponse>(GET_PRIMARY_LOCATION_ID_QUERY);
    return response.locations.edges[0]?.node.id || null;
  } catch (error) {
    console.error("Failed to fetch primary location ID:", error);
    return null;
  }
}

type ProductData = {
    title: string;
    description: string; // HTML string
    tags: string;
    price: string;
    sku: string;
    imageUrls: string[];
};

export async function createProduct(productData: ProductData) {
  // 1. Create the product (title, tags, status)
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
    status: "DRAFT"
  };
  const createProductResult = await fetchShopify<any>(createProductMutation, { input: productInput });
  const productId = createProductResult.productCreate.product?.id;
  if (!productId) throw new Error(`Product create failed: ${JSON.stringify(createProductResult.productCreate.userErrors)}`);

  // 2. Get the default variant and inventoryItemId
  const getProductQuery = `
    query getProductById($id: ID!) {
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
  const getProductResult = await fetchShopify<any>(getProductQuery, { id: productId });
  const variantNode = getProductResult.product.variants.edges[0]?.node;
  if (!variantNode) throw new Error("No default variant found");
  const variantId = variantNode.id;
  const inventoryItemId = variantNode.inventoryItem.id;

  // 3. Update the variant's price
  const updateVariantMutation = `
    mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id }
        userErrors { field message }
      }
    }
  `;
  const updateVariantResult = await fetchShopify<any>(updateVariantMutation, {
    productId,
    variants: [{ id: variantId, price: productData.price }]
  });
  if (updateVariantResult.productVariantsBulkUpdate.userErrors?.length) {
    throw new Error(`Variant update failed: ${JSON.stringify(updateVariantResult.productVariantsBulkUpdate.userErrors)}`);
  }

  // 4. Update the inventory item's SKU
  const updateInventoryMutation = `
    mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem { id sku }
        userErrors { field message }
      }
    }
  `;
  const updateInventoryResult = await fetchShopify<any>(updateInventoryMutation, {
    id: inventoryItemId,
    input: { sku: productData.sku }
  });
  if (updateInventoryResult.inventoryItemUpdate.userErrors?.length) {
    throw new Error(`Inventory update failed: ${JSON.stringify(updateInventoryResult.inventoryItemUpdate.userErrors)}`);
  }

  // 5. Attach images
  if (productData.imageUrls.length > 0) {
    const createMediaMutation = `
        mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
            productCreateMedia(productId: $productId, media: $media) {
                media { ... on MediaImage { id } }
                userErrors { field message }
            }
        }
    `;
    const createMediaResult = await fetchShopify<any>(createMediaMutation, {
        productId,
        media: productData.imageUrls.map(url => ({ originalSource: url, mediaContentType: 'IMAGE' }))
    });
    if (createMediaResult.productCreateMedia.userErrors?.length) {
        console.warn(`Media create failed: ${JSON.stringify(createMediaResult.productCreateMedia.userErrors)}`);
    }
  }

  // 6. Set the description via metafield
  const setMetafieldMutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
            metafields { id }
            userErrors { field message }
        }
    }
  `;
  const setMetafieldResult = await fetchShopify<any>(setMetafieldMutation, {
    metafields: [{
        ownerId: productId,
        namespace: "custom",
        key: "description",
        type: "multi_line_text_field",
        value: productData.description
    }]
  });
  if (setMetafieldResult.metafieldsSet.userErrors?.length) {
    console.warn(`Metafield set failed: ${JSON.stringify(setMetafieldResult.metafieldsSet.userErrors)}`);
  }

  return { product: { id: productId } };
}

export async function updateProduct(productId: string, productInput: any) {
    const updateProductMutation = `
        mutation productUpdate($input: ProductInput!) {
            productUpdate(input: $input) {
                product {
                    id
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `;
    
    // For now, we only support updating core fields, not variants or images in this simplified flow
    const { variants, images, ...coreInput } = productInput;
    coreInput.id = productId;

    const result = await fetchShopify<any>(updateProductMutation, { input: coreInput });
    const userErrors = result.productUpdate.userErrors;

     if (userErrors && userErrors.length > 0) {
        throw new Error(`Product update failed: ${userErrors.map((e:any) => e.message).join(', ')}`);
    }
    
    return result;
}


// --- Delete Product ---
const PRODUCT_DELETE_MUTATION = `
  mutation productDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors { field message }
    }
  }
`;

type ProductDeleteResponse = {
  productDelete: {
    deletedProductId: string | null;
    userErrors: { field?: string[]; message: string }[];
  };
};

export async function deleteProduct(productId: string): Promise<ProductDeleteResponse> {
  const variables = { input: { id: productId } };
  return fetchShopify<ProductDeleteResponse>(PRODUCT_DELETE_MUTATION, variables);
}


const INVENTORY_ITEM_UPDATE_MUTATION = `
    mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
        inventoryItemUpdate(id: $id, input: $input) {
            inventoryItem {
                id
                sku
                unitCost { amount currencyCode }
            }
            userErrors {
                field
                message
            }
        }
    }
`;

type InventoryItemUpdateResponse = {
    inventoryItemUpdate: {
        inventoryItem: {
            id: string;
            sku: string | null;
        } | null;
        userErrors: {
            field: string[];
            message: string;
        }[];
    }
}

export async function updateInventoryItem(input: {id: string; sku?: string | null; cost?: number; tracked?: boolean;}): Promise<InventoryItemUpdateResponse> {
    const { id, sku, cost, tracked } = input;
    const variables = { id, input: { ...(sku !== undefined ? { sku } : {}), ...(typeof cost === 'number' ? { cost } : {}), ...(typeof tracked === 'boolean' ? { tracked } : {}) } };
    return fetchShopify<InventoryItemUpdateResponse>(INVENTORY_ITEM_UPDATE_MUTATION, variables);
}


// --- Fetch Orders ---
const GET_ORDERS_QUERY = `
    query getOrders($first: Int!) {
        orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
            edges {
                node {
                    id
                    name
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
                                title
                                quantity
                                product {
                                    id
                                 }
                            }
                        }
                    }
                }
            }
        }
    }
`;

type GetOrdersResponse = {
    orders: {
        edges: {
            node: ShopifyOrder;
        }[];
    };
};

export async function getOrders(count: number = 20): Promise<ShopifyOrder[]> {
    const response = await fetchShopify<GetOrdersResponse>(GET_ORDERS_QUERY, { first: count });
    return response.orders.edges.map(edge => edge.node);
}

// --- Get Business Snapshot for AI ---
export async function getBusinessSnapshot(orderCount = 50, productCount = 50) {
    const [orders, products] = await Promise.all([
        getOrders(orderCount),
        getProducts(productCount)
    ]);
    return { orders, products };
}

// --- Inventory quantity updates (2025-07) ---
const INVENTORY_SET_QUANTITIES_MUTATION = `
  mutation InventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup {
        createdAt
        reason
        referenceDocumentUri
        changes { name delta }
      }
      userErrors { field message }
    }
  }
`;

type InventorySetQuantitiesResponse = {
  inventorySetQuantities: {
    inventoryAdjustmentGroup: {
      createdAt: string;
      reason: string | null;
      referenceDocumentUri: string | null;
      changes: { name: string; delta: number }[];
    } | null;
    userErrors: { field?: string[]; message: string }[];
  };
};

export async function setInventoryQuantity(params: { inventoryItemId: string; locationId: string; quantity: number; compareQuantity?: number; }): Promise<InventorySetQuantitiesResponse> {
  const { inventoryItemId, locationId, quantity, compareQuantity } = params;
  const useCompare = typeof compareQuantity === 'number';
  const variables = {
    input: {
      name: "available",
      reason: "correction",
      ...(useCompare ? {} : { ignoreCompareQuantity: true }),
      quantities: [
        {
          inventoryItemId,
          locationId,
          quantity,
          ...(useCompare ? { compareQuantity } : {}),
        },
      ],
    },
  };
  return fetchShopify<InventorySetQuantitiesResponse>(INVENTORY_SET_QUANTITIES_MUTATION, variables);
}

