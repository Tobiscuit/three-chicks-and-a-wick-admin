import { getOrder } from "@/services/shopify";
import { TicketTemplate } from "@/components/orders/ticket-template";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Decode ID just in case, though usually it's fine.
  const orderId = decodeURIComponent(id);
  
  let order = null;
  try {
    order = await getOrder(orderId);
  } catch (error) {
    console.error("Error fetching order for ticket:", error);
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen font-sans">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 text-red-600">Order Not Found</h1>
          <p className="text-gray-600">Could not find order with ID: {orderId}</p>
          <p className="text-sm text-gray-400 mt-4">Check the console for details.</p>
        </div>
      </div>
    );
  }

  return <TicketTemplate order={order} />;
}
