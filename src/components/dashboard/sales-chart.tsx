
"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartTooltipContent, ChartContainer } from "../ui/chart"
import { ShoppingCart } from "lucide-react"
import { useMemo } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"

type SalesChartProps = {
  data: { date: string; total: number }[]
}

export function SalesChart({ data }: SalesChartProps) {
  // Adaptive data based on screen size
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isTablet = useMediaQuery("(min-width: 641px) and (max-width: 1023px)");

  const displayData = useMemo(() => {
    if (isMobile) return data.slice(-3);  // Last 3 days on mobile
    if (isTablet) return data.slice(-5);   // Last 5 days on tablet
    return data;                            // All days on desktop
  }, [data, isMobile, isTablet]);

  return (
    <Card className="lg:col-span-4">
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        {displayData.length > 0 ? (
          <ChartContainer config={{}} className="h-[250px] sm:h-[300px] lg:h-[350px] w-full">
            <ResponsiveContainer>
              <BarChart data={displayData}>
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 60 : 30}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  content={<ChartTooltipContent
                    formatter={(value) => `$${(value as number).toFixed(2)}`}
                    indicator="dot"
                  />}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex h-[350px] w-full flex-col items-center justify-center text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">No sales data yet</p>
            <p className="text-muted-foreground">Recent sales will be displayed here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
