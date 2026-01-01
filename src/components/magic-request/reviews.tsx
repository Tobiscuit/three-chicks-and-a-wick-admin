'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clock, Eye, CheckCircle, XCircle, Loader2, Sparkles } from 'lucide-react';
import type { CommunityItem } from '@/lib/storefront-appsync';
import { getCommunityCreations, approveSharedCandle, rejectSharedCandle } from '@/lib/storefront-appsync';

export function MagicRequestReviews() {
  const { toast } = useToast();
  const [sharedCandles, setSharedCandles] = useState<CommunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCandle, setPreviewCandle] = useState<CommunityItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    loadSharedCandles();
  }, []);

  const loadSharedCandles = async () => {
    try {
      setLoading(true);
      // Only show PENDING candles in review queue
      const result = await getCommunityCreations(50, undefined, 'PENDING');
      setSharedCandles(result.items);
    } catch (error) {
      console.error('Error loading shared candles:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load shared candles. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (candle: CommunityItem) => {
    console.log('Opening preview for:', candle.jobId);
    setPreviewCandle(candle);
    setIsPreviewOpen(true);
  };

  const handleApprove = async (candle: CommunityItem) => {
    try {
      await approveSharedCandle(candle.jobId);
      
      toast({
        title: 'Candle Approved',
        description: `${candle.candleName || 'Candle'} has been approved and is now public.`,
      });

      // Refresh the list (remove approved candle)
      await loadSharedCandles();
    } catch (error) {
      console.error('Error approving candle:', error);
      toast({
        variant: 'destructive',
        title: 'Approval Failed',
        description: error instanceof Error ? error.message : 'Failed to approve candle. Please try again.',
      });
    }
  };

  const handleReject = async (candle: CommunityItem) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    try {
      await rejectSharedCandle(candle.jobId, reason || undefined);
      
      toast({
        title: 'Candle Rejected',
        description: `${candle.candleName || 'Candle'} has been rejected and hidden from community.`,
      });

      // Refresh the list (remove rejected candle)
      await loadSharedCandles();
    } catch (error) {
      console.error('Error rejecting candle:', error);
      toast({
        variant: 'destructive',
        title: 'Rejection Failed',
        description: error instanceof Error ? error.message : 'Failed to reject candle. Please try again.',
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Reviews...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading shared candles for review...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className={cn(
        "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300",
        "hover:shadow-md hover:border-primary/20 transition-all"
      )}>
        <CardHeader>
          <CardTitle className="font-semibold tracking-tight flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Manual Review Queue
          </CardTitle>
          <CardDescription>
            Review and approve custom candles that users want to share with the community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{sharedCandles.length}</Badge>
              <span className="text-sm text-muted-foreground">pending review</span>
            </div>
            <Button variant="outline" size="sm" onClick={loadSharedCandles}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shared Candles List */}
      {sharedCandles.length === 0 ? (
        <Card className={cn(
          "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75",
          "hover:shadow-md hover:border-primary/20 transition-all"
        )}>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                There are no shared candles pending review at this time. When customers share their
                custom creations, they'll appear here for your approval.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sharedCandles.map((candle, index) => (
            <Card key={candle.jobId} className={cn(
              "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300",
              "hover:shadow-md hover:border-primary/20 transition-all",
              index === 0 && "delay-75",
              index === 1 && "delay-150",
              index >= 2 && "delay-200"
            )}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="font-semibold tracking-tight flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      {candle.candleName || 'Untitled Candle'}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Created: {formatDate(candle.createdAt)}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="animate-pulse">Pending</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(candle)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleApprove(candle)}
                    className="bg-green-700 hover:bg-green-800"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleReject(candle)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Creation: {previewCandle?.candleName || 'Untitled'}</DialogTitle>
            <DialogDescription>
              Review the auto-generated recipe and story before approving.
            </DialogDescription>
          </DialogHeader>

          {previewCandle && (
            <div className="space-y-6">
              {/* Metadata */}
              <div className="rounded-lg border p-4 bg-slate-50 dark:bg-slate-900/50">
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Created At</span>
                <span className="font-medium">{formatDate(previewCandle.createdAt)}</span>
              </div>

              {/* Description / Story */}
              {previewCandle.description && (
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    AI Generation (Story)
                  </h4>
                  <p className="text-sm text-foreground/90 leading-relaxed italic">
                    "{previewCandle.description}"
                  </p>
                </div>
              )}

              {/* Fragrance Recipe - MOST IMPORTANT */}
              {previewCandle.fragrances && previewCandle.fragrances.length > 0 ? (
                <div className="rounded-lg border p-4 space-y-3 bg-amber-50/50 dark:bg-amber-950/20">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    🧪 Fragrance Recipe
                  </h4>
                  <div className="space-y-2">
                    {previewCandle.fragrances.map((frag, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded border shadow-sm">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base">{frag.name}</span>
                            {frag.category && (
                              <Badge variant="secondary" className="text-xs">
                                {frag.category}
                              </Badge>
                            )}
                          </div>
                          {frag.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{frag.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="font-bold text-xl text-amber-600 dark:text-amber-400">
                            {frag.percentage ? `${frag.percentage}%` : '—'}
                            </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                    No structured fragrance recipe available.
                </div>
              )}

              {/* Technical Details */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  🏭 Technical Specs
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Wax</span>
                    <p className="font-medium">{previewCandle.wax || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Wick</span>
                    <p className="font-medium">{previewCandle.wick || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Container</span>
                    <p className="font-medium">{previewCandle.container || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Burn Time</span>
                    <p className="font-medium">{previewCandle.burnTime || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Mood/Vibe */}
              {previewCandle.mood && (
                <div className="rounded-lg border p-4 bg-purple-50/50 dark:bg-purple-950/20">
                  <h4 className="text-sm font-semibold mb-2">✨ Vibe Check</h4>
                  <p className="text-sm text-foreground">{previewCandle.mood}</p>
                </div>
              )}


              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="default"
                  onClick={() => {
                    handleApprove(previewCandle);
                    setIsPreviewOpen(false);
                  }}
                  className="bg-green-700 hover:bg-green-800"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleReject(previewCandle);
                    setIsPreviewOpen(false);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

