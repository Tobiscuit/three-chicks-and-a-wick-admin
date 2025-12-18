/**
 * Controlled Debug Logging
 * 
 * Enable debug output by setting localStorage.debug in browser console:
 *   localStorage.setItem('debug', 'strategy,shopify,firebase')
 * 
 * Or enable all:
 *   localStorage.setItem('debug', '*')
 * 
 * Disable all:
 *   localStorage.removeItem('debug')
 */

type DebugNamespace = 
    | 'strategy'    // Background strategy cache
    | 'shopify'     // Shopify API calls
    | 'firebase'    // Firebase Admin SDK
    | 'product'     // Product form
    | 'ai'          // AI services (tags, descriptions)
    | 'history'     // Description history
    | 'sync'        // Synchronized editor
    | '*';          // All namespaces

const isServer = typeof window === 'undefined';

/**
 * Check if a namespace is enabled for debug output
 */
function isNamespaceEnabled(namespace: Exclude<DebugNamespace, '*'>): boolean {
    if (isServer) {
        // On server, use NODE_ENV or DEBUG env var
        if (process.env.NODE_ENV === 'development' && process.env.DEBUG) {
            const enabledNamespaces = process.env.DEBUG.split(',').map(s => s.trim());
            return enabledNamespaces.includes('*') || enabledNamespaces.includes(namespace);
        }
        return false;
    }

    // On client, check localStorage
    try {
        const debugSetting = localStorage.getItem('debug');
        if (!debugSetting) return false;
        const enabledNamespaces = debugSetting.split(',').map(s => s.trim());
        return enabledNamespaces.includes('*') || enabledNamespaces.includes(namespace);
    } catch {
        return false;
    }
}

/**
 * Create a debug logger for a specific namespace
 */
export function createDebugLogger(namespace: Exclude<DebugNamespace, '*'>) {
    const prefix = `[${namespace.toUpperCase()}]`;
    
    return {
        log: (...args: unknown[]) => {
            if (isNamespaceEnabled(namespace)) {
                console.log(prefix, ...args);
            }
        },
        warn: (...args: unknown[]) => {
            if (isNamespaceEnabled(namespace)) {
                console.warn(prefix, ...args);
            }
        },
        error: (...args: unknown[]) => {
            // Always log errors
            console.error(prefix, ...args);
        },
        info: (...args: unknown[]) => {
            if (isNamespaceEnabled(namespace)) {
                console.info(prefix, ...args);
            }
        },
    };
}

// Pre-configured loggers for common namespaces
export const debugStrategy = createDebugLogger('strategy');
export const debugShopify = createDebugLogger('shopify');
export const debugFirebase = createDebugLogger('firebase');
export const debugProduct = createDebugLogger('product');
export const debugAI = createDebugLogger('ai');
export const debugHistory = createDebugLogger('history');
export const debugSync = createDebugLogger('sync');
