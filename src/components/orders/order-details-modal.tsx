'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, Circle, Clock, Package, Truck, Printer } from "lucide-react"
import { useState } from "react"
import { addTagsToOrder } from "@/services/shopify"

type OrderDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  order: any; // Replace with proper type
}

type ProductionStep = {
  id: string;
  label: string;
  tag: string;
  icon: any;
}

const PRODUCTION_STEPS: ProductionStep[] = [
  { id: 'poured', label: 'Poured', tag: 'status:poured', icon: Package },
  { id: 'curing', label: 'Curing', tag: 'status:curing', icon: Clock },
  { id: 'ready', label: 'Ready', tag: 'status:ready', icon: CheckCircle2 },
];

export function OrderDetailsModal({ isOpen, onClose, order }: OrderDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  if (!order) return null;

  const isCustomOrder = order.lineItems.edges.some((edge: any) => 
    edge.node.customAttributes.some((attr: any) => attr.key.startsWith('_recipe_')) ||
    edge.node.product?.title?.toLowerCase().includes('magic request')
  );

  const currentStatus = PRODUCTION_STEPS.findLast(step => order.tags?.includes(step.tag))?.id || 'pending';

  const handleStatusUpdate = async (stepId: string) => {
    setIsUpdating(true);
    try {
      const step = PRODUCTION_STEPS.find(s => s.id === stepId);
      if (step) {
        await addTagsToOrder(order.id, [step.tag]);
        // Optimistically update UI or trigger re-fetch (handled by parent usually)
        // For now we just rely on the real-time subscription to update the list/modal
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                Order {order.name}
                <Badge variant={isCustomOrder ? "default" : "secondary"}>
                  {isCustomOrder ? "Custom Order" : "Standard Order"}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Customer: {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest'}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Use order number (e.g. 1006) for cleaner URL
                const orderNumber = order.name.replace('#', '');
                window.open(`/orders/${orderNumber}/ticket`, '_blank');
              }}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Ticket
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-full max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Production Status Stepper (Only for Custom Orders) */}
            {isCustomOrder && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <h3 className="font-semibold mb-4">Production Status</h3>
                <div className="flex items-center justify-between relative">
                  {/* Connecting Line */}
                  <div className="absolute left-0 top-1/2 w-full h-0.5 bg-muted -z-10" />
                  
                  {PRODUCTION_STEPS.map((step, index) => {
                    const isCompleted = PRODUCTION_STEPS.findIndex(s => s.id === currentStatus) >= index;
                    const isCurrent = currentStatus === step.id;
                    const Icon = step.icon;

                    return (
                      <div key={step.id} className="flex flex-col items-center bg-background px-2">
                        <Button
                          variant={isCompleted ? "default" : "outline"}
                          size="icon"
                          className={`rounded-full w-10 h-10 ${isCompleted ? 'bg-primary' : 'bg-muted text-muted-foreground'}`}
                          onClick={() => handleStatusUpdate(step.id)}
                          disabled={isUpdating}
                        >
                          <Icon className="w-5 h-5" />
                        </Button>
                        <span className={`text-xs mt-2 font-medium ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Line Items */}
            <div>
              <h3 className="font-semibold mb-3">Items</h3>
              <div className="space-y-4">
                {order.lineItems.edges.map((edge: any) => {
                  const item = edge.node;
                  const recipeAttr = item.customAttributes.find((attr: any) => attr.key === '_recipe_');
                  const recipe = recipeAttr ? JSON.parse(recipeAttr.value) : null;

                  return (
                    <div key={item.id} className="flex gap-4 border p-4 rounded-lg">
                      <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className="font-medium">{item.title}</h4>
                          <span className="text-muted-foreground">x{item.quantity}</span>
                        </div>
                        
                        {/* Recipe Card */}
                        {recipe && (
                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm bg-muted/50 p-2 rounded">
                            <div><span className="text-muted-foreground">Wax:</span> {recipe.wax}</div>
                            <div><span className="text-muted-foreground">Wick:</span> {recipe.wick}</div>
                            <div><span className="text-muted-foreground">Fragrance:</span> {recipe.fragrance}</div>
                            <div><span className="text-muted-foreground">Color:</span> {recipe.color}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Financials */}
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Payment Status</div>
                <Badge variant="outline">{order.financialStatus || 'PAID'}</Badge>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-2xl font-bold">
                  {parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)} {order.totalPriceSet.shopMoney.currencyCode}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
