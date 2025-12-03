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

export function toCSV(headers: string[], rows: string[][]): string {
    const escapeCSV = (field: any) => {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    const csvRows = rows.map(row => row.map(escapeCSV).join(','));
    return [headers.map(escapeCSV).join(','), ...csvRows].join('\n');
}

export function generateProductionData(orders: any[]) {
    const headers = ['Order #', 'Date', 'Customer', 'Qty', 'Product', 'Variant', 'SKU', 'Custom Details'];
    const rows: string[][] = [];

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
                String(item.quantity),
                item.title,
                item.variant?.title !== 'Default Title' ? item.variant?.title : '',
                item.variant?.sku || '',
                customDetails
            ]);
        }
    }

    return { headers, rows };
}

export function generateFinancialData(orders: any[]) {
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
        ];
    });

    return { headers, rows };
}
