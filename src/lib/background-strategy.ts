/**
 * Background AI Strategy Generation Service
 * 
 * This service handles generating AI business strategies in the background
 * when users log in, ensuring fresh insights are available when needed.
 * Uses AppSync + DynamoDB for cross-device caching.
 */

const CACHE_DURATION = 16 * 60 * 60 * 1000; // 16 hours in milliseconds

interface StrategyCache {
    strategy: any;
    lastUpdated: string;
    generatedAt: number;
    expiresAt: number;
}

/**
 * Get cached strategy from AppSync if available and fresh
 */
export async function getCachedStrategy(): Promise<StrategyCache | null> {
    try {
        const response = await fetch('/api/storefront/strategy-cache', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch strategy cache:', response.status);
            return null;
        }

        const result = await response.json();
        const cacheData = result.getStrategyCache;

        if (cacheData && cacheData.expiresAt > Date.now()) {
            return {
                strategy: JSON.parse(cacheData.strategy),
                lastUpdated: new Date(cacheData.generatedAt).toLocaleString(),
                generatedAt: cacheData.generatedAt,
                expiresAt: cacheData.expiresAt
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching cached strategy:', error);
        return null;
    }
}

/**
 * Check if strategy cache is fresh (less than 16 hours old)
 */
export async function isStrategyCacheFresh(): Promise<boolean> {
    const cached = await getCachedStrategy();
    return cached !== null;
}

/**
 * Cache strategy data to AppSync (with localStorage fallback)
 */
async function cacheStrategyToAppSync(strategyData: any): Promise<void> {
    try {
        const expiresAt = Date.now() + CACHE_DURATION;
        
        const response = await fetch('/api/storefront/strategy-cache', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                strategy: JSON.stringify(strategyData),
                expiresAt
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to cache strategy: ${response.status}`);
        }

        console.log('Strategy cached to AppSync successfully');
    } catch (error) {
        console.error('Failed to cache strategy to AppSync, falling back to localStorage:', error);
        
        // Fallback to localStorage when AppSync fails
        const cacheData = {
            strategy: strategyData,
            lastUpdated: new Date().toLocaleString(),
            generatedAt: Date.now(),
            expiresAt: Date.now() + CACHE_DURATION
        };
        
        localStorage.setItem('ai-strategy-cache', JSON.stringify(cacheData));
        console.log('Strategy cached to localStorage as fallback');
    }
}

/**
 * Start background strategy generation if cache is stale
 * This should be called on user login
 */
export async function startBackgroundStrategyGeneration(): Promise<void> {
    // Only generate if cache is stale or doesn't exist
    if (await isStrategyCacheFresh()) {
        console.log('Strategy cache is fresh, skipping background generation');
        return;
    }
    
    console.log('Starting background AI strategy generation...');
    
    try {
        // Import dynamically to avoid circular dependencies
        const { getBusinessSnapshot } = await import('@/services/shopify');
        const { generateBusinessStrategy } = await import('@/ai/flows/generate-business-strategy');
        
        // Get business data
        const snapshot = await getBusinessSnapshot();
        
        if (snapshot.orders.length === 0 && snapshot.products.length === 0) {
            console.log('No business data available for strategy generation');
            return;
        }
        
        // Generate strategy
        const result = await generateBusinessStrategy(snapshot);
        
        // Parse and cache the result
        let strategyData;
        try {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                strategyData = JSON.parse(jsonMatch[0]);
            } else {
                strategyData = JSON.parse(result);
            }
            
            if (!strategyData.pricing_recommendations || !strategyData.marketing_suggestions) {
                throw new Error('Invalid strategy structure');
            }
        } catch (parseError) {
            console.error('Failed to parse strategy JSON:', parseError);
            strategyData = {
                pricing_recommendations: ["Unable to parse AI response. Please try regenerating the strategy."],
                marketing_suggestions: ["There was an issue processing the marketing recommendations."],
                inventory_alerts: ["Unable to analyze inventory data."]
            };
        }
        
        // Cache the result to AppSync
        await cacheStrategyToAppSync(strategyData);
        console.log('Background strategy generation completed and cached to AppSync');
        
    } catch (error) {
        console.error('Background strategy generation failed:', error);
    }
}
