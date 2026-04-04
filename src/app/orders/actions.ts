'use server'

import { getOrders, type ShopifyOrder } from '@/lib/shopify-client'

// Re-export the type so client components can import it from here
export type { ShopifyOrder }

/**
 * Server action to fetch orders from Shopify.
 * This keeps the Shopify admin token server-side.
 */
export async function getOrdersAction(first: number = 50): Promise<ShopifyOrder[]> {
  try {
    return await getOrders(first)
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    return []
  }
}

/**
 * Server action to get the unfulfilled order count for sidebar badge.
 */
export async function getUnfulfilledCountAction(): Promise<number> {
  try {
    const orders = await getOrders(50)
    const unfulfilled = orders.filter(order => {
      const status = (order.displayFulfillmentStatus || 'UNFULFILLED').toUpperCase()
      return status === 'UNFULFILLED' || status === 'ON_HOLD' || status === 'SCHEDULED'
    })
    return unfulfilled.length
  } catch (error) {
    console.error('Failed to fetch unfulfilled count:', error)
    return 0
  }
}
