"use client";

import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { parseProductDescription } from "@/lib/parse-product-description";

export function TicketTemplate({ order }: { order: any }) {
  return (
    <div className="min-h-screen bg-white p-8 text-black font-sans">
      {/* No-print controls */}
      <div className="print:hidden mb-8 flex justify-between items-center max-w-3xl mx-auto">
        <Link href="/orders" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Print Ticket
        </Button>
      </div>

      {/* Ticket Content */}
      <div className="max-w-3xl mx-auto border-2 border-black p-8 bg-white">
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
          <div>
            <h1 className="text-4xl font-bold uppercase tracking-tighter">Production Ticket</h1>
            <p className="text-xl mt-2 font-mono">#{order.name}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{new Date(order.createdAt).toLocaleDateString()}</p>
            <p className="text-lg">{order.customer?.firstName} {order.customer?.lastName}</p>
            {order.note && (
              <p className="text-sm mt-2 max-w-[200px] ml-auto italic">Note: {order.note}</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {order.lineItems.edges.map(({ node: item }: any) => {
            const isCustom = item.customAttributes && item.customAttributes.length > 0;
            const productInfo = !isCustom ? parseProductDescription(item.product?.descriptionHtml || '') : null;

            return (
              <div key={item.id} className="border border-black p-6 break-inside-avoid shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold leading-tight w-3/4">{item.title}</h2>
                  <div className="text-2xl font-bold bg-black text-white px-4 py-2 rounded-md font-mono">
                    x{item.quantity}
                  </div>
                </div>

                {isCustom ? (
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    {(() => {
                      // Try to parse _recipe_ attribute
                      const recipeAttr = item.customAttributes.find((attr: any) => attr.key === '_recipe_');
                      let recipe = null;
                      try {
                        if (recipeAttr) recipe = JSON.parse(recipeAttr.value);
                      } catch (e) { }

                      // Filter out _recipe_ and other internal attributes for display
                      const displayAttributes = item.customAttributes.filter((attr: any) => !attr.key.startsWith('_'));

                      return (
                        <>
                          {/* Recipe Grid */}
                          {recipe && (
                            <div className="space-y-4 mb-6">
                              <div className="grid grid-cols-3 gap-x-4 gap-y-4">
                                <div className="border-b-2 border-black pb-2">
                                  <span className="font-bold uppercase text-xs text-gray-500 block mb-1">Wax</span>
                                  <span className="text-xl font-bold">{recipe.wax}</span>
                                </div>
                                <div className="border-b-2 border-black pb-2">
                                  <span className="font-bold uppercase text-xs text-gray-500 block mb-1">Wick</span>
                                  <span className="text-xl font-bold">{recipe.wick}</span>
                                </div>
                                <div className="border-b-2 border-black pb-2">
                                  <span className="font-bold uppercase text-xs text-gray-500 block mb-1">Color</span>
                                  <span className="text-xl font-bold">{recipe.color || 'Natural'}</span>
                                </div>
                              </div>
                              
                              {/* Fragrance Recipe - THE KEY PRODUCTION DATA */}
                              {recipe.fragrances && recipe.fragrances.length > 0 && (
                                <div className="border-2 border-black p-4 bg-amber-50">
                                  <span className="font-bold uppercase text-xs text-gray-600 block mb-3">🧪 Fragrance Blend</span>
                                  <div className="space-y-2">
                                    {recipe.fragrances.map((frag: any, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center border-b border-gray-300 pb-1">
                                        <span className="font-bold text-lg">{frag.name}</span>
                                        <span className="text-2xl font-bold bg-black text-white px-3 py-1 rounded">
                                          {frag.percentage}%
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Legacy single fragrance field fallback */}
                              {recipe.fragrance && !recipe.fragrances?.length && (
                                <div className="border-b-2 border-black pb-2">
                                  <span className="font-bold uppercase text-xs text-gray-500 block mb-1">Fragrance</span>
                                  <span className="text-xl font-bold">{recipe.fragrance}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Other Attributes */}
                          {displayAttributes.length > 0 && (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              {displayAttributes.map((attr: any) => (
                                <div key={attr.key} className="border-b border-gray-300 pb-1">
                                  <span className="font-bold uppercase text-xs text-gray-500 block mb-1">{attr.key}</span>
                                  <span className="text-md">{attr.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div>
                        <span className="font-bold uppercase text-xs text-gray-500 block mb-1">Scent</span>
                        <span className="text-md font-medium">{productInfo?.scent || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-bold uppercase text-xs text-gray-500 block mb-1">Vibe</span>
                        <span className="text-md font-medium">{productInfo?.vibe || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-bold uppercase text-xs text-gray-500 block mb-1">Vessel</span>
                        <span className="text-md font-medium">{productInfo?.vessel || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Production Checklist (Custom Only) */}
                {isCustom && (
                  <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-300 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-gray-400 tracking-widest">Production Steps</span>
                    <div className="flex gap-8">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 border-2 border-black rounded-sm"></div>
                        <span className="uppercase font-bold text-sm">Poured</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 border-2 border-black rounded-sm"></div>
                        <span className="uppercase font-bold text-sm">Cured</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 border-2 border-black rounded-sm"></div>
                        <span className="uppercase font-bold text-sm">Packed</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 pt-6 border-t-2 border-black text-center text-sm text-gray-500">
          <p>Three Chicks and a Wick Production Ticket • Generated {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div >
  );
}
