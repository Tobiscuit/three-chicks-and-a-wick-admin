'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { generateClient } from 'aws-amplify/api';
import type { GraphQLSubscription } from 'aws-amplify/api';
import { Hub } from 'aws-amplify/utils';
import configureAmplify from '@/lib/amplify-client';
import { useEffect } from "react";
import { getOrders } from "@/services/shopify";
import { OrderQuickView } from "./order-quick-view";

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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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
    <Card className={cn(
      "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-500",
      "hover:shadow-md hover:border-primary/20 transition-all"
    )}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-semibold tracking-tight">Recent Orders</CardTitle>
          <CardDescription>A list of the most recent orders.</CardDescription>
        </div>
        <Button asChild>
          <Link href="/orders">View all orders</Link>
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead className="hidden sm:table-cell">Customer</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
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
                <Sheet 
                  key={`${order.orderId}-${index}`}
                  open={sheetOpen && selectedOrder?.orderId === order.orderId}
                  onOpenChange={(isOpen) => {
                    setSheetOpen(isOpen)
                    if (!isOpen) setSelectedOrder(null)
                  }}
                >
                  <SheetTrigger asChild>
                    <TableRow 
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedOrder(order);
                        setSheetOpen(true);
                      }}
                    >
                      <TableCell className="font-mono text-sm tabular-nums">{order.orderId}</TableCell>
                      <TableCell className="hidden sm:table-cell">{order.customer || 'N/A'}</TableCell>
                      <TableCell className="hidden md:table-cell">{order.type === 'CUSTOM' ? 'Custom' : 'Standard'}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{order.total || 'N/A'}</TableCell>
                    </TableRow>
                  </SheetTrigger>
                  <SheetContent className="sm:max-w-md">
                    {selectedOrder && (
                      <OrderQuickView 
                        order={selectedOrder} 
                        onClose={() => setSheetOpen(false)} 
                      />
                    )}
                  </SheetContent>
                </Sheet>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
