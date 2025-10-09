
'use client';

import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BrainCircuit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getBusinessSnapshot } from '@/services/shopify';
import { generateBusinessStrategy } from '@/ai/flows/generate-business-strategy';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

type Strategy = {
    pricing_recommendations: string[];
    marketing_suggestions: string[];
    inventory_alerts: string[];
}

export default function StrategyPage() {
    const [strategy, setStrategy] = useState<Strategy | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    const fetchStrategy = async (forceRefresh = false) => {
        try {
            setLoading(true);
            setError(null);
            
            // Check if we have cached strategy from today (only for force refresh)
            const cacheKey = 'ai-strategy-cache';
            const today = new Date().toDateString();
            
            if (!forceRefresh) {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const { strategy: cachedStrategy, date, lastUpdated: cachedTime } = JSON.parse(cached);
                    if (date === today) {
                        setStrategy(cachedStrategy);
                        setLastUpdated(cachedTime);
                        setLoading(false);
                        return;
                    }
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
                
                // Cache the result
                const now = new Date();
                const cacheData = {
                    strategy: strategyData,
                    date: today,
                    lastUpdated: now.toLocaleString()
                };
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                setLastUpdated(now.toLocaleString());
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
                
                // Cache the fallback too
                const now = new Date();
                const cacheData = {
                    strategy: fallbackStrategy,
                    date: today,
                    lastUpdated: now.toLocaleString()
                };
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                setLastUpdated(now.toLocaleString());
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
        // Load cached strategy immediately, then fetch in background if needed
        const cacheKey = 'ai-strategy-cache';
        const today = new Date().toDateString();
        
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { strategy: cachedStrategy, date, lastUpdated: cachedTime } = JSON.parse(cached);
            if (date === today) {
                setStrategy(cachedStrategy);
                setLastUpdated(cachedTime);
                setLoading(false);
                return; // Don't fetch if we have today's cache
            }
        }
        
        // No cache or outdated cache - fetch in background
        fetchStrategy();
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
                 <div className="space-y-8 font-light">
                    <div id="pricing">
                        <h3 className="font-semibold text-lg mb-2 text-primary">Pricing Recommendations</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            {strategy.pricing_recommendations.map((item, index) => <li key={`price-${index}`}>{item}</li>)}
                        </ul>
                    </div>
                    <div id="marketing">
                        <h3 className="font-semibold text-lg mb-2 text-primary">Marketing Suggestions</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            {strategy.marketing_suggestions.map((item, index) => <li key={`market-${index}`}>{item}</li>)}
                        </ul>
                    </div>
                    <div id="inventory">
                        <h3 className="font-semibold text-lg mb-2 text-primary">Inventory Alerts</h3>
                        <ul className="list-disc pl-5 space-y-2">
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
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <BrainCircuit className="text-primary"/>
                                AI Business Strategy
                            </CardTitle>
                            <CardDescription>
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
