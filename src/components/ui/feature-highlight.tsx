"use client"

import { useState, useEffect } from "react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

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
    const [isOpen, setIsOpen] = useState(false)
    const [hasChecked, setHasChecked] = useState(false)

    useEffect(() => {
        // Check local storage on mount
        const seen = localStorage.getItem(`feature-seen-${featureId}`)
        if (!seen || forceShow) {
            // Small delay to ensure UI is ready and to draw attention
            const timer = setTimeout(() => setIsOpen(true), 1000)
            return () => clearTimeout(timer)
        }
        setHasChecked(true)
    }, [featureId, forceShow])

    const handleDismiss = () => {
        setIsOpen(false)
        localStorage.setItem(`feature-seen-${featureId}`, "true")
    }

    // If we've already checked and it's seen, just render children to avoid Popover overhead
    if (hasChecked && !isOpen && !forceShow) {
        return <>{children}</>
    }

    return (
        <Popover open={isOpen} onOpenChange={(open) => {
            // Only allow closing via our controls or if the user interacts with the trigger (which handles the action)
            // We want to persist the tip until explicitly dismissed or used
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
                    // Optional: prevent closing when clicking outside to force interaction?
                    // No, that's annoying. Let it close but don't mark as seen.
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
