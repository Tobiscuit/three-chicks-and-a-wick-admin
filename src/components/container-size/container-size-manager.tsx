'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ContainerSize,
  IngredientInventory,
  getMockIngredientInventory,
  updateIngredientInventory,
} from '@/services/container-size-management';
import { useToast } from '@/hooks/use-toast';
import { fetchMagicRequestIngredients } from '@/app/magic-request/ingredients-actions';
import { getAvailableVariantCombosAction, type VariantCombination } from '@/app/magic-request/pricing-actions';
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
      const result = await getAvailableVariantCombosAction();
      if (result.success && result.data) {
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
      <Card>
        <CardHeader>
          <CardTitle>Available Options (from Shopify)</CardTitle>
          <CardDescription>
            Current wax types, wick types, and containers configured in your Shopify store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingIngredients ? (
            <p className="text-sm text-muted-foreground">Loading from Shopify...</p>
          ) : shopifyIngredients ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Choose Your Wax</h4>
                <div className="flex flex-wrap gap-2">
                  {shopifyIngredients.waxTypes.map((wax) => (
                    <Badge key={wax} variant="secondary" className="px-3 py-1.5 text-sm">
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
                    <Badge key={wick} variant="secondary" className="px-3 py-1.5 text-sm">
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
                    <Badge key={container} variant="secondary" className="px-3 py-1.5 text-sm">
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

      <Card>
        <CardHeader>
          <CardTitle>Container-Size Management</CardTitle>
          <CardDescription>
            Manage ingredient inventory and container-size availability for custom candles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalVariants}</div>
              <div className="text-sm text-gray-600">Total Variant Combos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{uniqueContainers.size}</div>
              <div className="text-sm text-gray-600">Unique Containers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {uniqueWaxes.size} × {uniqueWicks.size}
              </div>
              <div className="text-sm text-gray-600">Wax × Wick Options</div>
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

      <Card>
        <CardHeader>
          <CardTitle>Update Ingredient Inventory</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Available Variants</CardTitle>
          <CardDescription>
            Variants that can be made with current inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingVariants ? (
            <p className="text-sm text-muted-foreground">
              Calculating variant combinations...
            </p>
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
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">{variant.container}</TableCell>
                        <TableCell>{variant.wax}</TableCell>
                        <TableCell>{variant.wick}</TableCell>
                        <TableCell className="text-right">${variant.price}</TableCell>
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
