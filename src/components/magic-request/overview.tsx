'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getFeatureFlag, setFeatureFlag } from '@/lib/storefront-appsync';
import { Activity, AlertTriangle, CheckCircle, Clock, Shield } from 'lucide-react';

export function MagicRequestOverview() {
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadFeatureFlag();
  }, []);

  const loadFeatureFlag = async () => {
    try {
      setLoading(true);
      const flag = await getFeatureFlag('enableMagicRequest');
      setIsEnabled(flag?.value ?? false);
    } catch (error) {
      console.error('Error loading feature flag:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load Magic Request status. Please check your AppSync configuration.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    try {
      setUpdating(true);
      await setFeatureFlag('enableMagicRequest', checked);
      setIsEnabled(checked);
      
      toast({
        title: checked ? 'Magic Request Enabled' : 'Magic Request Disabled',
        description: checked
          ? 'Customers can now create custom candles through the AI-powered interface.'
          : 'Custom candle ordering is now disabled. Existing orders in the queue will still be processed.',
      });
    } catch (error) {
      console.error('Error updating feature flag:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update Magic Request status. Please try again.',
      });
      // Revert the toggle
      setIsEnabled(!checked);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading Magic Request status...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Toggle Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Magic Request Status
              </CardTitle>
              <CardDescription className="mt-2">
                Enable or disable the AI-powered custom candle ordering system
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={isEnabled ? 'default' : 'secondary'} className={isEnabled ? 'bg-green-700/20 text-green-500 border-green-700/30' : ''}>
                {isEnabled ? 'Active' : 'Disabled'}
              </Badge>
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggle}
                disabled={updating}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">What happens when enabled?</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Customers can access the Magic Request form on the storefront</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>AI pipeline processes custom candle orders through Chandler AI</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Cybersecurity AI validates orders for security vulnerabilities</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Orders flagged as SUSPICIOUS appear in the Pending Reviews tab</span>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">What happens when disabled?</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-500 flex-shrink-0" />
                  <span>Magic Request form is hidden from the storefront</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-500 flex-shrink-0" />
                  <span>New custom candle orders cannot be submitted</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Existing orders in the queue will still be processed</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Pending reviews remain accessible for manual approval</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Orders
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Coming Soon</div>
            <p className="text-xs text-muted-foreground">
              Total custom candle orders processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Reviews
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Coming Soon</div>
            <p className="text-xs text-muted-foreground">
              Orders flagged as SUSPICIOUS awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Security Blocks
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Coming Soon</div>
            <p className="text-xs text-muted-foreground">
              Orders blocked by cybersecurity AI
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Pipeline Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Pipeline
          </CardTitle>
          <CardDescription>
            Multi-layered protection against security vulnerabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <span className="font-semibold text-primary">1</span>
              </div>
              <div>
                <h4 className="font-semibold">Chandler AI</h4>
                <p className="text-sm text-muted-foreground">
                  Processes customer input with structured prompting and schema validation
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <span className="font-semibold text-primary">2</span>
              </div>
              <div>
                <h4 className="font-semibold">Cybersecurity AI</h4>
                <p className="text-sm text-muted-foreground">
                  Validates output for XSS, injection, prompt injection, and business logic bypasses
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <span className="font-semibold text-primary">3</span>
              </div>
              <div>
                <h4 className="font-semibold">Human Review</h4>
                <p className="text-sm text-muted-foreground">
                  Admin manually approves or rejects orders flagged as SUSPICIOUS
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

