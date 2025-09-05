
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

type SalesChartProps = {
  data: { date: string; total: number }[]
}

export function SalesChart({ data }: SalesChartProps) {
  return (
    <Card className="lg:col-span-4">
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        {data.length > 0 ? (
            <ChartContainer config={{}} className="h-[350px] w-full">
                <ResponsiveContainer>
                  <BarChart data={data}>
                    <XAxis
                      dataKey="date"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
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
