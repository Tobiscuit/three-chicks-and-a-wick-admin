'use client';

import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MagicRequestOverview } from '@/components/magic-request/overview';
import { MagicRequestPricing } from '@/components/magic-request/pricing';
import { MagicRequestVariants } from '@/components/magic-request/variants';
import { MagicRequestReviews } from '@/components/magic-request/reviews';
import { MagicRequestLogs } from '@/components/magic-request/logs';
import { Wand2 } from 'lucide-react';

export default function MagicRequestPage() {
  return (
    <AuthWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wand2 className="h-8 w-8" />
            Magic Request
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage AI-powered custom candle ordering system with security validation and human review.
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="reviews">Pending Reviews</TabsTrigger>
            <TabsTrigger value="logs">Security Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <MagicRequestOverview />
          </TabsContent>

          <TabsContent value="pricing">
            <MagicRequestPricing />
          </TabsContent>

          <TabsContent value="variants">
            <MagicRequestVariants />
          </TabsContent>

          <TabsContent value="reviews">
            <MagicRequestReviews />
          </TabsContent>

          <TabsContent value="logs">
            <MagicRequestLogs />
          </TabsContent>
        </Tabs>
      </div>
    </AuthWrapper>
  );
}

