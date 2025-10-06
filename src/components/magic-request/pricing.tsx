'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Save, RotateCcw, Plus, Trash2, Calculator, RefreshCw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { bulkUpdateMagicRequestPricing } from '@/app/magic-request/actions';

interface PricingConfig {
  waxPricing: {
    [key: string]: {
      pricePerOz: number;
      enabled: boolean;
    };
  };
  sizes: Array<{
    name: string;
    ounces: number;
    enabled: boolean;
    productHandle: string;
  }>;
  wickPricing: {
    [key: string]: {
      price: number;
      enabled: boolean;
    };
  };
  jarPricing: {
    [key: string]: {
      price: number;
      enabled: boolean;
    };
  };
}

export function MagicRequestPricing() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<PricingConfig | null>(null);

  // Pricing preview calculator
  const [previewSize, setPreviewSize] = useState('12');
  const [previewWax, setPreviewWax] = useState('Soy');
  const [previewWick, setPreviewWick] = useState('Cotton');
  const [previewJar, setPreviewJar] = useState('Standard Tin');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      // TODO: Call AppSync to get pricing config
      // For now, use default values
      const defaultConfig: PricingConfig = {
        waxPricing: {
          'Soy': { pricePerOz: 1.50, enabled: true },
          'Beeswax': { pricePerOz: 2.50, enabled: true },
          'Coconut Soy': { pricePerOz: 2.00, enabled: true },
        },
        sizes: [
          { name: 'The Spark', ounces: 8, enabled: true, productHandle: 'custom-candle-spark-8oz' },
          { name: 'The Flame', ounces: 12, enabled: true, productHandle: 'custom-candle-flame-12oz' },
          { name: 'The Glow', ounces: 16, enabled: true, productHandle: 'custom-candle-glow-16oz' },
        ],
        wickPricing: {
          'Cotton': { price: 0, enabled: true },
          'Hemp': { price: 0.50, enabled: true },
          'Wood': { price: 2.00, enabled: true },
        },
        jarPricing: {
          'Standard Tin': { price: 0, enabled: true },
          'Amber Glass': { price: 4.00, enabled: true },
          'Frosted Glass': { price: 4.00, enabled: true },
          'Ceramic': { price: 8.00, enabled: true },
        },
      };
      setConfig(defaultConfig);
      setOriginalConfig(JSON.parse(JSON.stringify(defaultConfig)));
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

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      // TODO: Call AppSync mutation to save pricing config
      console.log('Saving pricing config:', config);
      
      setOriginalConfig(JSON.parse(JSON.stringify(config)));
      setHasChanges(false);
      
      toast({
        title: 'Configuration Saved',
        description: 'Pricing configuration has been updated. Click "Update Shopify Variants" to apply changes.',
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to update pricing configuration',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateShopifyVariants = async () => {
    if (!config) return;

    try {
      setUpdating(true);
      
      toast({
        title: 'Updating Variants',
        description: 'Recalculating and updating Shopify variant prices...',
      });

      const result = await bulkUpdateMagicRequestPricing({
        waxPricing: config.waxPricing,
        wickPricing: config.wickPricing,
        jarPricing: config.jarPricing,
      });

      if (result.success) {
        toast({
          title: 'Variants Updated',
          description: `Successfully updated ${result.variantsUpdated} variants in ${result.apiCalls} API calls`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating variants:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update Shopify variants',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig(JSON.parse(JSON.stringify(originalConfig)));
      setHasChanges(false);
      toast({
        title: 'Changes Discarded',
        description: 'Pricing configuration reset to last saved state',
      });
    }
  };

  const calculatePreviewPrice = () => {
    if (!config) return 0;

    const sizeOz = parseInt(previewSize);
    const waxPerOz = config.waxPricing[previewWax]?.pricePerOz || 0;
    const basePrice = waxPerOz * sizeOz;
    const wickPrice = config.wickPricing[previewWick]?.price || 0;
    const jarPrice = config.jarPricing[previewJar]?.price || 0;

    return basePrice + wickPrice + jarPrice;
  };

  const updateWaxPricing = (wax: string, field: 'pricePerOz' | 'enabled', value: number | boolean) => {
    if (!config) return;
    const newConfig = { ...config };
    newConfig.waxPricing[wax] = { ...newConfig.waxPricing[wax], [field]: value };
    setConfig(newConfig);
    setHasChanges(true);
  };

  const updateWickPricing = (wick: string, field: 'price' | 'enabled', value: number | boolean) => {
    if (!config) return;
    const newConfig = { ...config };
    newConfig.wickPricing[wick] = { ...newConfig.wickPricing[wick], [field]: value };
    setConfig(newConfig);
    setHasChanges(true);
  };

  const updateJarPricing = (jar: string, field: 'price' | 'enabled', value: number | boolean) => {
    if (!config) return;
    const newConfig = { ...config };
    newConfig.jarPricing[jar] = { ...newConfig.jarPricing[jar], [field]: value };
    setConfig(newConfig);
    setHasChanges(true);
  };

  const updateSize = (index: number, field: keyof PricingConfig['sizes'][0], value: any) => {
    if (!config) return;
    const newConfig = { ...config };
    newConfig.sizes[index] = { ...newConfig.sizes[index], [field]: value };
    setConfig(newConfig);
    setHasChanges(true);
  };

  const addSize = () => {
    if (!config) return;
    const newConfig = { ...config };
    newConfig.sizes.push({
      name: 'New Size',
      ounces: 10,
      enabled: true,
      productHandle: 'custom-candle-new-10oz',
    });
    setConfig(newConfig);
    setHasChanges(true);
  };

  const removeSize = (index: number) => {
    if (!config || config.sizes.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'Cannot Delete',
        description: 'At least one size must remain',
      });
      return;
    }
    const newConfig = { ...config };
    newConfig.sizes.splice(index, 1);
    setConfig(newConfig);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading pricing configuration...</p>
        </CardContent>
      </Card>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      {hasChanges && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">You have unsaved changes</p>
              <p className="text-sm text-muted-foreground">
                Save your changes to update Magic Request pricing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleReset} disabled={saving || updating}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Discard
              </Button>
              <Button onClick={handleSave} disabled={saving || updating}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button onClick={handleUpdateShopifyVariants} disabled={updating || hasChanges} variant="secondary">
                <RefreshCw className={`h-4 w-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
                {updating ? 'Updating Variants...' : 'Update Shopify Variants'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Pricing Formula</p>
              <p className="text-sm text-muted-foreground">
                <code className="bg-background px-2 py-1 rounded text-xs">
                  finalPrice = (waxPricePerOz × sizeInOz) + wickPrice + jarPrice
                </code>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Base price is calculated from wax cost per ounce multiplied by candle size. Then wick and jar prices are added as fixed modifiers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Preview Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Pricing Preview
          </CardTitle>
          <CardDescription>
            Select options to see how pricing is calculated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Size</p>
              <Input
                type="number"
                value={previewSize}
                onChange={(e) => setPreviewSize(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Wax Type</p>
              <select
                value={previewWax}
                onChange={(e) => setPreviewWax(e.target.value)}
                className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.keys(config.waxPricing).map((wax) => (
                  <option key={wax} value={wax}>{wax}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Wick Type</p>
              <select
                value={previewWick}
                onChange={(e) => setPreviewWick(e.target.value)}
                className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.keys(config.wickPricing).map((wick) => (
                  <option key={wick} value={wick}>{wick}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Jar Type</p>
              <select
                value={previewJar}
                onChange={(e) => setPreviewJar(e.target.value)}
                className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.keys(config.jarPricing).map((jar) => (
                  <option key={jar} value={jar}>{jar}</option>
                ))}
              </select>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base ({previewWax}):</span>
              <span>${config.waxPricing[previewWax]?.pricePerOz || 0}/oz × {previewSize}oz = ${((config.waxPricing[previewWax]?.pricePerOz || 0) * parseInt(previewSize)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Wick ({previewWick}):</span>
              <span>+ ${(config.wickPricing[previewWick]?.price || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Jar ({previewJar}):</span>
              <span>+ ${(config.jarPricing[previewJar]?.price || 0).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Price:</span>
              <span className="text-primary">${calculatePreviewPrice().toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wax Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Wax Pricing (Per Ounce)</CardTitle>
          <CardDescription>
            Set the price per ounce for each wax type. Base price = wax price/oz × candle size
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(config.waxPricing).map(([wax, pricing]) => (
            <div key={wax} className="flex items-center gap-4 p-4 border rounded-lg">
              <Switch
                checked={pricing.enabled}
                onCheckedChange={(checked) => updateWaxPricing(wax, 'enabled', checked)}
              />
              <div className="flex-1">
                <p className="font-medium">{wax}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={pricing.pricePerOz}
                  onChange={(e) => updateWaxPricing(wax, 'pricePerOz', parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">/ oz</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Available Sizes */}
      <Card>
        <CardHeader>
          <CardTitle>Available Sizes</CardTitle>
          <CardDescription>
            Manage candle sizes. Price is calculated using formula above.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.sizes.map((size, index) => (
            <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
              <Switch
                checked={size.enabled}
                onCheckedChange={(checked) => updateSize(index, 'enabled', checked)}
              />
              <div className="flex-1 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Display Name</p>
                  <Input
                    value={size.name}
                    onChange={(e) => updateSize(index, 'name', e.target.value)}
                    placeholder="The Flame"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Size</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={size.ounces}
                      onChange={(e) => updateSize(index, 'ounces', parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">oz</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Product Handle</p>
                  <Input
                    value={size.productHandle}
                    onChange={(e) => updateSize(index, 'productHandle', e.target.value)}
                    placeholder="custom-candle-flame-12oz"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSize(index)}
                disabled={config.sizes.length <= 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addSize} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Size
          </Button>
        </CardContent>
      </Card>

      {/* Wick Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Wick Pricing (Fixed Price)</CardTitle>
          <CardDescription>
            Set fixed price modifiers for each wick type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(config.wickPricing).map(([wick, pricing]) => (
            <div key={wick} className="flex items-center gap-4 p-4 border rounded-lg">
              <Switch
                checked={pricing.enabled}
                onCheckedChange={(checked) => updateWickPricing(wick, 'enabled', checked)}
              />
              <div className="flex-1">
                <p className="font-medium">{wick}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={pricing.price}
                  onChange={(e) => updateWickPricing(wick, 'price', parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Jar Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Jar Pricing (Fixed Price)</CardTitle>
          <CardDescription>
            Set fixed price modifiers for each jar type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(config.jarPricing).map(([jar, pricing]) => (
            <div key={jar} className="flex items-center gap-4 p-4 border rounded-lg">
              <Switch
                checked={pricing.enabled}
                onCheckedChange={(checked) => updateJarPricing(jar, 'enabled', checked)}
              />
              <div className="flex-1">
                <p className="font-medium">{jar}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={pricing.price}
                  onChange={(e) => updateJarPricing(jar, 'price', parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

