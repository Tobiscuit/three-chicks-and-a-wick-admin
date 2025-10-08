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
      <div className="space-y-4 px-2 sm:px-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wand2 className="h-6 w-6 sm:h-8 sm:w-8" />
            Magic Request
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Manage your custom candle ordering system with smart validation and review.
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="pricing" className="text-xs sm:text-sm">Pricing</TabsTrigger>
            <TabsTrigger value="variants" className="text-xs sm:text-sm">Variants</TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs sm:text-sm">Reviews</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs sm:text-sm">Logs</TabsTrigger>
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

