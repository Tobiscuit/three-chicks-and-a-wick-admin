/**
 * Shopify Products Service
 * 
 * Product CRUD operations: get, create, update, delete.
 */

import { cache } from 'react';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { encodeShopifyId } from '@/lib/utils';
import { fetchShopify, sleep } from './client';
import { collectionAddProducts } from './collections';
import { updateInventoryQuantity, getPrimaryLocationId } from './inventory';
import type { ShopifyProduct } from '@/types/shopify';

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

type GetProductsResponse = {
  products: {
    edges: Array<{
      node: {
        description: string;
        descriptionHtml: string;
        customDescription: { value: string } | null;
      } & Omit<ShopifyProduct, 'description'>;
    }>;
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
};

type GetProductByIdResponse = {
  product: {
    description: string;
    descriptionHtml: string;
    customDescription: { value: string } | null;
  } & Omit<ShopifyProduct, 'description'> | null;
};

// ============================================================================
// Queries
// ============================================================================

const GET_PRODUCTS_QUERY = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id title handle status productType tags totalInventory onlineStoreUrl
          description descriptionHtml
          customDescription: metafield(namespace: "custom", key: "description") { value }
          featuredImage { url(transform: {maxWidth: 1024, maxHeight: 1024}) }
          images(first: 100) {
            edges { node { id url(transform: {maxWidth: 1024, maxHeight: 1024}) altText } }
          }
          priceRange: priceRangeV2 { minVariantPrice { amount currencyCode } }
          variants(first: 1) {
            edges { node { id sku inventoryItem { id } } }
          }
          collections(first: 10) { edges { node { id title } } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const GET_PRODUCT_BY_ID_QUERY = `
  query getProductById($id: ID!) {
    product(id: $id) {
      id title handle status productType tags totalInventory onlineStoreUrl
      description descriptionHtml
      customDescription: metafield(namespace: "custom", key: "description") { value }
      featuredImage { url(transform: {maxWidth: 1024, maxHeight: 1024}) }
      images(first: 20) {
        edges { node { id url(transform: {maxWidth: 1024, maxHeight: 1024}) altText } }
      }
      priceRange: priceRangeV2 { minVariantPrice { amount currencyCode } }
      variants(first: 1) { edges { node { id sku inventoryItem { id } } } }
      collections(first: 10) { edges { node { id title } } }
    }
  }
`;

// ============================================================================
// Read Functions
// ============================================================================

/**
 * Get all products with React cache memoization.
 */
export const getProducts = cache(
  async (first: number = 50, after?: string): Promise<ShopifyProduct[]> => {
    const response = await fetchShopify<GetProductsResponse>(GET_PRODUCTS_QUERY, { first, after });

    return response.products.edges.map(({ node }) => {
      const { description, descriptionHtml, customDescription, ...restOfProduct } = node;
      return {
        ...restOfProduct,
        description: description || descriptionHtml || customDescription?.value || '',
      };
    });
  }
);

/**
 * Get a single product by ID.
 */
export const getProductById = cache(async (id: string): Promise<ShopifyProduct | null> => {
  const response = await fetchShopify<GetProductByIdResponse>(GET_PRODUCT_BY_ID_QUERY, { id });

  if (!response.product) return null;

  const { description, descriptionHtml, customDescription, ...restOfProduct } = response.product;
  return {
    ...restOfProduct,
    description: description || descriptionHtml || customDescription?.value || '',
  };
});

/**
 * Get a single product by handle.
 */
export async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const query = `
    query getProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id title handle status productType tags totalInventory onlineStoreUrl
        description descriptionHtml
        customDescription: metafield(namespace: "custom", key: "description") { value }
        featuredImage { url(transform: {maxWidth: 1024, maxHeight: 1024}) }
        images(first: 20) {
          edges { node { id url(transform: {maxWidth: 1024, maxHeight: 1024}) altText } }
        }
        priceRange: priceRangeV2 { minVariantPrice { amount currencyCode } }
        variants(first: 10) {
          edges { node { id title sku price inventoryItem { id } } }
        }
        collections(first: 10) { edges { node { id title } } }
      }
    }
  `;

  const response = await fetchShopify<{ productByHandle: GetProductByIdResponse['product'] }>(query, { handle });
  if (!response.productByHandle) return null;

  // Load shadow description if available
  const productId = response.productByHandle.id;
  const { loadShadowDescription } = await import('@/services/product-shadow');
  const shadowDescription = await loadShadowDescription(productId);

  const { description, descriptionHtml, customDescription, ...restOfProduct } = response.productByHandle;
  const finalDescription = shadowDescription || descriptionHtml || customDescription?.value || description || '';

  return {
    ...restOfProduct,
    description: finalDescription,
  };
}

// ============================================================================
// Create/Update/Delete Functions
// ============================================================================

/**
 * Create a new product with all associated data.
 */
export async function createProduct(productData: ProductData) {
  // Step 1: Create the product shell
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
  
  const createResult = await fetchShopify<{ productCreate: { product: { id: string } | null; userErrors: { field: string; message: string }[] } }>(
    createProductMutation,
    { input: productInput }
  );
  
  const productId = createResult.productCreate.product?.id;
  if (!productId) {
    throw new Error(`Product create failed: ${JSON.stringify(createResult.productCreate.userErrors)}`);
  }

  // Step 2: Get the default variant
  const getVariantQuery = `
    query getProductVariant($id: ID!) {
      product(id: $id) {
        variants(first: 1) {
          edges { node { id inventoryItem { id } } }
        }
      }
    }
  `;
  const getVariantResult = await fetchShopify<{ product: { variants: { edges: Array<{ node: { id: string; inventoryItem: { id: string } } }> } } }>(
    getVariantQuery,
    { id: productId }
  );
  const variantNode = getVariantResult.product.variants.edges[0]?.node;
  if (!variantNode) throw new Error('No default variant found');
  const { id: variantId, inventoryItem: { id: inventoryItemId } } = variantNode;

  // Step 3: Update variant price
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

  // Step 4: Enable inventory tracking
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
    input: { sku: productData.sku, tracked: true },
  });

  // Step 5: Activate inventory at location
  const locationId = await getPrimaryLocationId();
  if (!locationId) throw new Error('Could not determine primary location');
  
  const inventoryActivateMutation = `
    mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!) {
      inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) {
        inventoryLevel { id }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify(inventoryActivateMutation, { inventoryItemId, locationId });

  // Step 6: Set inventory quantity
  if (typeof productData.inventory === 'number') {
    await updateInventoryQuantity(inventoryItemId, productData.inventory, locationId);
    
    const docId = encodeShopifyId(inventoryItemId);
    await adminDb.collection('inventoryStatus').doc(docId).set({
      quantity: productData.inventory,
      status: 'confirmed',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  // Step 7: Add to collections
  if (productData.collections?.length) {
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
    await fetchShopify(createMediaMutation, {
      productId,
      media: productData.imageUrls.map((url) => ({ originalSource: url, mediaContentType: 'IMAGE' })),
    });
  }

  // Step 9: Update description via metafield
  await updateProductDescription(productId, productData.description);

  return { product: { id: productId } };
}

/**
 * Update product fields.
 */
export async function updateProduct(
  productId: string,
  productInput: { title?: string; tags?: string; status?: string; descriptionHtml?: string }
) {
  const updateProductMutation = `
    mutation productUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify(updateProductMutation, { input: { id: productId, ...productInput } });
}

