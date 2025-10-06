'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getMagicRequestConfig, updateMagicRequestConfig, type MagicRequestConfig, type MagicRequestOption } from '@/lib/storefront-appsync';
import { Plus, Trash2, GripVertical, Save, RotateCcw } from 'lucide-react';

export function MagicRequestVariants() {
  const { toast } = useToast();
  const [config, setConfig] = useState<MagicRequestConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<MagicRequestConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await getMagicRequestConfig();
      setConfig(data);
      setOriginalConfig(JSON.parse(JSON.stringify(data))); // Deep clone
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading config:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load variant configuration',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      await updateMagicRequestConfig(config);
      setOriginalConfig(JSON.parse(JSON.stringify(config)));
      setHasChanges(false);
      toast({
        title: 'Configuration Saved',
        description: 'Magic Request variants have been updated successfully',
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to update variant configuration. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig(JSON.parse(JSON.stringify(originalConfig)));
      setHasChanges(false);
      toast({
        title: 'Changes Discarded',
        description: 'Configuration has been reset to last saved state',
      });
    }
  };

  const updateOption = (category: keyof MagicRequestConfig, index: number, field: keyof MagicRequestOption, value: any) => {
    if (!config) return;

    const newConfig = { ...config };
    const options = [...(newConfig[category] as MagicRequestOption[])];
    options[index] = { ...options[index], [field]: value };
    newConfig[category] = options;

    setConfig(newConfig);
    setHasChanges(true);
  };

  const addOption = (category: keyof MagicRequestConfig) => {
    if (!config) return;

    const newConfig = { ...config };
    const options = [...(newConfig[category] as MagicRequestOption[])];
    const maxOrder = Math.max(...options.map(o => o.order), 0);

    options.push({
      name: 'New Option',
      value: 'New Option',
      enabled: true,
      order: maxOrder + 1,
    });

    newConfig[category] = options;
    setConfig(newConfig);
    setHasChanges(true);
  };

  const removeOption = (category: keyof MagicRequestConfig, index: number) => {
    if (!config) return;

    const newConfig = { ...config };
    const options = [...(newConfig[category] as MagicRequestOption[])];
    options.splice(index, 1);
    newConfig[category] = options;

    setConfig(newConfig);
    setHasChanges(true);
  };

  const renderOptionList = (
    category: keyof MagicRequestConfig,
    title: string,
    description: string,
    showValueField = false
  ) => {
    if (!config) return null;

    const options = config[category] as MagicRequestOption[];

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
              
              <Switch
                checked={option.enabled}
                onCheckedChange={(checked) => updateOption(category, index, 'enabled', checked)}
              />

              <div className="flex-1 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground">Display Name</label>
                  <Input
                    value={option.name}
                    onChange={(e) => updateOption(category, index, 'name', e.target.value)}
                    placeholder="Display name"
                  />
                </div>

                {showValueField && (
                  <div>
                    <label className="text-xs text-muted-foreground">Value</label>
                    <Input
                      value={option.value}
                      onChange={(e) => updateOption(category, index, 'value', e.target.value)}
                      placeholder="e.g., The Spark (8oz)"
                    />
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeOption(category, index)}
                disabled={options.length <= 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={() => addOption(category)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {title.slice(0, -1)} Option
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading variant configuration...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      {hasChanges && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">You have unsaved changes</p>
              <p className="text-sm text-muted-foreground">
                Save your changes to update the Magic Request form on the storefront
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleReset} disabled={saving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Discard
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
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
              <Badge>ℹ️</Badge>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">How Variant Options Work</p>
              <p className="text-sm text-muted-foreground">
                These options appear in the Magic Request form on the storefront. Customers can select from enabled options to customize their candle. Disabled options are hidden but can be re-enabled at any time. Changes take effect immediately after saving.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variant Option Lists */}
      <div className="space-y-6">
        {renderOptionList('waxTypes', 'Wax Types', 'Types of wax available for custom candles')}
        {renderOptionList('candleSizes', 'Candle Sizes', 'Available candle sizes with pricing', true)}
        {renderOptionList('wickTypes', 'Wick Types', 'Types of wicks customers can choose from')}
        {renderOptionList('jarTypes', 'Jar Types', 'Container options for custom candles')}
      </div>
    </div>
  );
}

