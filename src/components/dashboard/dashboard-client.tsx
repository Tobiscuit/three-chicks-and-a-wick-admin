
"use client";

import { StatsCard } from '@/components/dashboard/stats-card';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { TopProducts } from '@/components/dashboard/top-products';
import { RecentOrders } from '@/components/dashboard/recent-orders';
import { DollarSign, Package, ShoppingCart } from 'lucide-react';
import type { ShopifyProduct } from '@/services/shopify';

type DashboardClientProps = {
    stats: {
        totalRevenue: number;
        totalOrders: number;
        averageOrderValue: number;
        chartData: { date: string; total: number }[];
    };
    topProducts: (ShopifyProduct & { sales: number })[];
}

export function DashboardClient({ stats, topProducts }: DashboardClientProps) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <StatsCard
                    title="Total Revenue"
                    value={`$${stats.totalRevenue.toFixed(2)}`}
                    icon={DollarSign}
                    description="Total revenue from all orders"
                    delay={0}
                />
                <StatsCard
                    title="Total Orders"
                    value={`+${stats.totalOrders}`}
                    icon={ShoppingCart}
                    description="Total number of orders"
                    delay={1}
                />
                <StatsCard
                    title="Average Order Value"
                    value={`$${stats.averageOrderValue.toFixed(2)}`}
                    icon={Package}
                    description="Average value per order"
                    delay={2}
                />
            </div>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
                <SalesChart data={stats.chartData} />
                <TopProducts products={topProducts} />
            </div>
            <RecentOrders />
        </div>
    );
}
