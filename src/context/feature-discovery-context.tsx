"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';

interface FeatureDiscoveryContextType {
    seenFeatures: Set<string>;
    areTutorialsEnabled: boolean;
    markSeen: (featureId: string) => void;
    resetAll: () => void;
    toggleTutorials: (enabled: boolean) => void;
    isSeen: (featureId: string) => boolean;
}

const FeatureDiscoveryContext = createContext<FeatureDiscoveryContextType | undefined>(undefined);

export function FeatureDiscoveryProvider({ children }: { children: React.ReactNode }) {
    const [seenFeatures, setSeenFeatures] = useState<Set<string>>(new Set());
    const [areTutorialsEnabled, setAreTutorialsEnabled] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Load from localStorage
        const storedSeen = localStorage.getItem('feature-discovery-seen');
        const storedEnabled = localStorage.getItem('feature-discovery-enabled');

        if (storedSeen) {
            try {
                setSeenFeatures(new Set(JSON.parse(storedSeen)));
            } catch (e) {
                console.error("Failed to parse seen features", e);
            }
        }

        if (storedEnabled !== null) {
            setAreTutorialsEnabled(storedEnabled === 'true');
        }

        setIsLoaded(true);
    }, []);

    const markSeen = (featureId: string) => {
        setSeenFeatures(prev => {
            const next = new Set(prev);
            next.add(featureId);
            localStorage.setItem('feature-discovery-seen', JSON.stringify(Array.from(next)));
            return next;
        });
    };

    const resetAll = () => {
        setSeenFeatures(new Set());
        localStorage.removeItem('feature-discovery-seen');
    };

    const toggleTutorials = (enabled: boolean) => {
        setAreTutorialsEnabled(enabled);
        localStorage.setItem('feature-discovery-enabled', String(enabled));
    };

    const isSeen = (featureId: string) => {
        if (!isLoaded) return true; // Don't show while loading to prevent flash
        return seenFeatures.has(featureId);
    };

    return (
        <FeatureDiscoveryContext.Provider value={{
            seenFeatures,
            areTutorialsEnabled,
            markSeen,
            resetAll,
            toggleTutorials,
            isSeen
        }}>
            {children}
        </FeatureDiscoveryContext.Provider>
    );
}

export function useFeatureDiscovery() {
    const context = useContext(FeatureDiscoveryContext);
    if (context === undefined) {
        throw new Error('useFeatureDiscovery must be used within a FeatureDiscoveryProvider');
    }
    return context;
}