/**
 * Update product description via metafield.
 */
export async function updateProductDescription(productId: string, description: string): Promise<void> {
  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify(mutation, {
    metafields: [{
      ownerId: productId,
      namespace: 'custom',
      key: 'description',
      value: description,
      type: 'multi_line_text_field',
    }],
  });
}

/**
 * Delete a product.
 */
export async function deleteProduct(productId: string): Promise<void> {
  const mutation = `
    mutation productDelete($input: ProductDeleteInput!) {
      productDelete(input: $input) {
        deletedProductId
        userErrors { field message }
      }
    }
  `;
  await fetchShopify(mutation, { input: { id: productId } });
}

/**
 * Delete media from a product.
 */
export async function productDeleteMedia(productId: string, mediaIds: string[]): Promise<void> {
  const mutation = `
    mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
      productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
        deletedMediaIds
        userErrors { field message }
      }
    }
  `;
  await fetchShopify(mutation, { productId, mediaIds });
}

/**
 * Reorder media on a product.
 */
export async function productReorderMedia(
  productId: string,
  moves: { id: string; newPosition: string }[]
): Promise<void> {
  const mutation = `
    mutation productReorderMedia($id: ID!, $moves: [MoveInput!]!) {
      productReorderMedia(id: $id, moves: $moves) {
        job { id }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify(mutation, { id: productId, moves });
}

/**
 * Update product images (delete existing and add new).
 */
export async function updateProductImages(productId: string, newImageUrls: string[]): Promise<void> {
  // Get existing media
  const getMediaQuery = `
    query getProductMedia($id: ID!) {
      product(id: $id) {
        media(first: 100) {
          edges { node { id } }
        }
      }
    }
  `;
  const mediaResult = await fetchShopify<{ product: { media: { edges: Array<{ node: { id: string } }> } } }>(
    getMediaQuery,
    { id: productId }
  );
  
  const existingMediaIds = mediaResult.product.media.edges.map((e) => e.node.id);
  
  // Delete existing media
  if (existingMediaIds.length > 0) {
    await productDeleteMedia(productId, existingMediaIds);
    await sleep(500); // Wait for deletion to propagate
  }
  
  // Add new media
  if (newImageUrls.length > 0) {
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
      media: newImageUrls.map((url) => ({ originalSource: url, mediaContentType: 'IMAGE' })),
    });
  }
}
