'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export function MagicRequestReviews() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Reviews
        </CardTitle>
        <CardDescription>
          Orders flagged as SUSPICIOUS by the cybersecurity AI awaiting manual review
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            This tab will display custom candle orders that have been flagged by the cybersecurity AI for manual review. 
            You'll be able to approve, modify, or reject orders that show suspicious patterns.
          </p>
          <div className="mt-6 text-sm text-muted-foreground">
            <p className="font-semibold mb-2">Features to be implemented:</p>
            <ul className="space-y-1">
              <li>• View order details and customer input</li>
              <li>• See security flags and risk assessment</li>
              <li>• Approve orders to create Shopify variants</li>
              <li>• Reject orders with reason for blocking</li>
              <li>• View AI-generated product specifications</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

