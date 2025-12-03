import { ShopifyOrder } from "@/services/shopify";

export function downloadCSV(content: string, filename: string) {
    // Add BOM for Excel compatibility
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

const escapeCSV = (field: any) => {
    if (field === null || field === undefined) return '';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
};

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
                escapeCSV(order.name),
                escapeCSV(date),
                escapeCSV(customer),
                escapeCSV(item.quantity),
                escapeCSV(item.title),
                escapeCSV(item.variant?.title !== 'Default Title' ? item.variant?.title : ''),
                escapeCSV(item.variant?.sku || ''),
                escapeCSV(customDetails)
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
            escapeCSV(order.name),
            escapeCSV(date),
            escapeCSV(customer),
            escapeCSV(order.displayFulfillmentStatus || 'UNFULFILLED'),
            escapeCSV(order.totalPriceSet.shopMoney.amount),
            escapeCSV(order.totalPriceSet.shopMoney.currencyCode)
        ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}
