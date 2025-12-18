"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

type StatsCardProps = {
  title: string
  value: string
  icon: LucideIcon
  description?: string
  delay?: 0 | 1 | 2
  /** Percentage change from previous period (e.g., 12 for +12%) */
  comparison?: number | null
}

const delayClasses = {
  0: '',
  1: 'delay-75',
  2: 'delay-150',
} as const;

export function StatsCard({ title, value, icon: Icon, description, delay = 0, comparison }: StatsCardProps) {
  // Determine trend display
  const hasTrend = comparison !== null && comparison !== undefined;
  const isPositive = hasTrend && comparison > 0;
  const isNegative = hasTrend && comparison < 0;
  const isNeutral = hasTrend && comparison === 0;

  return (
    <Card className={cn(
      "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300",
      delayClasses[delay],
      "hover:shadow-md hover:border-primary/20 transition-all"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold tabular-nums slashed-zero tracking-tight">{value}</div>
          {hasTrend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isPositive && "text-emerald-600 dark:text-emerald-400",
              isNegative && "text-red-600 dark:text-red-400",
              isNeutral && "text-muted-foreground"
            )}>
              {isPositive && <TrendingUp className="h-3 w-3" />}
              {isNegative && <TrendingDown className="h-3 w-3" />}
              {isNeutral && <Minus className="h-3 w-3" />}
              <span className="tabular-nums">
                {isPositive && "+"}{Math.abs(comparison).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}
