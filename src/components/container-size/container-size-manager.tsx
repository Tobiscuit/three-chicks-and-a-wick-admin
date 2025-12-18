'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ContainerSize,
  IngredientInventory,
  getMockIngredientInventory,
  updateIngredientInventory,
} from '@/services/container-size-management';
import { useToast } from '@/hooks/use-toast';
import { fetchMagicRequestIngredients } from '@/app/magic-request/ingredients-actions';
import { getAvailableVariantCombosAction, type VariantCombination } from '@/app/magic-request/pricing-actions';
import { Package, Layers, FlaskConical } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ContainerSizeManager() {
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState<IngredientInventory>(getMockIngredientInventory());
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [shopifyIngredients, setShopifyIngredients] = useState<{
    waxTypes: string[];
    wickTypes: string[];
    containers: string[];
  } | null>(null);
  const [shopifyVariants, setShopifyVariants] = useState<VariantCombination[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<{
    type: 'wax' | 'containerSize' | 'wick';
    name: string;
    quantity: number;
    costPerUnit: number;
    supplier: string;
  } | null>(null);

  // Load ingredients from Shopify on mount
  useEffect(() => {
    loadIngredientsFromShopify();
    loadShopifyVariants();
  }, []);

  const loadIngredientsFromShopify = async () => {
    try {
      setLoadingIngredients(true);
      const result = await fetchMagicRequestIngredients();
      
      if (result.success && result.data) {
        setShopifyIngredients(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch ingredients');
      }
    } catch (error) {
      console.error('Error loading ingredients from Shopify:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load ingredients from Shopify. Showing mock data.',
      });
    } finally {
      setLoadingIngredients(false);
    }
  };

  const loadShopifyVariants = async () => {
    try {
      setVariantError(null);
      setLoadingVariants(true);
      console.log('[Variants][Client] Requesting variant combinations...');
      const result = await getAvailableVariantCombosAction();
      if (result.success && result.data) {
        console.log('[Variants][Client] Received combinations:', result.data.length);
        setShopifyVariants(result.data);
      } else {
        throw new Error(result.error || 'Failed to load variant combinations');
      }
    } catch (error) {
      console.error('Error loading variant combos:', error);
      setVariantError(
        error instanceof Error
          ? error.message
          : 'Failed to load variant combinations'
      );
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleIngredientUpdate = async () => {
    if (!selectedIngredient) return;
    
    setIsLoading(true);
    try {
      await updateIngredientInventory(
        selectedIngredient.type,
        selectedIngredient.name,
        selectedIngredient.quantity,
        selectedIngredient.costPerUnit,
        selectedIngredient.supplier
      );
      
      // Update local state
      setIngredients(prev => ({
        ...prev,
        [selectedIngredient.type === 'wax' ? 'waxTypes' : 
         selectedIngredient.type === 'containerSize' ? 'containerSizes' : 'wicks']: {
          ...prev[selectedIngredient.type === 'wax' ? 'waxTypes' : 
                  selectedIngredient.type === 'containerSize' ? 'containerSizes' : 'wicks'],
          [selectedIngredient.name]: {
            quantity: selectedIngredient.quantity,
            unit: selectedIngredient.type === 'wax' ? 'pounds' : 'pieces',
            costPerUnit: selectedIngredient.costPerUnit,
            supplier: selectedIngredient.supplier
          }
        }
      }));
      
      setSelectedIngredient(null);
    } catch (error) {
      console.error('Error updating ingredient:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIngredientOptions = (type: 'wax' | 'containerSize' | 'wick') => {
    const ingredientMap = {
      wax: ingredients.waxTypes,
      containerSize: ingredients.containerSizes,
      wick: ingredients.wicks  // Fix: use 'wick' as key but access 'wicks' property
    };
    
    return Object.keys(ingredientMap[type]);
  };

  const getLowStockIngredients = () => {
    const lowStock: string[] = [];
    
    // Check wax types
    Object.entries(ingredients.waxTypes).forEach(([name, data]) => {
      if (data.quantity < 10) lowStock.push(`${name} wax`);
    });
    
    // Check container sizes
    Object.entries(ingredients.containerSizes).forEach(([name, data]) => {
      if (data.quantity < 20) lowStock.push(`${name} containers`);
    });
    
    // Check wicks
    Object.entries(ingredients.wicks).forEach(([name, data]) => {
      if (data.quantity < 50) lowStock.push(`${name} wicks`);
    });
    
    return lowStock;
  };

  const lowStockIngredients = getLowStockIngredients();
  const totalVariants = shopifyVariants.length;
  const uniqueContainers = new Set(shopifyVariants.map((variant) => variant.container));
  const uniqueWaxes = new Set(shopifyVariants.map((variant) => variant.wax));
  const uniqueWicks = new Set(shopifyVariants.map((variant) => variant.wick));

  return (
    <div className="space-y-6">
      {/* Display Shopify Ingredients */}
      <Card className={cn(
        "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300",
        "hover:shadow-md hover:border-primary/20 transition-all"
      )}>
        <CardHeader>
          <CardTitle className="font-semibold tracking-tight flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Available Options (from Shopify)
          </CardTitle>
          <CardDescription>
            Current wax types, wick types, and containers configured in your Shopify store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingIngredients ? (
            <div className="space-y-4">
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-8 w-24" />
                  ))}
                </div>
              </div>
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-8 w-24" />
                  ))}
                </div>
              </div>
            </div>
          ) : shopifyIngredients ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Choose Your Wax</h4>
                <div className="flex flex-wrap gap-2">
                  {shopifyIngredients.waxTypes.map((wax) => (
                    <Badge key={wax} variant="outline" className="px-3 py-1.5 text-sm">
                      {wax}
                    </Badge>
                  ))}
                  {shopifyIngredients.waxTypes.length === 0 && (
                    <p className="text-sm text-muted-foreground">No wax types found</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Choose Your Wick</h4>
                <div className="flex flex-wrap gap-2">
                  {shopifyIngredients.wickTypes.map((wick) => (
                    <Badge key={wick} variant="outline" className="px-3 py-1.5 text-sm">
                      {wick}
                    </Badge>
                  ))}
                  {shopifyIngredients.wickTypes.length === 0 && (
                    <p className="text-sm text-muted-foreground">No wick types found</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Choose Your Container</h4>
                <div className="flex flex-wrap gap-2">
                  {shopifyIngredients.containers.map((container) => (
                    <Badge key={container} variant="outline" className="px-3 py-1.5 text-sm">
                      {container}
                    </Badge>
                  ))}
                  {shopifyIngredients.containers.length === 0 && (
                    <p className="text-sm text-muted-foreground">No containers found</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Failed to load ingredients</p>
          )}
        </CardContent>
      </Card>

      <Card className={cn(
        "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75",
        "hover:shadow-md hover:border-primary/20 transition-all"
      )}>
        <CardHeader>
          <CardTitle className="font-semibold tracking-tight flex items-center gap-2">
            <Package className="h-5 w-5" />
            Container-Size Management
          </CardTitle>
          <CardDescription>
            Manage ingredient inventory and container-size availability for custom candles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold tabular-nums slashed-zero tracking-tight text-primary">{totalVariants}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Variant Combos</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold tabular-nums slashed-zero tracking-tight text-primary">{uniqueContainers.size}</div>
              <div className="text-sm text-muted-foreground mt-1">Unique Containers</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold tabular-nums slashed-zero tracking-tight text-primary">
                {uniqueWaxes.size} × {uniqueWicks.size}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Wax × Wick Options</div>
            </div>
          </div>

          {lowStockIngredients.length > 0 && (
            <Alert className="mb-6">
              <AlertDescription>
                <strong>Low Stock Alert:</strong> {lowStockIngredients.join(', ')} need restocking.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className={cn(
        "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-150",
        "hover:shadow-md hover:border-primary/20 transition-all"
      )}>
        <CardHeader>
          <CardTitle className="font-semibold tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Update Ingredient Inventory
          </CardTitle>
          <CardDescription>
            Update quantities and costs for individual ingredients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ingredient-type">Ingredient Type</Label>
              <Select 
                value={selectedIngredient?.type || ''} 
                onValueChange={(value) => setSelectedIngredient(prev => 
                  prev ? { ...prev, type: value as any } : null
                )}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ingredient type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wax">Wax</SelectItem>
                  <SelectItem value="containerSize">Container Size</SelectItem>
                  <SelectItem value="wick">Wick</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ingredient-name">Ingredient Name</Label>
              <Select 
                value={selectedIngredient?.name || ''} 
                onValueChange={(value) => setSelectedIngredient(prev => 
                  prev ? { ...prev, name: value } : null
                )}
                disabled={!selectedIngredient?.type}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {selectedIngredient?.type && getIngredientOptions(selectedIngredient.type).map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={selectedIngredient?.quantity || ''}
                onChange={(e) => setSelectedIngredient(prev => 
                  prev ? { ...prev, quantity: parseInt(e.target.value) || 0 } : null
                )}
                placeholder="Enter quantity"
              />
            </div>

            <div>
              <Label htmlFor="cost-per-unit">Cost Per Unit</Label>
              <Input
                id="cost-per-unit"
                type="number"
                step="0.01"
                value={selectedIngredient?.costPerUnit || ''}
                onChange={(e) => setSelectedIngredient(prev => 
                  prev ? { ...prev, costPerUnit: parseFloat(e.target.value) || 0 } : null
                )}
                placeholder="Enter cost per unit"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={selectedIngredient?.supplier || ''}
                onChange={(e) => setSelectedIngredient(prev => 
                  prev ? { ...prev, supplier: e.target.value } : null
                )}
                placeholder="Enter supplier name"
              />
            </div>
          </div>

          <Button 
            onClick={handleIngredientUpdate}
            disabled={!selectedIngredient || isLoading}
            className="w-full"
          >
            {isLoading ? 'Updating...' : 'Update Ingredient'}
          </Button>
        </CardContent>
      </Card>

      <Card className={cn(
        "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-200",
        "hover:shadow-md hover:border-primary/20 transition-all"
      )}>
        <CardHeader>
          <CardTitle className="font-semibold tracking-tight">Available Variants</CardTitle>
          <CardDescription>
            Variants that can be made with current inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingVariants ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-64" />
              <div className="rounded-md border">
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              </div>
            </div>
          ) : variantError ? (
            <Alert variant="destructive">
              <AlertDescription>{variantError}</AlertDescription>
            </Alert>
          ) : shopifyVariants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No variant combinations found. Add vessels, waxes, and wicks to Shopify to see combinations here.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {shopifyVariants.length} combinations generated from your Shopify configuration.
                </span>
                <Button variant="outline" size="sm" onClick={loadShopifyVariants}>
                  Refresh Combos
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Container</TableHead>
                      <TableHead>Wax</TableHead>
                      <TableHead>Wick</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shopifyVariants.map((variant) => (
                      <TableRow key={variant.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">{variant.container}</TableCell>
                        <TableCell>{variant.wax}</TableCell>
                        <TableCell>{variant.wick}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">${variant.price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
