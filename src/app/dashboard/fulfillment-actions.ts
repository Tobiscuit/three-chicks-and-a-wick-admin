'use server';

import { getUnfulfilledOrders, fulfillOrder } from '@/services/shopify';
import { revalidatePath } from 'next/cache';

/**
 * Server action to get unfulfilled orders
 */
export async function getUnfulfilledOrdersAction() {
  try {
    const orders = await getUnfulfilledOrders(10);
    return { success: true, orders };
  } catch (error) {
    console.error('Failed to fetch unfulfilled orders:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      orders: []
    };
  }
}

/**
 * Server action to fulfill an order
 */
export async function fulfillOrderAction(orderId: string) {
  try {
    const result = await fulfillOrder(orderId);
    
    // Revalidate the dashboard to show updated order status
    revalidatePath('/dashboard');
    revalidatePath('/orders');
    
    return { 
      success: true, 
      orderName: result.orderName,
      message: `Order ${result.orderName} fulfilled successfully!`
    };
  } catch (error) {
    console.error('Failed to fulfill order:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fulfill order'
    };
  }
}
