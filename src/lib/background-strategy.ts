/**
 * Background AI Strategy Generation Service
 * 
 * This service handles generating AI business strategies in the background
 * when users log in, ensuring fresh insights are available when needed.
 */

const CACHE_KEY = 'ai-strategy-cache';
const CACHE_DURATION = 16 * 60 * 60 * 1000; // 16 hours in milliseconds

interface StrategyCache {
    strategy: any;
    lastUpdated: string;
    generatedAt: number;
}

/**
 * Check if strategy cache is fresh (less than 16 hours old)
 */
export function isStrategyCacheFresh(): boolean {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return false;
    
    try {
        const { generatedAt } = JSON.parse(cached) as StrategyCache;
        const cacheAge = Date.now() - generatedAt;
        return cacheAge < CACHE_DURATION;
    } catch {
        return false;
    }
}

/**
 * Get cached strategy if available and fresh
 */
export function getCachedStrategy(): StrategyCache | null {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    try {
        const data = JSON.parse(cached) as StrategyCache;
        const cacheAge = Date.now() - data.generatedAt;
        
        if (cacheAge < CACHE_DURATION) {
            return data;
        }
    } catch {
        // Invalid cache, ignore
    }
    
    return null;
}

/**
 * Start background strategy generation if cache is stale
 * This should be called on user login
 */
export async function startBackgroundStrategyGeneration(): Promise<void> {
    // Only generate if cache is stale or doesn't exist
    if (isStrategyCacheFresh()) {
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
        
        // Cache the result
        const now = new Date();
        const cacheData: StrategyCache = {
            strategy: strategyData,
            lastUpdated: now.toLocaleString(),
            generatedAt: Date.now()
        };
        
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        console.log('Background strategy generation completed and cached');
        
    } catch (error) {
        console.error('Background strategy generation failed:', error);
    }
}
