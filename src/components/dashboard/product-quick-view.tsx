'use client';

import Image from 'next/image';
import Link from 'next/link';
import { SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, TrendingUp, Edit, Package } from 'lucide-react';
import type { ShopifyProduct } from '@/services/shopify';
import { cn } from '@/lib/utils';

type ProductQuickViewProps = {
  product: ShopifyProduct & { sales: number };
  onClose?: () => void;
};

export function ProductQuickView({ product, onClose }: ProductQuickViewProps) {
  const price = new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: product.priceRange.minVariantPrice.currencyCode 
  }).format(parseFloat(product.priceRange.minVariantPrice.amount));

  const revenue = new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: product.priceRange.minVariantPrice.currencyCode 
  }).format(parseFloat(product.priceRange.minVariantPrice.amount) * product.sales);

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="space-y-4">
        {/* Product Image */}
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
          <Image
            src={product.featuredImage?.url || 'https://placehold.co/400'}
            alt={product.title}
            fill
            className="object-cover"
          />
          {/* Status badge */}
          <Badge 
            variant={product.status === 'ACTIVE' ? 'default' : 'secondary'}
            className="absolute top-2 right-2"
          >
            {product.status}
          </Badge>
        </div>

        <div>
          <SheetTitle className="text-xl font-semibold tracking-tight">
            {product.title}
          </SheetTitle>
          <SheetDescription className="text-base font-mono tabular-nums">
            {price}
          </SheetDescription>
        </div>
      </SheetHeader>

      <Separator className="my-4" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={cn(
          "p-4 rounded-lg bg-muted/50",
          "motion-safe:animate-in fade-in slide-in-from-bottom-2 duration-200"
        )}>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Sales</span>
          </div>
          <p className="text-2xl font-bold tabular-nums slashed-zero">
            {product.sales}
          </p>
        </div>

        <div className={cn(
          "p-4 rounded-lg bg-muted/50",
          "motion-safe:animate-in fade-in slide-in-from-bottom-2 duration-200 delay-75"
        )}>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Revenue</span>
          </div>
          <p className="text-2xl font-bold tabular-nums slashed-zero font-mono">
            {revenue}
          </p>
        </div>
      </div>

      {/* Variants info */}
      {product.variants && product.variants.edges.length > 1 && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">
            {product.variants.edges.length} variants available
          </p>
          <div className="flex flex-wrap gap-2">
            {product.variants.edges.slice(0, 3).map((v) => (
              <Badge key={v.node.id} variant="outline" className="text-xs">
                {v.node.sku || 'Variant'}
              </Badge>
            ))}
            {product.variants.edges.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{product.variants.edges.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Actions */}
      <SheetFooter className="flex-col gap-2 sm:flex-col">
        <Button asChild className="w-full">
          <Link href={`/products/${product.id.split('/').pop()}`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Product
          </Link>
        </Button>
        <Button variant="outline" asChild className="w-full">
          <a 
            href={`https://admin.shopify.com/store/threechicksandawick/products/${product.id.split('/').pop()}`}
            target="_blank" 
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View in Shopify
          </a>
        </Button>
      </SheetFooter>
    </div>
  );
}
