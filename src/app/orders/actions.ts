'use server'

import { getOrders } from '@/lib/shopify-client'

/**
 * Server action to get the unfulfilled order count for sidebar badge.
 * This keeps the Shopify admin token server-side.
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
