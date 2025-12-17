'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { File } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getOrders, ShopifyOrder } from '@/services/shopify';
import { generateClient } from 'aws-amplify/api';
import type { GraphQLSubscription } from 'aws-amplify/api';
import configureAmplify from '@/lib/amplify-client';
import { OrderDetailsModal } from './order-details-modal';
import { FeatureHighlight } from '@/components/ui/feature-highlight';
import { generateProductionData, generateFinancialData, toCSV, downloadCSV } from '@/lib/export-utils';
import { useFeatureDiscovery } from '@/context/feature-discovery-context';
import { ExportPreviewDialog } from './export-preview-dialog';
import { DataTable } from '@/components/ui/data-table';
import { orderColumns } from './order-columns';
import { OrderCard } from './order-card';

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
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null);
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

  const handleOrderClick = (order: ShopifyOrder) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    const status = (order.displayFulfillmentStatus || 'UNFULFILLED').toUpperCase();
    if (filter === 'unfulfilled') return status === 'UNFULFILLED' || status === 'ON_HOLD' || status === 'SCHEDULED';
    if (filter === 'fulfilled') return status === 'FULFILLED';
    return true;
  });

  const { markSeen } = useFeatureDiscovery();

  const [exportData, setExportData] = useState<{ headers: string[], rows: string[][] } | null>(null);
  const [exportType, setExportType] = useState<'production' | 'financial'>('financial');

  const handleExportClick = () => {
    // Mark tutorial as seen when used
    markSeen('smart-export-v1');

    if (filter === 'unfulfilled') {
      setExportType('production');
      setExportData(generateProductionData(filteredOrders));
    } else {
      setExportType('financial');
      setExportData(generateFinancialData(filteredOrders));
    }
  };

  const handleConfirmExport = () => {
    if (!exportData) return;

    const csv = toCSV(exportData.headers, exportData.rows);
    const filename = exportType === 'production'
      ? `production-manifest-${new Date().toISOString().split('T')[0]}.csv`
      : `orders-export-${new Date().toISOString().split('T')[0]}.csv`;

    downloadCSV(csv, filename);
    setExportData(null);
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
              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExportClick}>
                <File className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Export
                </span>
              </Button>
            </FeatureHighlight>
          </div>
        </div>
      </Tabs>

      <DataTable
        columns={orderColumns}
        data={filteredOrders}
        onRowClick={handleOrderClick}
        isLoading={isLoading}
        mobileCardRenderer={(order, onClick, index) => (
          <OrderCard order={order} onClick={onClick} index={index} />
        )}
      />

      <OrderDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={selectedOrder}
      />

      {exportData && (
        <ExportPreviewDialog
          isOpen={!!exportData}
          onClose={() => setExportData(null)}
          data={exportData}
          type={exportType}
          onConfirm={handleConfirmExport}
        />
      )}
    </>
  );
}
