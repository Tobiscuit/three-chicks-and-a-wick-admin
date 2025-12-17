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
export async function getCachedStrategy(userId?: string): Promise<StrategyCache | null> {
    // 1. Check localStorage FIRST
    if (typeof window !== 'undefined') {
        const localCached = localStorage.getItem('ai-strategy-cache');
        if (localCached) {
            try {
                const parsed = JSON.parse(localCached);
                const cacheAge = Date.now() - parsed.generatedAt;
                if (cacheAge < CACHE_DURATION) {
                    console.log('✅ [Strategy Debug] Returning fresh local cache');
                    return {
                        strategy: parsed.strategy,
                        lastUpdated: parsed.lastUpdated,
                        generatedAt: parsed.generatedAt,
                        expiresAt: parsed.expiresAt
                    };
                }
            } catch (e) {
                console.error('Error parsing local cache:', e);
            }
        }
    }

    try {
        const url = userId 
            ? `/api/storefront/strategy-cache?userId=${userId}` 
            : '/api/storefront/strategy-cache';
            
        const response = await fetch(url, {
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
            const strategy = {
                strategy: JSON.parse(cacheData.strategy),
                lastUpdated: new Date(cacheData.generatedAt).toLocaleString(),
                generatedAt: cacheData.generatedAt,
                expiresAt: cacheData.expiresAt
            };

            // Sync to localStorage for next time
            if (typeof window !== 'undefined') {
                localStorage.setItem('ai-strategy-cache', JSON.stringify(strategy));
            }

            return strategy;
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
export async function isStrategyCacheFresh(userId?: string): Promise<boolean> {
    console.log('🔍 [Strategy Debug] Checking cache freshness...');
    
    // 1. Check localStorage FIRST (Fastest, saves network calls)
    const localCached = localStorage.getItem('ai-strategy-cache');
    if (localCached) {
        try {
            const { generatedAt } = JSON.parse(localCached);
            const cacheAge = Date.now() - generatedAt;
            const isFresh = cacheAge < CACHE_DURATION;
            
            if (isFresh) {
                console.log('✅ [Strategy Debug] Local cache is fresh (' + Math.round(cacheAge / 1000 / 60) + ' mins old). Skipping AppSync check.');
                return true;
            } else {
                console.log('⚠️ [Strategy Debug] Local cache is stale (' + Math.round(cacheAge / 1000 / 60) + ' mins old). Checking AppSync...');
            }
        } catch (error) {
            console.log('❌ [Strategy Debug] localStorage cache parse error:', error);
        }
    } else {
        console.log('ℹ️ [Strategy Debug] No local cache found. Checking AppSync...');
    }

    // 2. Check AppSync (Fallback / Cross-device sync)
    // Only reach here if local cache is missing or stale
    const cached = await getCachedStrategy(userId);
    if (cached) {
        console.log('✅ [Strategy Debug] AppSync cache found and fresh');
        // Update local cache with the fresh AppSync data
        localStorage.setItem('ai-strategy-cache', JSON.stringify({
            strategy: cached.strategy,
            lastUpdated: cached.lastUpdated,
            generatedAt: cached.generatedAt,
            expiresAt: cached.expiresAt
        }));
        return true;
    }
    
    console.log('❌ [Strategy Debug] No fresh cache found anywhere');
    return false;
}

/**
 * Cache strategy data to AppSync (with localStorage fallback)
 */
async function cacheStrategyToAppSync(strategyData: any, userId?: string): Promise<void> {
    try {
        const expiresAt = Date.now() + CACHE_DURATION;
        
        const response = await fetch('/api/storefront/strategy-cache', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                strategy: JSON.stringify(strategyData),
                expiresAt,
                userId
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
export async function startBackgroundStrategyGeneration(userId?: string): Promise<void> {
    console.log('🔍 [Strategy Debug] Checking cache freshness...');
    
    // Only generate if cache is stale or doesn't exist
    const isFresh = await isStrategyCacheFresh(userId);
    console.log('🔍 [Strategy Debug] Cache fresh?', isFresh);
    
    if (isFresh) {
        console.log('✅ [Strategy Debug] Strategy cache is fresh, skipping background generation');
        return;
    }
    
    console.log('🚀 [Strategy Debug] Starting background AI strategy generation...');
    
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
        await cacheStrategyToAppSync(strategyData, userId);
        console.log('Background strategy generation completed and cached to AppSync');
        
    } catch (error) {
        console.error('Background strategy generation failed:', error);
    }
}
