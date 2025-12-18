'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AlertTriangle, PackageX } from 'lucide-react';
import { getLowStockProducts, type InventoryItem } from '@/app/dashboard/inventory-actions';

export function LowStockAlert() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      const result = await getLowStockProducts(10);
      if (result.success) {
        setItems(result.items);
      } else {
        setError(result.error || 'Failed to load inventory');
      }
      setLoading(false);
    }
    fetchItems();
  }, []);

  // Don't render if no low stock items and not loading
  if (!loading && items.length === 0 && !error) {
    return null;
  }

  return (
    <Card className={cn(
      "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-500",
      "hover:shadow-md hover:border-primary/20 transition-all",
      items.length > 0 && "border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn(
              "h-5 w-5",
              items.length > 0 ? "text-red-500" : "text-muted-foreground"
            )} />
            <CardTitle className="font-semibold tracking-tight">Low Stock Alert</CardTitle>
          </div>
          {!loading && items.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {items.length} low
            </Badge>
          )}
        </div>
        <CardDescription>
          Products with less than 10 units in stock
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-8" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <PackageX className="h-4 w-4" />
            <span className="text-sm">Could not load inventory data</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-600">
            <span className="text-sm">All products well stocked! ✓</span>
          </div>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 5).map((item) => {
              const isCritical = item.inventoryQuantity <= 3;

              return (
                <Link
                  href={`/products/${item.productHandle}`}
                  key={`${item.productId}-${item.variantTitle}`}
                  className={cn(
                    "flex items-center gap-3 p-2 -mx-2 rounded-lg",
                    "hover:bg-muted/50 transition-colors cursor-pointer"
                  )}
                >
                  {/* Product Image */}
                  <div className="relative h-10 w-10 flex-shrink-0 rounded overflow-hidden bg-muted">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productTitle}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <PackageX className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productTitle}</p>
                    {item.variantTitle !== 'Default Title' && (
                      <p className="text-xs text-muted-foreground truncate">{item.variantTitle}</p>
                    )}
                  </div>

                  {/* Stock Badge */}
                  <Badge 
                    variant={isCritical ? "destructive" : "outline"} 
                    className={cn(
                      "tabular-nums",
                      !isCritical && "border-amber-500/50 text-amber-600"
                    )}
                  >
                    {item.inventoryQuantity}
                  </Badge>
                </Link>
              );
            })}
            {items.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{items.length - 5} more items low on stock
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
