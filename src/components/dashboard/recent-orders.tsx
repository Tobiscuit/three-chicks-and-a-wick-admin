'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { generateClient } from 'aws-amplify/api';
import type { GraphQLSubscription } from 'aws-amplify/api';
import { Hub } from 'aws-amplify/utils';
import configureAmplify from '@/lib/amplify-client';
import { useEffect, useState } from "react";
import { getOrders } from "@/services/shopify"; // Import server action

const client = generateClient();

const onNewOrder = /* GraphQL */ `
  subscription OnNewOrder {
    onNewOrder {
      orderId
      orderNumber
      customerName
      totalAmount
      currency
      financialStatus
      fulfillmentStatus
      type
    }
  }
`;

// Type definition for the subscription payload
type OnNewOrderData = {
  onNewOrder: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    totalAmount: string;
    currency: string;
    financialStatus: string;
    fulfillmentStatus: string;
    type: 'CUSTOM' | 'STANDARD';
  };
};

type Order = {
  orderId: string;
  customer?: string;
  type: 'CUSTOM' | 'STANDARD';
  total?: string;
  status?: string;
}

export function RecentOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');

  // Fetch initial orders
  useEffect(() => {
    async function fetchInitialOrders() {
      try {
        const shopifyOrders = await getOrders(5); // Fetch last 5 orders
        const mappedOrders: Order[] = shopifyOrders.map(o => ({
          orderId: o.name,
          customer: o.customer ? `${o.customer.firstName} ${o.customer.lastName}` : 'Guest',
          type: 'STANDARD', // Default to STANDARD as getOrders doesn't seem to return type yet
          total: `${parseFloat(o.totalPriceSet.shopMoney.amount).toFixed(2)} ${o.totalPriceSet.shopMoney.currencyCode}`
        }));
        setOrders(mappedOrders);
      } catch (error) {
        console.error("Failed to fetch initial orders:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitialOrders();
  }, []);

  // Subscribe to new orders
  useEffect(() => {
    console.log('[RecentOrders] Configuring Amplify...');
    configureAmplify();

    // Listen for connection state changes
    const hubListener = Hub.listen('api', (data: any) => {
      const { payload } = data;
      if (payload.event === 'ConnectionStateChange') {
        const connectionState = payload.data.connectionState;
        console.log('[RecentOrders] 🔌 Connection state changed:', connectionState);
        setConnectionStatus(connectionState);
      }
    });

    console.log('[RecentOrders] Starting subscription...');
    const sub = client
      .graphql<GraphQLSubscription<OnNewOrderData>>({ query: onNewOrder })
      .subscribe({
        next: ({ data }) => {
          console.log('[RecentOrders] 📩 Received event:', data);
          if (!data?.onNewOrder) {
            console.warn('[RecentOrders] ⚠️ Received data but onNewOrder is missing:', data);
            return;
          }
          
          console.log('[RecentOrders] ✅ New Order Details:', data.onNewOrder);
          
          const newOrder: Order = {
            orderId: data.onNewOrder.orderNumber, // Use orderNumber (e.g. #1001) instead of raw ID
            customer: data.onNewOrder.customerName || 'Guest',
            type: data.onNewOrder.type,
            total: `${parseFloat(data.onNewOrder.totalAmount).toFixed(2)} ${data.onNewOrder.currency}`
          };
          
          setOrders(prevOrders => [newOrder, ...prevOrders.slice(0, 4)]); 
        },
        error: (error) => {
          console.error('[RecentOrders] ❌ Subscription Error:', error);
          if (error.errors) {
            error.errors.forEach((e: any) => console.error('[RecentOrders] GraphQLError:', e.message));
          }
        },
      });

    return () => {
      console.log('[RecentOrders] Unsubscribing...');
      sub.unsubscribe();
      hubListener(); // Stop listening to Hub events
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>A list of the most recent orders.</CardDescription>
        </div>
        <Button asChild>
          <Link href="/orders">View all orders</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                 <TableCell colSpan={4} className="text-center">Loading orders...</TableCell>
               </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">No recent orders found.</TableCell>
              </TableRow>
            ) : (
              orders.map((order, index) => (
                <TableRow key={`${order.orderId}-${index}`}>
                  <TableCell className="font-medium">{order.orderId}</TableCell>
                  <TableCell>{order.customer || 'N/A'}</TableCell>
                  <TableCell>{order.type === 'CUSTOM' ? 'Custom' : 'Standard'}</TableCell>
                  <TableCell className="text-right">{order.total || 'N/A'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
