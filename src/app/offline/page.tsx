'use client';

import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Offline fallback page
 * Shown when user navigates while offline and page isn't cached
 */
export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-4">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="p-4 rounded-full bg-muted">
          <WifiOff className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">You&apos;re Offline</h1>
          <p className="text-muted-foreground">
            It looks like you&apos;ve lost your internet connection. 
            Some features may be unavailable until you&apos;re back online.
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
          <Button 
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Previously visited pages may still be available from cache.
        </p>
      </div>
    </div>
  );
}
