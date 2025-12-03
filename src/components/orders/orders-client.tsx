'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { File } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getOrders } from '@/services/shopify';
import { generateClient } from 'aws-amplify/api';
import type { GraphQLSubscription } from 'aws-amplify/api';
import { Hub } from 'aws-amplify/utils';
import configureAmplify from '@/lib/amplify-client';
import { OrderDetailsModal } from './order-details-modal';
import { FeatureHighlight } from '@/components/ui/feature-highlight';
import { generateProductionCSV, generateFinancialCSV, downloadCSV } from '@/lib/export-utils';
import { useFeatureDiscovery } from '@/context/feature-discovery-context';

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

export default function OrdersClient() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  // Fetch initial orders
  useEffect(() => {
    async function fetchInitialOrders() {
      try {
        const shopifyOrders = await getOrders(50);
        setOrders(shopifyOrders);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitialOrders();
  }, []);

  // Subscribe to new orders
  useEffect(() => {
    configureAmplify();

    const sub = client
      .graphql<GraphQLSubscription<OnNewOrderData>>({ query: onNewOrder })
      .subscribe({
        next: ({ data }) => {
          if (!data?.onNewOrder) return;

          getOrders(1).then(newOrders => {
            if (newOrders.length > 0) {
              setOrders(prev => {
                const exists = prev.find(o => o.id === newOrders[0].id);
                if (exists) return prev;
                return [newOrders[0], ...prev];
              });
            }
          });
        },
        error: (error) => console.error('Subscription Error:', error),
      });

    return () => sub.unsubscribe();
  }, []);

  const handleOrderClick = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const formatCurrency = (amount: string, currency: string) => {
    return `${parseFloat(amount).toFixed(2)} ${currency}`;
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    const status = (order.displayFulfillmentStatus || 'UNFULFILLED').toUpperCase();
    if (filter === 'unfulfilled') return status === 'UNFULFILLED' || status === 'ON_HOLD' || status === 'SCHEDULED';
    if (filter === 'fulfilled') return status === 'FULFILLED';
    return true;
  });



  const { markSeen } = useFeatureDiscovery();

  const handleExport = () => {
    // Mark tutorial as seen when used
    markSeen('smart-export-v1');

    if (filter === 'unfulfilled') {
      const csv = generateProductionCSV(filteredOrders);
      downloadCSV(csv, `production-manifest-${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      const csv = generateFinancialCSV(filteredOrders);
      downloadCSV(csv, `orders-export-${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  return (
    <>
      <Tabs defaultValue="all" value={filter} onValueChange={setFilter}>
        <div className="flex items-center mb-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unfulfilled">Unfulfilled</TabsTrigger>
            <TabsTrigger value="fulfilled">Fulfilled</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <FeatureHighlight
              featureId="smart-export-v1"
              title="Smart Export"
              description="This button adapts to your view! Filter to 'Unfulfilled' to get a Production Manifest for the workshop, or 'All' for a financial CSV."
            >
              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExport}>
                <File className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Export
                </span>
              </Button>
            </FeatureHighlight>
          </div>
        </div>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            Manage and view details for all customer orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading orders...</TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No orders found.</TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleOrderClick(order)}
                  >
                    <TableCell className="font-medium">{order.name}</TableCell>
                    <TableCell>
                      {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest'}
                    </TableCell>
                    <TableCell>
                      {/* Simple heuristic for type display in list, modal has full logic */}
                      {order.lineItems.edges.some((e: any) => e.node.product?.title?.includes('Magic Request')) ? 'Custom' : 'Standard'}
                    </TableCell>
                    <TableCell>{order.displayFulfillmentStatus || 'Unfulfilled'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(order.totalPriceSet.shopMoney.amount, order.totalPriceSet.shopMoney.currencyCode)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <OrderDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={selectedOrder}
      />
    </>
  );
}
