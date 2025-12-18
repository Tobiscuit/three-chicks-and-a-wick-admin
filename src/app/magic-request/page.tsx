'use client';

import { useState } from 'react';
import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function MagicRequestPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'fragrances', label: 'Fragrances' },
    { value: 'ingredients', label: 'Ingredients' },
    { value: 'pricing', label: 'Pricing' },
    { value: 'reviews', label: 'Reviews' },
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
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          {/* Mobile dropdown navigation - using Shadcn Select */}
          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tabs.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    {tab.label}
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
