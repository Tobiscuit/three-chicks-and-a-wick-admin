'use server';

import { ShopifyProduct } from "@/types/shopify";

export type { ShopifyProduct };

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

export async function getProductById(id: string): Promise<ShopifyProduct | null> {
    const response = await fetchShopify<GetProductByIdResponse>(GET_PRODUCT_BY_ID_QUERY, { id });
    if (!response.product) return null;
    const { description: descriptionMetafield, ...restOfProduct } = response.product;
    const product: ShopifyProduct = {
        ...restOfProduct,
        description: descriptionMetafield?.value || "",
    };
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
    imageUrls: string[];
};

async function getOnlineStorePublicationId(): Promise<string> {
  const query = `
    query {
      publications(first: 10) {
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
  const onlineStore = result.publications.edges.find((e: any) => e.node.name === 'Online Store');
  if (!onlineStore) throw new Error("Online Store publication channel not found.");
  return onlineStore.node.id;
}

async function publishProductToChannel(productId: string) {
  const publicationId = await getOnlineStorePublicationId();
  const mutation = `
    mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        publishable {
          ... on Product {
            id
            isPublished
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  const result = await fetchShopify<any>(mutation, {
    id: productId,
    input: [{ publicationId }]
  });
  const userErrors = result.publishablePublish.userErrors;
  if (userErrors && userErrors.length > 0) {
      console.warn(`Failed to publish product ${productId}: ${JSON.stringify(userErrors)}`);
  } else {
      console.log(`Successfully published product ${productId} to the Online Store.`);
  }
}

export async function createProduct(productData: ProductData) {
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

  const updateInventoryMutation = `
    mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem { id sku }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify<any>(updateInventoryMutation, {
    id: inventoryItemId,
    input: { sku: productData.sku }
  });

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

  await updateProductDescription(productId, productData.description);

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
                userErrors {
                    field
                    message
                }
            }
        }
    `;
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
    await fetchShopify<any>(mutation, variables);
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