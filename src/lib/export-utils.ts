import { ShopifyOrder } from "@/services/shopify";

export function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function generateProductionCSV(orders: any[]) {
    const headers = ['Order #', 'Date', 'Customer', 'Qty', 'Product', 'Variant', 'SKU', 'Custom Details'];
    const rows = [];

    for (const order of orders) {
        const date = new Date(order.createdAt).toLocaleDateString();
        const customer = order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest';

        for (const edge of order.lineItems.edges) {
            const item = edge.node;
            const customDetails = item.customAttributes
                ?.map((attr: any) => `${attr.key}: ${attr.value}`)
                .join(' | ') || '';

            rows.push([
                order.name,
                date,
                customer,
                item.quantity,
                `"${item.title.replace(/"/g, '""')}"`, // Escape quotes
                item.variant?.title !== 'Default Title' ? item.variant?.title : '',
                item.variant?.sku || '',
                `"${customDetails.replace(/"/g, '""')}"`
            ].join(','));
        }
    }

    return [headers.join(','), ...rows].join('\n');
}

export function generateFinancialCSV(orders: any[]) {
    const headers = ['Order #', 'Date', 'Customer', 'Status', 'Fulfillment', 'Total', 'Currency'];
    const rows = orders.map(order => {
        const date = new Date(order.createdAt).toLocaleDateString();
        const customer = order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest';

        return [
            order.name,
            date,
            customer,
            order.displayFulfillmentStatus || 'UNFULFILLED',
            order.totalPriceSet.shopMoney.amount,
            order.totalPriceSet.shopMoney.currencyCode
        ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}
