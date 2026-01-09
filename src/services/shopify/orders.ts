/**
 * Shopify Orders Service
 * 
 * Order operations: list, get, fulfill, manage tags.
 */

import { cache } from 'react';
import { fetchShopify } from './client';
import type { ShopifyOrder } from '@/types/shopify';

// ============================================================================
// Types
// ============================================================================

type GetOrdersResponse = {
  orders: {
    edges: Array<{ node: ShopifyOrder }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
};

type UnfulfilledOrder = {
  id: string;
  name: string;
  createdAt: string;
  customer: { firstName: string; lastName: string } | null;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  displayFulfillmentStatus: string;
  fulfillmentOrders: {
    edges: Array<{
      node: {
        id: string;
        status: string;
        assignedLocation: { location: { id: string } } | null;
        lineItems: {
          edges: Array<{
            node: { id: string; remainingQuantity: number };
          }>;
        };
      };
    }>;
  };
};

// ============================================================================
// Queries
// ============================================================================

const GET_ORDERS_QUERY = `
  query getOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          processedAt
          tags
          totalPriceSet {
            shopMoney { amount currencyCode }
          }
          totalShippingPriceSet {
            shopMoney { amount currencyCode }
          }
          totalTaxSet {
            shopMoney { amount currencyCode }
          }
          customer { firstName lastName email }
          shippingAddress {
            address1 address2 city province zip country
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
                  featuredImage { url altText }
                }
                variant { title sku }
                customAttributes { key value }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

// ============================================================================
// Functions
// ============================================================================

/**
 * Get all orders with React cache memoization.
 */
export const getOrders = cache(
  async (first: number = 50, after?: string): Promise<ShopifyOrder[]> => {
    try {
      const result = await fetchShopify<GetOrdersResponse>(GET_ORDERS_QUERY, { first, after });
      return result.orders.edges.map((edge) => edge.node);
    } catch (error) {
      console.error('[Orders] Error fetching orders:', error);
      throw error;
    }
  }
);

/**
 * Get a single order by ID.
 */
export async function getOrder(id: string): Promise<ShopifyOrder | null> {
  const query = `
    query getOrder($id: ID!) {
      order(id: $id) {
        id
        name
        createdAt
        processedAt
        tags
        totalPriceSet { shopMoney { amount currencyCode } }
        totalShippingPriceSet { shopMoney { amount currencyCode } }
        totalTaxSet { shopMoney { amount currencyCode } }
        customer { firstName lastName email }
        shippingAddress { address1 address2 city province zip country }
        displayFinancialStatus
        displayFulfillmentStatus
        lineItems(first: 50) {
          edges {
            node {
              id
              title
              quantity
              product {
                id
                title
                featuredImage { url altText }
              }
              variant { title sku }
              customAttributes { key value }
            }
          }
        }
      }
    }
  `;

  const result = await fetchShopify<{ order: ShopifyOrder | null }>(query, { id });
  return result.order;
}

/**
 * Get an order by order number (e.g., "1234").
 */
export async function getOrderByNumber(orderNumber: string): Promise<ShopifyOrder | null> {
  const query = `
    query getOrderByNumber($query: String!) {
      orders(first: 1, query: $query) {
        edges {
          node {
            id
            name
            createdAt
            processedAt
            tags
            totalPriceSet { shopMoney { amount currencyCode } }
            customer { firstName lastName email }
            shippingAddress { address1 address2 city province zip country }
            displayFinancialStatus
            displayFulfillmentStatus
            lineItems(first: 50) {
              edges {
                node {
                  id
                  title
                  quantity
                  product { id title }
                  variant { title sku }
                  customAttributes { key value }
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await fetchShopify<{ orders: { edges: Array<{ node: ShopifyOrder }> } }>(query, {
    query: `name:#${orderNumber}`,
  });
  
  return result.orders.edges[0]?.node ?? null;
}

/**
 * Get unfulfilled orders for quick fulfill widget.
 */
export async function getUnfulfilledOrders(first: number = 10): Promise<UnfulfilledOrder[]> {
  const query = `
    query getUnfulfilledOrders($first: Int!) {
      orders(first: $first, query: "fulfillment_status:unfulfilled", sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            customer { firstName lastName }
            totalPriceSet { shopMoney { amount currencyCode } }
            displayFulfillmentStatus
            fulfillmentOrders(first: 5) {
              edges {
                node {
                  id
                  status
                  assignedLocation { location { id } }
                  lineItems(first: 20) {
                    edges {
                      node { id remainingQuantity }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetchShopify<{ orders: { edges: Array<{ node: UnfulfilledOrder }> } }>(
    query,
    { first }
  );
  return response.orders.edges.map((edge) => edge.node);
}

/**
 * Add tags to an order.
 */
export async function addTagsToOrder(orderId: string, tags: string[]): Promise<void> {
  const mutation = `
    mutation tagsAdd($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        node { ... on Order { id tags } }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify(mutation, { id: orderId, tags });
}

/**
 * Remove tags from an order.
 */
export async function removeTagsFromOrder(orderId: string, tags: string[]): Promise<void> {
  const mutation = `
    mutation tagsRemove($id: ID!, $tags: [String!]!) {
      tagsRemove(id: $id, tags: $tags) {
        node { ... on Order { id tags } }
        userErrors { field message }
      }
    }
  `;
  await fetchShopify(mutation, { id: orderId, tags });
}

/**
 * Fulfill an order (mark as shipped).
 */
export async function fulfillOrder(orderId: string) {
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
                  node { id remainingQuantity }
                }
              }
            }
          }
        }
      }
    }
  `;

  type FulfillmentOrderResponse = {
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
  };

  const orderResponse = await fetchShopify<FulfillmentOrderResponse>(getOrderQuery, { id: orderId });

  if (!orderResponse.order) {
    throw new Error('Order not found');
  }

  // Find open fulfillment orders
  const openFulfillmentOrders = orderResponse.order.fulfillmentOrders.edges
    .filter((edge) => edge.node.status === 'OPEN' || edge.node.status === 'IN_PROGRESS')
    .map((edge) => edge.node);

  if (openFulfillmentOrders.length === 0) {
    throw new Error('No open fulfillment orders found. Order may already be fulfilled.');
  }

  // Fulfill each open fulfillment order
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
          fulfillment { id status }
          userErrors { field message }
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

  return {
    success: true,
    orderName: orderResponse.order.name,
    fulfillments: results,
  };
}

/**
 * Get a business snapshot for AI analysis.
 */
export async function getBusinessSnapshot() {
  const { getProducts } = await import('./products');
  
  try {
    const [orders, products] = await Promise.all([
      getOrders(10),
      getProducts(20),
    ]);

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      name: order.name,
      created_at: order.createdAt,
      total_price: parseFloat(order.totalPriceSet?.shopMoney?.amount || '0'),
      currency: order.totalPriceSet?.shopMoney?.currencyCode,
      customer_name: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest',
      items: order.lineItems.edges.map((edge) => ({
        title: edge.node.title,
        quantity: edge.node.quantity,
        price: '0.00',
      })),
    }));

    return {
      orders: formattedOrders,
      products,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Orders] Failed to get business snapshot:', error);
    throw new Error('Failed to retrieve business data');
  }
}

