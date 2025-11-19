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
      type
    }
  }
`;

// Type definition for the subscription payload
type OnNewOrderData = {
  onNewOrder: {
    orderId: string;
    type: 'CUSTOM' | 'STANDARD';
  };
};

type Order = {
  orderId: string;
  customer?: string;
  type: 'CUSTOM' | 'STANDARD';
  total?: string;
}

export function RecentOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');

  // ... (fetchInitialOrders useEffect)

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
            orderId: data.onNewOrder.orderId.split('/').pop()?.replace('gid://shopify/Order/', '#') || 'Unknown ID',
            customer: 'New Customer (Processing...)',
            type: data.onNewOrder.type,
            total: 'Calculating...'
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
                  <TableCell>{order.type}</TableCell>
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
