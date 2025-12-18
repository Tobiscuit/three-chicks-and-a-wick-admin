'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Eye, Check, X, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getPricingConfigAction,
  previewPricingChangesAction,
  applyPricingChangesAction,
} from '@/app/magic-request/pricing-actions';
import { VesselManager } from './vessel-manager';

type PricingConfig = {
  waxes: Record<string, { pricePerOzCents: number }>;
  wicks: Record<string, { costCents: number }>;
  vessels: Record<string, { baseCostCents: number; sizeOz: number; marginPct: number }>;
};

type PriceChangePreview = {
  productId: string;
  productTitle: string;
  variantId: string;
  variantTitle: string;
  currentPrice: string;
  newPrice: string;
  change: string;
  wax: string;
  wick: string;
  container: string;
};

type PricingPreview = {
  changes: PriceChangePreview[];
  summary: {
    totalVariants: number;
    variantsWithChanges: number;
    totalPriceIncrease: number;
    totalPriceDecrease: number;
  };
};

export function PricingManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [editedPrices, setEditedPrices] = useState<{
    wax?: Record<string, { pricePerOzCents: number }>;
    wick?: Record<string, { costCents: number }>;
    vessel?: Record<string, { baseCostCents: number }>;
  }>({});
  const [preview, setPreview] = useState<PricingPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmationPrice, setConfirmationPrice] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const result = await getPricingConfigAction();
      if (result.success && result.data) {
        setConfig(result.data);
      } else {
        throw new Error(result.error || 'Failed to load config');
      }
    } catch (error) {
      console.error('Error loading pricing config:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load pricing configuration',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWaxPrice = (wax: string, pricePerOz: number) => {
    setEditedPrices((prev) => ({
      ...prev,
      wax: {
        ...prev.wax,
        [wax]: { pricePerOzCents: Math.round(pricePerOz * 100) },
      },
    }));
  };

  const updateWickCost = (wick: string, cost: number) => {
    setEditedPrices((prev) => ({
      ...prev,
      wick: {
        ...prev.wick,
        [wick]: { costCents: Math.round(cost * 100) },
      },
    }));
  };

  const updateVesselBaseCost = (vessel: string, baseCost: number) => {
    setEditedPrices((prev) => ({
      ...prev,
      vessel: {
        ...prev.vessel,
        [vessel]: { baseCostCents: Math.round(baseCost * 100) },
      },
    }));
  };

  const handlePreview = async () => {
    if (!config) return;

    try {
      setPreviewLoading(true);
      const result = await previewPricingChangesAction(editedPrices);
      if (result.success && result.data) {
        setPreview(result.data);
      } else {
        throw new Error(result.error || 'Failed to preview changes');
      }
    } catch (error) {
      console.error('Error previewing changes:', error);
      toast({
        variant: 'destructive',
        title: 'Preview Failed',
        description: error instanceof Error ? error.message : 'Failed to preview changes',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    if (!preview || preview.changes.length === 0) return;

    // Show confirmation dialog
    setConfirmDialogOpen(true);
  };

  const confirmApply = async () => {
    if (!confirmationPrice) {
      toast({
        variant: 'destructive',
        title: 'Confirmation Required',
        description: 'Please type one of the new prices to confirm.',
      });
      return;
    }

    try {
      setApplying(true);
      setConfirmDialogOpen(false);

      const result = await applyPricingChangesAction(editedPrices, confirmationPrice);

      if (result.success) {
        const warningMsg = result.warnings && result.warnings.length > 0
          ? ` Some warnings: ${result.warnings.slice(0, 3).join('; ')}${result.warnings.length > 3 ? '...' : ''}`
          : '';
        
        toast({
          title: 'Prices Updated',
          description: `Successfully updated ${result.variantsUpdated} variant prices.${warningMsg}`,
          variant: result.warnings && result.warnings.length > 0 ? 'default' : undefined,
        });
        
        if (result.warnings && result.warnings.length > 0) {
          console.warn('[Pricing Update Warnings]:', result.warnings);
        }
        
        // Reload config and clear edits
        await loadConfig();
        setEditedPrices({});
        setPreview(null);
        setConfirmationPrice('');
      } else {
        throw new Error(result.error || 'Failed to apply changes');
      }
    } catch (error) {
      console.error('Error applying changes:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update prices',
      });
    } finally {
      setApplying(false);
    }
  };

  const resetChanges = () => {
    setEditedPrices({});
    setPreview(null);
    setConfirmationPrice('');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className={cn(
          "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300"
        )}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!config) {
    return (
      <Card className={cn(
        "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300"
      )}>
        <CardHeader>
          <CardTitle className="font-semibold tracking-tight">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load pricing configuration.</p>
        </CardContent>
      </Card>
    );
  }

  const hasChanges = Object.keys(editedPrices.wax || {}).length > 0 ||
                     Object.keys(editedPrices.wick || {}).length > 0 ||
                     Object.keys(editedPrices.vessel || {}).length > 0;

  // Get unique new prices for confirmation hint
  const uniqueNewPrices = preview
    ? Array.from(new Set(preview.changes.map(c => c.newPrice))).sort()
    : [];

  return (
    <div className="space-y-6">
      {/* Vessel Management */}
      <VesselManager />

      {/* Current Pricing */}
      <Card className={cn(
        "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75",
        "hover:shadow-md hover:border-primary/20 transition-all"
      )}>
        <CardHeader>
          <CardTitle className="font-semibold tracking-tight flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Current Pricing
          </CardTitle>
          <CardDescription>
            Edit prices below. Changes will affect all variants with that ingredient.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Wax Prices */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Wax Prices (per ounce)</Label>
            <div className="space-y-3">
              {Object.entries(config.waxes).map(([wax, { pricePerOzCents }]) => {
                const edited = editedPrices.wax?.[wax];
                const currentPrice = pricePerOzCents / 100;
                const displayPrice = edited ? edited.pricePerOzCents / 100 : currentPrice;
                const hasEdit = edited !== undefined;

                return (
                  <div key={wax} className="flex items-center gap-4">
                    <Label className="w-32">{wax}</Label>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={displayPrice}
                        onChange={(e) => updateWaxPrice(wax, parseFloat(e.target.value) || 0)}
                        className={`w-32 ${hasEdit ? 'border-orange-500' : ''}`}
                      />
                      <span className="text-sm text-muted-foreground">/ oz</span>
                      {hasEdit && (
                        <Badge variant="secondary" className="bg-orange-50">
                          Changed
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wick Costs */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Wick Costs</Label>
            <div className="space-y-3">
              {Object.entries(config.wicks).map(([wick, { costCents }]) => {
                const edited = editedPrices.wick?.[wick];
                const currentCost = costCents / 100;
                const displayCost = edited ? edited.costCents / 100 : currentCost;
                const hasEdit = edited !== undefined;

                return (
                  <div key={wick} className="flex items-center gap-4">
                    <Label className="w-32">{wick}</Label>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={displayCost}
                        onChange={(e) => updateWickCost(wick, parseFloat(e.target.value) || 0)}
                        className={`w-32 ${hasEdit ? 'border-orange-500' : ''}`}
                      />
                      {hasEdit && (
                        <Badge variant="secondary" className="bg-orange-50">
                          Changed
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vessel Base Costs */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Vessel Base Costs</Label>
            <div className="space-y-3">
              {Object.entries(config.vessels).map(([vessel, { baseCostCents }]) => {
                const edited = editedPrices.vessel?.[vessel];
                const currentCost = baseCostCents / 100;
                const displayCost = edited ? edited.baseCostCents / 100 : currentCost;
                const hasEdit = edited !== undefined;

                return (
                  <div key={vessel} className="flex items-center gap-4">
                    <Label className="w-48">{vessel}</Label>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={displayCost}
                        onChange={(e) => updateVesselBaseCost(vessel, parseFloat(e.target.value) || 0)}
                        className={`w-32 ${hasEdit ? 'border-orange-500' : ''}`}
                      />
                      {hasEdit && (
                        <Badge variant="secondary" className="bg-orange-50">
                          Changed
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handlePreview}
              disabled={!hasChanges || previewLoading}
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewLoading ? 'Previewing...' : 'Preview Changes'}
            </Button>
            {hasChanges && (
              <Button onClick={resetChanges} variant="ghost">
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {preview && preview.changes.length > 0 && (
        <Card className={cn(
          "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-150",
          "hover:shadow-md hover:border-primary/20 transition-all"
        )}>
          <CardHeader>
            <CardTitle className="font-semibold tracking-tight flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Price Change Preview
            </CardTitle>
            <CardDescription>
              {preview.summary.variantsWithChanges} of {preview.summary.totalVariants} variants will change.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-2">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Summary:</strong> {preview.summary.variantsWithChanges} variants will update.
                  {preview.summary.totalPriceIncrease > 0 && (
                    <span className="text-green-600"> +${preview.summary.totalPriceIncrease.toFixed(2)} total increase</span>
                  )}
                  {preview.summary.totalPriceDecrease > 0 && (
                    <span className="text-red-600"> -${preview.summary.totalPriceDecrease.toFixed(2)} total decrease</span>
                  )}
                </AlertDescription>
              </Alert>
              {preview.changes.some(c => c.change.includes('⚠️')) && (
              <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Warning:</strong> Some variants have price changes &gt;50%. Please review carefully before applying.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Wax</TableHead>
                    <TableHead>Wick</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>New Price</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.changes.slice(0, 50).map((change, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{change.container}</TableCell>
                      <TableCell>{change.variantTitle}</TableCell>
                      <TableCell>{change.wax}</TableCell>
                      <TableCell>{change.wick}</TableCell>
                      <TableCell className="font-mono tabular-nums">${change.currentPrice}</TableCell>
                      <TableCell className="font-semibold font-mono tabular-nums">${change.newPrice}</TableCell>
                      <TableCell>
                        <Badge variant={change.change.startsWith('+') ? 'default' : 'secondary'}>
                          {change.change}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {preview.changes.length > 50 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing first 50 of {preview.changes.length} changes
                </p>
              )}
            </div>

            <div className="mt-4">
              <Button
                onClick={handleApply}
                disabled={applying}
                className="w-full"
              >
                {applying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Applying Changes...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Apply Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Price Changes</DialogTitle>
            <DialogDescription>
              Type one of the new prices below to confirm you want to update {preview?.summary.variantsWithChanges || 0} variant prices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type one of these new prices to confirm:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {uniqueNewPrices.slice(0, 5).map((price) => (
                  <Badge key={price} variant="secondary">${price}</Badge>
                ))}
                {uniqueNewPrices.length > 5 && (
                  <Badge variant="secondary">... and {uniqueNewPrices.length - 5} more</Badge>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="confirmation-price">Confirmation Price</Label>
              <Input
                id="confirmation-price"
                type="text"
                placeholder="e.g., 24.50"
                value={confirmationPrice}
                onChange={(e) => setConfirmationPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmApply}
              disabled={!confirmationPrice || applying}
            >
              {applying ? 'Applying...' : 'Confirm & Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

