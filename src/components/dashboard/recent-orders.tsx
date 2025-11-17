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
import configureAmplify from '@/lib/amplify-client';
import { useEffect, useState } from "react";

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

// Dummy data for fallback
const dummyOrders = [
  { orderId: "#3210", customer: "Olivia Martin", type: "CUSTOM", total: "$42.50" },
  { orderId: "#3209", customer: "Ava Johnson", type: "STANDARD", total: "$74.99" },
  { orderId: "#3208", customer: "Liam Smith", type: "CUSTOM", total: "$55.00" },
  { orderId: "#3207", customer: "Emma Brown", type: "STANDARD", total: "$128.00" },
  { orderId: "#3206", customer: "Noah Williams", type: "STANDARD", total: "$24.95" },
];

type Order = {
  orderId: string;
  customer?: string; // Customer and total are not in the subscription payload
  type: 'CUSTOM' | 'STANDARD';
  total?: string;
}

export function RecentOrders() {
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);

  useEffect(() => {
    configureAmplify();

    const sub = client
      .graphql<GraphQLSubscription<OnNewOrderData>>({ query: onNewOrder })
      .subscribe({
        next: ({ data }) => {
          if (!data?.onNewOrder) {
            console.warn('Received subscription data but onNewOrder is missing:', data);
            return;
          }
          
          console.log('New order received:', data.onNewOrder);
          const newOrder: Order = {
            orderId: data.onNewOrder.orderId.split('/').pop()?.replace('gid://shopify/Order/', '#') || 'Unknown ID',
            customer: 'New Customer', // Placeholder
            type: data.onNewOrder.type,
            total: 'N/A' // Placeholder
          };
          setLiveOrders(prevOrders => [newOrder, ...prevOrders]);
        },
        error: (error) => console.error('Subscription error', error),
      });

    return () => sub.unsubscribe();
  }, []);

  const ordersToDisplay = liveOrders.length > 0 ? liveOrders : dummyOrders;

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
            {ordersToDisplay.map((order) => (
              <TableRow key={order.orderId}>
                <TableCell className="font-medium">{order.orderId}</TableCell>
                <TableCell>{order.customer || 'N/A'}</TableCell>
                <TableCell>{order.type}</TableCell>
                <TableCell className="text-right">{order.total || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
