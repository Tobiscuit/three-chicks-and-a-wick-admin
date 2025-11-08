'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
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
import { getPricingConfigAction } from '@/app/magic-request/pricing-actions';
import { addVesselAction, checkVesselExistsAction } from '@/app/magic-request/vessel-actions';

type Vessel = {
  name: string; // e.g., "Mason Jar"
  sizeOz: number; // e.g., 16
  baseCostCents: number;
  marginPct: number;
  supplier?: string;
  status?: 'enabled' | 'disabled' | 'deleted';
};

/**
 * Convert string to Pascal Case
 * Examples: "mason jar" → "Mason Jar", "metal tin" → "Metal Tin"
 */
function toPascalCase(str: string): string {
  return str
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

/**
 * Extract vessel name from product title
 * "Mason Jar 16oz" → "Mason Jar"
 */
function extractVesselName(title: string): string {
  const match = title.match(/^(.+?)\s+\d+oz$/i);
  return match ? match[1].trim() : title;
}

/**
 * Extract size from product title
 * "Mason Jar 16oz" → 16
 */
function extractSizeOz(title: string): number | null {
  const match = title.match(/(\d+)oz/i);
  return match ? parseInt(match[1], 10) : null;
}

export function VesselManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [vessels, setVessels] = useState<Record<string, Vessel>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVessel, setEditingVessel] = useState<{ name: string; sizeOz: number } | null>(null);
  
  // Form state
  const [vesselName, setVesselName] = useState('');
  const [sizeOz, setSizeOz] = useState<number | ''>('');
  const [baseCost, setBaseCost] = useState('');
  const [marginPct, setMarginPct] = useState('');
  const [supplier, setSupplier] = useState('');

  useEffect(() => {
    loadVessels();
  }, []);

  const loadVessels = async () => {
    try {
      setLoading(true);
      const result = await getPricingConfigAction();
      if (result.success && result.data?.vessels) {
        const transformed: Record<string, Vessel> = {};
        for (const [key, config] of Object.entries(result.data.vessels)) {
          const match = key.match(/^(.+?)\s+(\d+)oz$/i);
          const name = match ? match[1] : key;
          const size = match ? parseInt(match[2], 10) : config.sizeOz;

          transformed[key] = {
            name,
            sizeOz: size,
            baseCostCents: config.baseCostCents,
            marginPct: config.marginPct,
          };
        }
        setVessels(transformed);
      }
    } catch (error) {
      console.error('Error loading vessels:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load vessels',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (vesselKey?: string) => {
    if (vesselKey) {
      const vessel = vessels[vesselKey];
      if (vessel) {
        setEditingVessel({ name: vessel.name, sizeOz: vessel.sizeOz });
        setVesselName(vessel.name);
        setSizeOz(vessel.sizeOz);
        setBaseCost((vessel.baseCostCents / 100).toFixed(2));
        setMarginPct(vessel.marginPct.toString());
        setSupplier(vessel.supplier || '');
      }
    } else {
      setEditingVessel(null);
      setVesselName('');
      setSizeOz('');
      setBaseCost('');
      setMarginPct('');
      setSupplier('');
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingVessel(null);
    setVesselName('');
    setSizeOz('');
    setBaseCost('');
    setMarginPct('');
    setSupplier('');
  };

  // Auto-format vessel name to Pascal Case as user types
  const handleVesselNameChange = (value: string) => {
    setVesselName(value);
  };

  const handleVesselNameBlur = () => {
    if (vesselName.trim()) {
      const formatted = toPascalCase(vesselName);
      setVesselName(formatted);
    }
  };

  // Real-time validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Validate vessel name (check for duplicates in real-time)
  useEffect(() => {
    const validate = async () => {
      const errors: Record<string, string> = {};
      
      if (vesselName.trim() && sizeOz) {
        const formattedName = toPascalCase(vesselName);
        const vesselKey = `${formattedName} ${sizeOz}oz`;
        
        // Check if editing the same vessel (skip duplicate check)
        if (!editingVessel || `${editingVessel.name} ${editingVessel.sizeOz}oz` !== vesselKey) {
          // Check if duplicate exists
          const exists = vessels[vesselKey];
          if (exists) {
            errors.duplicate = `Vessel "${vesselKey}" already exists`;
          }
        }
      }
      
      setValidationErrors(errors);
    };
    
    // Debounce validation
    const timeoutId = setTimeout(validate, 500);
    return () => clearTimeout(timeoutId);
  }, [vesselName, sizeOz, editingVessel, vessels]);

  const handleSubmit = async () => {
    // Validation
    if (!vesselName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Vessel name is required',
      });
      return;
    }

    if (!sizeOz || sizeOz <= 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Size must be greater than 0',
      });
      return;
    }

    const baseCostFloat = parseFloat(baseCost);
    if (isNaN(baseCostFloat) || baseCostFloat < 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Base cost must be a valid number',
      });
      return;
    }

    const marginFloat = parseFloat(marginPct);
    if (isNaN(marginFloat) || marginFloat < 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Margin percentage must be a valid number',
      });
      return;
    }

    // Check for duplicates (same name + size combination)
    const formattedName = toPascalCase(vesselName);
    const vesselKey = `${formattedName} ${sizeOz}oz`;
    
    if (!editingVessel && vessels[vesselKey]) {
      toast({
        variant: 'destructive',
        title: 'Duplicate Vessel',
        description: `A vessel "${vesselKey}" already exists`,
      });
      return;
    }

    // If editing, check if new combination conflicts
    if (editingVessel) {
      const oldKey = `${editingVessel.name} ${editingVessel.sizeOz}oz`;
      if (vesselKey !== oldKey && vessels[vesselKey]) {
        toast({
          variant: 'destructive',
          title: 'Duplicate Vessel',
          description: `A vessel "${vesselKey}" already exists`,
        });
        return;
      }
    }

    // Deploy vessel immediately to Shopify
    try {
      const result = await addVesselAction({
        name: toPascalCase(vesselName),
        sizeOz: sizeOz as number,
        baseCostCents: Math.round(baseCostFloat * 100),
        marginPct: marginFloat,
        supplier: supplier.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: 'Vessel Created',
          description: `${toPascalCase(vesselName)} ${sizeOz}oz has been created in Shopify`,
        });
        
        // Reload vessels list
        await loadVessels();
        handleCloseDialog();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to create vessel',
        });
      }
    } catch (error) {
      console.error('Error creating vessel:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create vessel',
      });
    }
  };

  if (loading) {
    return <div>Loading vessels...</div>;
  }

  const vesselEntries = Object.entries(vessels);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Vessel Management</CardTitle>
              <CardDescription>
                Manage candle vessels (containers with sizes). Each vessel represents a specific container type and size combination.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vessel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {vesselEntries.length === 0 ? (
            <Alert>
              <AlertDescription>
                No vessels configured. Add your first vessel to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vessel Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Base Cost</TableHead>
                  <TableHead>Margin %</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vesselEntries.map(([key, vessel]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{vessel.name}</TableCell>
                    <TableCell>{vessel.sizeOz} oz</TableCell>
                    <TableCell>${(vessel.baseCostCents / 100).toFixed(2)}</TableCell>
                    <TableCell>{vessel.marginPct}%</TableCell>
                    <TableCell>{vessel.supplier || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(key)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement delete
                            toast({
                              title: 'Not Implemented',
                              description: 'Delete functionality needs to be implemented',
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingVessel ? 'Edit Vessel' : 'Add New Vessel'}
            </DialogTitle>
            <DialogDescription>
              {editingVessel
                ? 'Update the vessel details. Note: Changing name or size will create a new vessel product in Shopify.'
                : 'Add a new vessel. The name will be auto-formatted (e.g., "mason jar" → "Mason Jar").'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vessel-name">Vessel Name *</Label>
              <Input
                id="vessel-name"
                placeholder="e.g., mason jar"
                value={vesselName}
                onChange={(e) => handleVesselNameChange(e.target.value)}
                onBlur={handleVesselNameBlur}
                className={validationErrors.duplicate ? 'border-red-500' : ''}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Will be formatted to Pascal Case (e.g., "Mason Jar")
                </p>
                {validationErrors.duplicate && (
                  <p className="text-xs text-red-500">{validationErrors.duplicate}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="size-oz">Size (oz) *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="size-oz"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="16"
                  value={sizeOz}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : '';
                    setSizeOz(val);
                  }}
                  className={`flex-1 ${!sizeOz || sizeOz <= 0 ? 'border-orange-500' : ''}`}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap font-medium">oz</span>
              </div>
              {(!sizeOz || sizeOz <= 0) && vesselName && (
                <p className="text-xs text-orange-500">Size must be a positive number</p>
              )}
              {sizeOz && sizeOz > 0 && (
                <p className="text-xs text-muted-foreground">
                  The size in ounces for this vessel
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="base-cost">Base Cost ($) *</Label>
              <Input
                id="base-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="7.99"
                value={baseCost}
                onChange={(e) => setBaseCost(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Cost of the empty vessel in dollars
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="margin">Margin (%) *</Label>
              <Input
                id="margin"
                type="number"
                min="0"
                step="0.1"
                placeholder="20"
                value={marginPct}
                onChange={(e) => setMarginPct(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Markup percentage applied to base cost
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier (Optional)</Label>
              <Input
                id="supplier"
                placeholder="e.g., Wellington Fragrance Company"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>

            {vesselName && sizeOz && (
              <Alert>
                <Package className="h-4 w-4" />
                <AlertDescription>
                  <strong>Preview:</strong> This will create/update a product: <strong>{toPascalCase(vesselName)} {sizeOz}oz</strong>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={Object.keys(validationErrors).length > 0 || !vesselName.trim() || !sizeOz || sizeOz <= 0}
            >
              {editingVessel ? 'Update Vessel' : 'Create Vessel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

