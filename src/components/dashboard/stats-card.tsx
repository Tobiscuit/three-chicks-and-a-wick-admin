
"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

type StatsCardProps = {
  title: string
  value: string
  icon: LucideIcon
  description?: string
  delay?: 0 | 1 | 2
}

const delayClasses = {
  0: '',
  1: 'delay-75',
  2: 'delay-150',
} as const;

export function StatsCard({ title, value, icon: Icon, description, delay = 0 }: StatsCardProps) {
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
        <div className="text-3xl font-bold tabular-nums slashed-zero tracking-tight">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}
