
import { getOrders, getProducts } from '@/services/shopify';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { ShopifyOrder, ShopifyProduct } from '@/services/shopify';
import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

// Helper function to process order data
function processOrderData(orders: ShopifyOrder[]) {
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalPriceSet.shopMoney.amount), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

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


    return { totalRevenue, totalOrders, averageOrderValue, chartData };
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


export default async function DashboardPage() {
    let orders: ShopifyOrder[] = [];
    let products: ShopifyProduct[] = [];
    let error: string | null = null;
    let stats = { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0, chartData: [] as {date: string, total: number}[] };
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

    return (
        <AuthWrapper>
            <div className="flex-1 space-y-4">
                {error ? (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error Fetching Dashboard Data</AlertTitle>
                        <AlertDescription>
                            {error}
                            <br />
                            Please ensure your Shopify app has 'read_orders' and 'read_products' permissions.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <DashboardClient stats={stats} topProducts={topProducts} />
                )}
            </div>
        </AuthWrapper>
    );
}
