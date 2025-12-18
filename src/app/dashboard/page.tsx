
import { getOrders, getProducts } from '@/services/shopify';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { ShopifyOrder, ShopifyProduct } from '@/services/shopify';
import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Helper function to process order data with week-over-week comparison
function processOrderData(orders: ShopifyOrder[]) {
    // Get date boundaries
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Split orders into this week and last week
    const thisWeekOrders = orders.filter(o => new Date(o.processedAt) >= oneWeekAgo);
    const lastWeekOrders = orders.filter(o => {
        const date = new Date(o.processedAt);
        return date >= twoWeeksAgo && date < oneWeekAgo;
    });

    // Calculate this week stats
    const totalRevenue = thisWeekOrders.reduce((sum, order) => sum + parseFloat(order.totalPriceSet.shopMoney.amount), 0);
    const totalOrders = thisWeekOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate last week stats for comparison
    const lastWeekRevenue = lastWeekOrders.reduce((sum, order) => sum + parseFloat(order.totalPriceSet.shopMoney.amount), 0);
    const lastWeekOrderCount = lastWeekOrders.length;
    const lastWeekAOV = lastWeekOrderCount > 0 ? lastWeekRevenue / lastWeekOrderCount : 0;

    // Calculate percentage changes
    const revenueChange = lastWeekRevenue > 0 ? ((totalRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : null;
    const ordersChange = lastWeekOrderCount > 0 ? ((totalOrders - lastWeekOrderCount) / lastWeekOrderCount) * 100 : null;
    const aovChange = lastWeekAOV > 0 ? ((averageOrderValue - lastWeekAOV) / lastWeekAOV) * 100 : null;

    // Build chart data from all orders (not just this week)
    const salesByDay: { [key: string]: number } = {};
    orders.forEach(order => {
        const date = new Date(order.processedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!salesByDay[date]) {
            salesByDay[date] = 0;
        }
        salesByDay[date] += parseFloat(order.totalPriceSet.shopMoney.amount);
    });

    const chartData = Object.entries(salesByDay)
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { 
        totalRevenue, 
        totalOrders, 
        averageOrderValue, 
        chartData,
        comparisons: {
            revenue: revenueChange,
            orders: ordersChange,
            aov: aovChange
        }
    };
}

// Helper function to get top selling products
function getTopSellingProducts(orders: ShopifyOrder[], products: ShopifyProduct[]): (ShopifyProduct & { sales: number })[] {
    const productSales: { [key: string]: number } = {};

    orders.forEach(order => {
        order.lineItems.edges.forEach(edge => {
            const productId = edge.node.product?.id;
            if (productId) {
                if (!productSales[productId]) {
                    productSales[productId] = 0;
                }
                productSales[productId] += 1; // Count mentions in orders
            }
        });
    });

    return products
        .map(product => ({
            ...product,
            sales: productSales[product.id] || 0,
        }))
        .filter(p => p.sales > 0)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
}

// Skeleton component for loading state
function DashboardSkeleton() {
    return (
        <div className="flex-1 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-[120px] mb-2" />
                            <Skeleton className="h-3 w-[80px]" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <Skeleton className="h-6 w-[120px]" />
                    </CardHeader>
                    <CardContent className="pl-2">
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <Skeleton className="h-6 w-[140px]" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center">
                                    <Skeleton className="h-9 w-9 rounded-md" />
                                    <div className="ml-4 space-y-1">
                                        <Skeleton className="h-4 w-[150px]" />
                                        <Skeleton className="h-3 w-[100px]" />
                                    </div>
                                    <Skeleton className="ml-auto h-4 w-[60px]" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Data-fetching component wrapped in Suspense
async function DashboardStats() {
    let orders: ShopifyOrder[] = [];
    let products: ShopifyProduct[] = [];
    let error: string | null = null;
    let stats = { 
        totalRevenue: 0, 
        totalOrders: 0, 
        averageOrderValue: 0, 
        chartData: [] as { date: string, total: number }[],
        comparisons: { revenue: null as number | null, orders: null as number | null, aov: null as number | null }
    };
    let topProducts: (ShopifyProduct & { sales: number })[] = [];

    try {
        // Fetch last 50 orders and all products
        [orders, products] = await Promise.all([
            getOrders(50),
            getProducts(100)
        ]);

        stats = processOrderData(orders);
        topProducts = getTopSellingProducts(orders, products);

    } catch (e: any) {
        error = e.message;
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Fetching Dashboard Data</AlertTitle>
                <AlertDescription>
                    {error}
                    <br />
                    Please ensure your Shopify app has 'read_orders' and 'read_products' permissions.
                </AlertDescription>
            </Alert>
        );
    }

    return <DashboardClient stats={stats} topProducts={topProducts} />;
}

export default async function DashboardPage() {
    return (
        <AuthWrapper>
            <div className="flex-1 space-y-4">
                <Suspense fallback={<DashboardSkeleton />}>
                    <DashboardStats />
                </Suspense>
            </div>
        </AuthWrapper>
    );
}
