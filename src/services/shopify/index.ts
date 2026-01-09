/**
 * Shopify Services - Barrel Export
 * 
 * Clean Architecture: This barrel file provides a unified import surface
 * for all Shopify operations, organized by domain.
 * 
 * Usage:
 *   import { getProducts, createProduct } from '@/services/shopify';
 *   import { getOrders, fulfillOrder } from '@/services/shopify';
 */

// Core client utility
export { fetchShopify, sleep } from './client';

// Products domain
export {
  getProducts,
  getProductById,
  getProductByHandle,
  createProduct,
  updateProduct,
  updateProductDescription,
  deleteProduct,
  productDeleteMedia,
  productReorderMedia,
  updateProductImages,
  type ProductData,
} from './products';

// Orders domain
export {
  getOrders,
  getOrder,
  getOrderByNumber,
  getUnfulfilledOrders,
  addTagsToOrder,
  removeTagsFromOrder,
  fulfillOrder,
  getBusinessSnapshot,
} from './orders';

// Collections domain
export {
  getCollections,
  collectionAddProducts,
  collectionRemoveProducts,
} from './collections';

// Inventory domain
export {
  getPrimaryLocationId,
  getLocations,
  updateInventoryQuantity,
  activateInventory,
} from './inventory';
