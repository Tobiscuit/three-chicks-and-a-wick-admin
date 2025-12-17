"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SegmentedControlProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[]
  className?: string
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 })

  // Update indicator position when value changes
  React.useEffect(() => {
    if (!containerRef.current) return
    
    const buttons = containerRef.current.querySelectorAll('button')
    const activeIndex = options.findIndex(opt => opt.value === value)
    const activeButton = buttons[activeIndex]
    
    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      })
    }
  }, [value, options])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center rounded-lg bg-muted p-1",
        className
      )}
    >
      {/* Animated indicator */}
      <div
        className="absolute h-[calc(100%-8px)] rounded-md bg-background shadow-sm transition-all duration-200 ease-out"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
      />
      
      {/* Buttons */}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onValueChange(option.value)}
          className={cn(
            "relative z-10 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
            "rounded-md",
            value === option.value
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
