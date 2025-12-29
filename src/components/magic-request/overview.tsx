'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getFeatureFlag, setFeatureFlag, getCommunityCreations } from '@/lib/storefront-appsync';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Shield, 
  Sparkles,
  Package,
  TrendingUp,
  RefreshCw,
  Settings,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  pendingReviews: number;
  totalOrders: number;
  securityBlocks: number;
  loading: boolean;
}

export function MagicRequestOverview() {
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [stats, setStats] = useState<Stats>({ 
    pendingReviews: 0, 
    totalOrders: 0, 
    securityBlocks: 0, 
    loading: true 
  });

  useEffect(() => {
    loadFeatureFlag();
    loadStats();
  }, []);

  const loadFeatureFlag = async () => {
    try {
      setLoading(true);
      const flag = await getFeatureFlag('magic-request-enabled');
      setIsEnabled(flag?.value ?? false);
    } catch (error) {
      console.error('Error loading feature flag:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load Magic Request status.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));
      
      // Get pending reviews count
      const pendingResult = await getCommunityCreations(50, undefined, 'PENDING');
      const pendingCount = pendingResult.items?.length || 0;
      
      // For now, we'll use placeholder for total orders since that requires Shopify API
      // Security blocks would need to query DynamoDB for blocked jobs
      
      setStats({
        pendingReviews: pendingCount,
        totalOrders: 0, // TODO: Wire up from Shopify orders with custom candle tag
        securityBlocks: 0, // TODO: Wire up from DynamoDB blocked jobs
        loading: false
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleToggle = async (checked: boolean) => {
    try {
      setUpdating(true);
      await setFeatureFlag('magic-request-enabled', checked);
      setIsEnabled(checked);
      
      toast({
        title: checked ? 'Magic Request Enabled' : 'Magic Request Disabled',
        description: checked
          ? 'The storefront will show the Magic Request form after rebuild.'
          : 'The Magic Request form will be hidden after rebuild.',
      });
    } catch (error) {
      console.error('Error updating feature flag:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update Magic Request status. Please try again.',
      });
      setIsEnabled(!checked);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Loading Dashboard...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards - Most Important, Show First! */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
        {/* Pending Reviews - Action Required */}
        <Link href="/magic-request?tab=reviews">
          <Card className={cn(
            "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300",
            "hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer",
            stats.pendingReviews > 0 && "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Reviews
              </CardTitle>
              <Clock className={cn("h-5 w-5", stats.pendingReviews > 0 ? "text-amber-500" : "text-muted-foreground")} />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold tabular-nums tracking-tight">
                {stats.loading ? '—' : stats.pendingReviews}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {stats.pendingReviews > 0 ? (
                  <>
                    <span className="text-amber-600 font-medium">Needs attention</span>
                    <ExternalLink className="h-3 w-3" />
                  </>
                ) : (
                  'All caught up!'
                )}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Today's Custom Candles */}
        <Card className={cn(
          "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75",
          "hover:shadow-md hover:border-primary/20 transition-all"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custom Orders
            </CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tabular-nums tracking-tight">
              {stats.loading ? '—' : (
                <span className="text-muted-foreground/50">—</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              See Orders page for details
            </p>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className={cn(
          "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-150",
          "hover:shadow-md hover:border-primary/20 transition-all",
          isEnabled ? "border-green-500/30" : "border-slate-500/30"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Status
            </CardTitle>
            <Activity className={cn("h-5 w-5", isEnabled ? "text-green-500" : "text-slate-400")} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-3 h-3 rounded-full",
                isEnabled ? "bg-green-500 animate-pulse" : "bg-slate-400"
              )} />
              <span className="text-2xl font-bold">
                {isEnabled ? 'Active' : 'Paused'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isEnabled ? 'Accepting custom candle orders' : 'Custom candles disabled'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* View Reviews */}
        <Link href="/magic-request?tab=reviews">
          <Card className={cn(
            "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-200",
            "hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group"
          )}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-amber-100 dark:bg-amber-900/30 p-4 group-hover:scale-110 transition-transform">
                  <Sparkles className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Review Shared Creations</h3>
                  <p className="text-sm text-muted-foreground">
                    Approve customer creations to add them to your store
                  </p>
                </div>
                <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Manage Fragrances */}
        <Link href="/magic-request?tab=fragrances">
          <Card className={cn(
            "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-250",
            "hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group"
          )}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-purple-100 dark:bg-purple-900/30 p-4 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Manage Inventory</h3>
                  <p className="text-sm text-muted-foreground">
                    Update fragrance stock levels and availability
                  </p>
                </div>
                <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Settings Section - Less Prominent Toggle */}
      <Card className={cn(
        "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-300",
        "hover:shadow-md hover:border-primary/20 transition-all"
      )}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-semibold tracking-tight flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Magic Request Settings
              </CardTitle>
              <CardDescription className="mt-2">
                Control availability of the custom candle feature
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-4 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-medium flex items-center gap-2">
                  Accept Custom Candle Orders
                  <Badge variant={isEnabled ? 'default' : 'secondary'} className={isEnabled ? 'bg-green-700/20 text-green-500 border-green-700/30' : ''}>
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isEnabled 
                    ? 'Customers can create custom candles on your storefront'
                    : 'Custom candle ordering is currently disabled'}
                </p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggle}
                disabled={updating}
              />
            </div>
            
            {/* Rebuild Notice */}
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-medium text-amber-800 dark:text-amber-200">Note:</span>
                  <span className="text-amber-700 dark:text-amber-300"> Changes may require a storefront rebuild to take effect. The site is optimized for speed with static generation.</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Control Info - Collapsed by Default */}
      <details className="group">
        <summary className="cursor-pointer list-none">
          <Card className={cn(
            "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-350",
            "hover:shadow-md hover:border-primary/20 transition-all"
          )}>
            <CardHeader>
              <CardTitle className="font-semibold tracking-tight flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  How Quality Control Works
                </div>
                <span className="text-sm font-normal text-muted-foreground group-open:hidden">
                  Click to expand
                </span>
              </CardTitle>
            </CardHeader>
          </Card>
        </summary>
        <div className="mt-2 p-6 rounded-lg border bg-card">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <span className="font-semibold text-primary">1</span>
              </div>
              <div>
                <h4 className="font-semibold">Smart Processing</h4>
                <p className="text-sm text-muted-foreground">
                  Our AI understands customer requests and creates detailed candle specifications
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <span className="font-semibold text-primary">2</span>
              </div>
              <div>
                <h4 className="font-semibold">Security Check</h4>
                <p className="text-sm text-muted-foreground">
                  Every order passes through safety filters to ensure appropriate content
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <span className="font-semibold text-primary">3</span>
              </div>
              <div>
                <h4 className="font-semibold">Your Review</h4>
                <p className="text-sm text-muted-foreground">
                  Shared creations need your approval before becoming available for others to purchase
                </p>
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
