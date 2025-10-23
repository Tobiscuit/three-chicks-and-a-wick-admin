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
  calculateAvailableVariants, 
  getMockIngredientInventory,
  updateIngredientInventory 
} from '@/services/container-size-management';

export default function ContainerSizeManager() {
  const [ingredients, setIngredients] = useState<IngredientInventory>(getMockIngredientInventory());
  const [availableVariants, setAvailableVariants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<{
    type: 'wax' | 'containerSize' | 'wick';
    name: string;
    quantity: number;
    costPerUnit: number;
    supplier: string;
  } | null>(null);

  // Calculate available variants when ingredients change
  useEffect(() => {
    const variants = calculateAvailableVariants(ingredients);
    setAvailableVariants(variants);
  }, [ingredients]);

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
      wicks: ingredients.wicks
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
  const canMakeCount = availableVariants.filter(v => v.canMake).length;
  const totalVariants = availableVariants.length;

  return (
    <div className="space-y-6">
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
              <div className="text-2xl font-bold text-green-600">{canMakeCount}</div>
              <div className="text-sm text-gray-600">Available Variants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalVariants}</div>
              <div className="text-sm text-gray-600">Total Variants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{lowStockIngredients.length}</div>
              <div className="text-sm text-gray-600">Low Stock Items</div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableVariants.map((variant, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">
                    {variant.wax} {variant.containerSize} {variant.wick}
                  </h4>
                  <Badge variant={variant.canMake ? 'default' : 'secondary'}>
                    {variant.canMake ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <div>Max Quantity: {variant.estimatedQuantity}</div>
                  <div>Shopify Status: {variant.inventory_quantity > 0 ? 'Enabled' : 'Disabled'}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
