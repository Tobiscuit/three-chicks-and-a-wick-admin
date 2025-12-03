"use client"

import { useState, useEffect } from "react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useFeatureDiscovery } from "@/context/feature-discovery-context"

interface FeatureHighlightProps {
    featureId: string
    title: string
    description: string
    children: React.ReactNode
    forceShow?: boolean
}

export function FeatureHighlight({
    featureId,
    title,
    description,
    children,
    forceShow = false,
}: FeatureHighlightProps) {
    const { isSeen, markSeen, areTutorialsEnabled } = useFeatureDiscovery()
    const [isOpen, setIsOpen] = useState(false)

    // Determine if we should show
    // We check isSeen immediately, but the effect handles the delay
    const shouldShow = forceShow || (areTutorialsEnabled && !isSeen(featureId));

    useEffect(() => {
        if (shouldShow && !isOpen) {
            // Small delay to ensure UI is ready and to draw attention
            const timer = setTimeout(() => setIsOpen(true), 1000)
            return () => clearTimeout(timer)
        }
    }, [shouldShow, isOpen])

    const handleDismiss = () => {
        setIsOpen(false)
        markSeen(featureId)
    }

    // If not showing and not open, render children directly to avoid Popover overhead
    // We keep it if isOpen is true (e.g. during the closing animation or if manually opened)
    if (!shouldShow && !isOpen) {
        return <>{children}</>
    }

    return (
        <Popover open={isOpen} onOpenChange={(open) => {
            // We control the open state. 
            // If the user interacts with the trigger, it might try to toggle.
            // We want to keep it open until dismissed via our buttons or the feature is used.
            // However, if the user clicks the trigger, the trigger's onClick (handleExport) will fire,
            // which calls markSeen, which updates shouldShow, which unmounts the Popover.
            // So we just sync state here but rely on context for the "truth".
            setIsOpen(open)
        }}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent
                className="w-80 p-0 overflow-hidden shadow-xl border-primary/20 z-50"
                side="bottom"
                align="end"
                sideOffset={10}
                onInteractOutside={(e) => {
                    // Prevent closing when clicking outside. 
                    // The user must acknowledge the tip or use the feature.
                    e.preventDefault();
                }}
            >
                <div className="bg-primary/5 p-4 border-b border-primary/10 flex justify-between items-start">
                    <h4 className="font-semibold text-primary flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                        {title}
                    </h4>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 -mt-1 -mr-2 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss();
                        }}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <div className="p-4 space-y-4 bg-card">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {description}
                    </p>
                    <div className="flex justify-end">
                        <Button size="sm" onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss();
                        }}>
                            Got it
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
