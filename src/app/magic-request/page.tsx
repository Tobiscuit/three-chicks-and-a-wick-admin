'use client';

import { useState } from 'react';
import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MagicRequestOverview } from '@/components/magic-request/overview';
import { MagicRequestFragrances } from '@/components/magic-request/fragrances';
import { MagicRequestReviews } from '@/components/magic-request/reviews';
import { MagicRequestLogs } from '@/components/magic-request/logs';
import ContainerSizeManager from '@/components/container-size/container-size-manager';
import { Wand2, ChevronDown } from 'lucide-react';

export default function MagicRequestPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'fragrances', label: 'Fragrances' },
    { value: 'ingredients', label: 'Ingredients' },
    { value: 'reviews', label: 'Reviews' },
    { value: 'logs', label: 'Logs' }
  ];

  const currentTab = tabs.find(tab => tab.value === activeTab);

  return (
    <AuthWrapper>
      <div className="space-y-4 px-2 sm:px-0">
        <div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your custom candle ordering system with smart validation and review.
          </p>
        </div>

        <div className="space-y-4">
          {/* Desktop tabs */}
          <div className="hidden sm:block">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          {/* Mobile dropdown navigation */}
          <div className="sm:hidden">
            <div className="relative">
              <button
                onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
                className="w-full p-3 bg-background border border-border rounded-md flex items-center justify-between"
              >
                <span>{currentTab?.label}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {isMobileDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-10">
                  {tabs.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => {
                        setActiveTab(tab.value);
                        setIsMobileDropdownOpen(false);
                      }}
                      className="w-full p-3 text-left hover:bg-muted first:rounded-t-md last:rounded-b-md"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tab content */}
          {activeTab === 'overview' && <MagicRequestOverview />}
          {activeTab === 'fragrances' && <MagicRequestFragrances />}
          {activeTab === 'ingredients' && <ContainerSizeManager />}
          {activeTab === 'reviews' && <MagicRequestReviews />}
          {activeTab === 'logs' && <MagicRequestLogs />}
        </div>
      </div>
    </AuthWrapper>
  );
}

