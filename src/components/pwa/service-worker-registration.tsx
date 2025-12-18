'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 * 
 * Registers the service worker for PWA functionality.
 * Only registers in production to avoid caching issues during development.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register in production or if explicitly enabled
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        console.log('[PWA] Service worker registered:', registration.scope);

        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available - could show update prompt here
                console.log('[PWA] New version available');
              }
            });
          }
        });
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    };

    // Register when page is ready
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
      return () => window.removeEventListener('load', registerSW);
    }
  }, []);

  return null; // This component doesn't render anything
}
