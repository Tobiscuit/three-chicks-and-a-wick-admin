
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
    descriptionHtml: string;
    tags: string;
    price: string;
    sku: string;
    imageUrls: string[];
};

export async function createProduct(productData: ProductData) {
  // Step 1: Create the product
  const createProductMutation = `
    mutation productCreate($input: ProductInput!) {
      productCreate(input: $input) {
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
  const productInput = {
    title: productData.title,
    status: 'DRAFT',
    descriptionHtml: productData.descriptionHtml,
    tags: productData.tags,
  };

  const createProductResult = await fetchShopify<any>(createProductMutation, { input: productInput });
  const productCreateErrors = createProductResult.productCreate.userErrors;
  if (productCreateErrors && productCreateErrors.length > 0) {
    throw new Error(`Product create failed: ${productCreateErrors.map((e:any) => e.message).join(', ')}`);
  }
  const productId = createProductResult.productCreate.product.id;
  if (!productId) {
      throw new Error("Product was created but its ID could not be retrieved.");
  }

  // Step 2: Create the variant
  const createVariantMutation = `
    mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkCreate(productId: $productId, variants: $variants) {
        productVariants {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  const variantInput = [{
    price: productData.price,
    sku: productData.sku,
  }];
  const createVariantResult = await fetchShopify<any>(createVariantMutation, { productId, variants: variantInput });
  const variantErrors = createVariantResult.productVariantsBulkCreate.userErrors;
  if (variantErrors && variantErrors.length > 0) {
    throw new Error(`Variant create failed: ${variantErrors.map((e:any) => e.message).join(', ')}`);
  }

  // Step 3: Attach images
  if (productData.imageUrls && productData.imageUrls.length > 0) {
    const createMediaMutation = `
      mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media {
            ... on MediaImage {
              id
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    const mediaInput = productData.imageUrls.map(url => ({
        originalSource: url,
        mediaContentType: 'IMAGE',
    }));
    
    const createMediaResult = await fetchShopify<any>(createMediaMutation, { productId, media: mediaInput });
    const mediaErrors = createMediaResult.productCreateMedia.userErrors;
    if (mediaErrors && mediaErrors.length > 0) {
        // Non-critical error, just log it
      console.warn(`Attaching images failed: ${mediaErrors.map((e:any) => e.message).join(', ')}`);
    }
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
    
    const { variants, images, ...coreInput } = productInput;
    coreInput.id = productId;

    const result = await fetchShopify<any>(updateProductMutation, { input: coreInput });
    const userErrors = result.productUpdate.userErrors;

     if (userErrors && userErrors.length > 0) {
        throw new Error(`Product update failed: ${userErrors.map((e:any) => e.message).join(', ')}`);
    }
    
    // In a real app, you would add logic here to update variants and images separately
    // For now, we are just updating the core product details.
    
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
