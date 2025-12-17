"use client";

import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { parseProductDescription } from "@/lib/parse-product-description";

export function ReceiptTemplate({ order }: { order: any }) {
  return (
    <div className="min-h-screen bg-white p-8 text-black font-serif">
      {/* No-print controls */}
      <div className="print:hidden mb-8 flex justify-between items-center max-w-2xl mx-auto font-sans">
        <Link href="/orders" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Print Receipt
        </Button>
      </div>

      {/* Receipt Content - Elegant Black & White */}
      <div className="max-w-2xl mx-auto bg-white p-12 print:p-0">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-widest uppercase mb-4">Three Chicks and a Wick</h1>
          <p className="text-sm tracking-widest uppercase text-gray-500">Handcrafted Luxury Candles</p>
        </div>

        {/* Order Info */}
        <div className="flex justify-between items-end border-b border-black pb-4 mb-8">
          <div>
            <p className="text-sm uppercase tracking-wider text-gray-500 mb-1">Order No.</p>
            <p className="text-xl font-medium">{order.name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm uppercase tracking-wider text-gray-500 mb-1">Date</p>
            <p className="text-xl font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-12">
          <p className="text-sm uppercase tracking-wider text-gray-500 mb-2">Prepared For</p>
          <p className="text-2xl italic">
            {order.customer?.firstName} {order.customer?.lastName}
          </p>
        </div>

        {/* Line Items */}
        <div className="space-y-8 mb-16">
          {order.lineItems.edges.map(({ node: item }: any) => {
            const isCustom = item.customAttributes && item.customAttributes.length > 0;
            const productInfo = !isCustom ? parseProductDescription(item.product?.descriptionHtml || '') : null;

            return (
              <div key={item.id}>
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="text-lg font-medium">{item.title}</h3>
                  <span className="text-lg">x{item.quantity}</span>
                </div>
                
                {/* Description / Scent Profile */}
                {isCustom ? (
                   <p className="text-sm text-gray-600 italic">Custom Creation</p>
                ) : (
                   <p className="text-sm text-gray-600 italic max-w-md">
                     {productInfo?.scent !== 'N/A' ? productInfo?.scent : ''}
                   </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer / Thank You */}
        <div className="text-center border-t border-black pt-12 mt-12">
          <p className="text-2xl italic mb-4">Thank you for your support.</p>
          <p className="text-xs uppercase tracking-widest text-gray-400">
            www.threechicksandawick.com
          </p>
        </div>
      </div>
    </div>
  );
}
