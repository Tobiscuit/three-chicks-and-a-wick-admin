'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OrdersClient() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Orders</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Order data will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
