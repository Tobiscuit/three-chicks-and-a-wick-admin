'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MagicRequestOverview } from '@/components/magic-request/overview';
import { MagicRequestFragrances } from '@/components/magic-request/fragrances';
import { MagicRequestReviews } from '@/components/magic-request/reviews';
import { MagicRequestLogs } from '@/components/magic-request/logs';
import { PricingManager } from '@/components/magic-request/pricing-manager';
import ContainerSizeManager from '@/components/container-size/container-size-manager';
import { getCommunityCreations } from '@/lib/storefront-appsync';

export default function MagicRequestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  
  const activeTab = searchParams.get('tab') || 'overview';

  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const result = await getCommunityCreations(50, undefined, 'PENDING');
        setPendingCount(result.items?.length || 0);
      } catch (error) {
        console.error('Error loading pending count:', error);
      }
    };
    loadPendingCount();
  }, []);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'fragrances', label: 'Fragrances' },
    { value: 'ingredients', label: 'Ingredients' },
    { value: 'pricing', label: 'Pricing' },
    { value: 'reviews', label: 'Reviews', badge: pendingCount > 0 ? pendingCount : null },
    { value: 'logs', label: 'Logs' }
  ];

  return (
    <AuthWrapper>
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your custom candle ordering system with smart validation and review.
          </p>
        </div>

        <div className="space-y-6">
          {/* Desktop tabs */}
          <div className="hidden sm:block">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-6">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="relative">
                    {tab.label}
                    {tab.badge && (
                      <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                        {tab.badge}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          {/* Mobile dropdown navigation - using Shadcn Select */}
          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={handleTabChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tabs.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    <div className="flex items-center justify-between w-full">
                      {tab.label}
                      {tab.badge && (
                        <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                          {tab.badge}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tab content with fade animation */}
          <div className="motion-safe:animate-in fade-in duration-200">
            {activeTab === 'overview' && <MagicRequestOverview />}
            {activeTab === 'fragrances' && <MagicRequestFragrances />}
            {activeTab === 'ingredients' && <ContainerSizeManager />}
            {activeTab === 'pricing' && <PricingManager />}
            {activeTab === 'reviews' && <MagicRequestReviews />}
            {activeTab === 'logs' && <MagicRequestLogs />}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}
