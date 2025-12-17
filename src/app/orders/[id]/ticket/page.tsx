import { getOrder, getOrderByNumber } from "@/services/shopify";
import { TicketTemplate } from "@/components/orders/ticket-template";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  
  let order = null;
  try {
    // Check if it's a GID or an Order Number
    if (decodedId.startsWith('gid://')) {
      order = await getOrder(decodedId);
    } else {
      // Assume it's an order number (e.g., "1006" or "#1006")
      order = await getOrderByNumber(decodedId);
    }
  } catch (error) {
    console.error("Error fetching order for ticket:", error);
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen font-sans">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 text-red-600">Order Not Found</h1>
          <p className="text-gray-600">Could not find order with ID: {decodedId}</p>
          <p className="text-sm text-gray-400 mt-4">Check the console for details.</p>
        </div>
      </div>
    );
  }

  return <TicketTemplate order={order} />;
}
