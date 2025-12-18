
'use client';

import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, BrainCircuit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getBusinessSnapshot } from '@/services/shopify';
import { generateBusinessStrategy } from '@/ai/flows/generate-business-strategy';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { getCachedStrategy, isStrategyCacheFresh } from '@/lib/background-strategy';
import { useAuth } from '@/components/auth/auth-provider';

type Strategy = {
    pricing_recommendations: string[];
    marketing_suggestions: string[];
    inventory_alerts: string[];
}

export default function StrategyPage() {
    const { user } = useAuth();
    const [strategy, setStrategy] = useState<Strategy | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    const fetchStrategy = async (forceRefresh = false) => {
        try {
            setLoading(true);
            setError(null);
            
            // Check if we have cached strategy (only for force refresh)
            if (!forceRefresh) {
                const cached = await getCachedStrategy(user?.uid);
                if (cached) {
                    setStrategy(cached.strategy);
                    setLastUpdated(cached.lastUpdated);
                    setLoading(false);
                    return;
                }
            }
            
            // 1. Get business snapshot from Shopify
            const snapshot = await getBusinessSnapshot();
            
            if (snapshot.orders.length === 0 && snapshot.products.length === 0) {
                 setError("No sales or product data found. Please add products and make some sales to generate a strategy.");
                 setStrategy(null);
                 setLoading(false);
                 return;
            }

            // 2. Generate strategy with Genkit
            const result = await generateBusinessStrategy(snapshot);

            // Parse the string result into a Strategy object
            try {
                let strategyData;
                
                // Try to extract JSON from the result if it's wrapped in markdown or other text
                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    strategyData = JSON.parse(jsonMatch[0]);
                } else {
                    strategyData = JSON.parse(result);
                }
                
                // Validate that we have the expected structure
                if (!strategyData.pricing_recommendations || !strategyData.marketing_suggestions) {
                    throw new Error('Invalid strategy structure');
                }
                
                setStrategy(strategyData);
                
                // Cache the result to AppSync with user ID for per-user caching
                const expiresAt = Date.now() + (16 * 60 * 60 * 1000); // 16 hours
                const cacheResponse = await fetch('/api/storefront/strategy-cache', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        strategy: JSON.stringify(strategyData),
                        expiresAt,
                        userId: user?.uid
                    })
                });
                
                if (cacheResponse.ok) {
                    console.log('Strategy cached to AppSync successfully');
                } else {
                    console.error('Failed to cache strategy to AppSync');
                }
                
                setLastUpdated(new Date().toLocaleString());
            } catch (parseError) {
                console.error('Failed to parse strategy JSON:', parseError);
                console.error('Raw result:', result);
                
                // If parsing fails, create a fallback strategy object
                const fallbackStrategy = {
                    pricing_recommendations: ["Unable to parse AI response. Please try regenerating the strategy."],
                    marketing_suggestions: ["There was an issue processing the marketing recommendations."],
                    inventory_alerts: ["Unable to analyze inventory data."]
                };
                setStrategy(fallbackStrategy);
                
                // Cache the fallback too with user ID
                const expiresAt = Date.now() + (16 * 60 * 60 * 1000); // 16 hours
                try {
                    await fetch('/api/storefront/strategy-cache', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            strategy: JSON.stringify(fallbackStrategy),
                            expiresAt,
                            userId: user?.uid
                        })
                    });
                } catch (cacheError) {
                    console.error('Failed to cache fallback strategy:', cacheError);
                }
                
                setLastUpdated(new Date().toLocaleString());
            }
        } catch (err: any) {
            console.error("Failed to generate strategy:", err);
            setError(err.message || "An unknown error occurred while generating the business strategy.");
            setStrategy(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Load cached strategy immediately if available
        const loadCachedStrategy = async () => {
            const cached = await getCachedStrategy();
            if (cached) {
                setStrategy(cached.strategy);
                setLastUpdated(cached.lastUpdated);
                setLoading(false);
            } else {
                // No cache available - fetch strategy
                fetchStrategy();
            }
        };
        
        loadCachedStrategy();
    }, []);

    const renderStrategyContent = () => {
        if (loading) {
            return (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <Alert variant="destructive">
                    <AlertTitle>Could not Generate Strategy</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            );
        }
        
        if (strategy) {
            return (
                 <div className="space-y-8">
                    <div id="pricing" className="motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h3 className="font-semibold text-lg mb-3 text-primary">Pricing Recommendations</h3>
                        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                            {strategy.pricing_recommendations.map((item, index) => <li key={`price-${index}`}>{item}</li>)}
                        </ul>
                    </div>
                    <div id="marketing" className="motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75">
                        <h3 className="font-semibold text-lg mb-3 text-primary">Marketing Suggestions</h3>
                        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                            {strategy.marketing_suggestions.map((item, index) => <li key={`market-${index}`}>{item}</li>)}
                        </ul>
                    </div>
                    <div id="inventory" className="motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-150">
                        <h3 className="font-semibold text-lg mb-3 text-primary">Inventory Alerts</h3>
                        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                           {strategy.inventory_alerts.length > 0 ? strategy.inventory_alerts.map((item, index) => (
                                <li key={`inv-${index}`}>{item}</li>
                            )) : (
                                <li>All inventory levels look healthy.</li>
                            )}
                        </ul>
                    </div>
                </div>
            )
        }

        return null;
    }

    return (
        <AuthWrapper>
            <Card className={cn(
                "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300",
                "hover:shadow-md hover:border-primary/20 transition-all"
            )}>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                                <BrainCircuit className="h-6 w-6 text-primary"/>
                                AI Business Strategy
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Actionable recommendations based on your latest Shopify data.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <Button onClick={() => fetchStrategy(true)} disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ): (
                                    "Regenerate Strategy"
                                )}
                            </Button>
                            {lastUpdated && (
                                <p className="text-xs text-muted-foreground">
                                    Last updated: {lastUpdated}
                                </p>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                   {renderStrategyContent()}
                </CardContent>
            </Card>
        </AuthWrapper>
    );
}
