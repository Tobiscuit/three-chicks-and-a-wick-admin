
"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { getOrders } from "@/services/shopify"

// Route to title mapping with count support
const routeTitles: Record<string, { title: string; showCount?: 'orders' | 'products' }> = {
  '/': { title: 'Image Studio' },
  '/dashboard': { title: 'Dashboard' },
  '/orders': { title: 'Orders', showCount: 'orders' },
  '/products': { title: 'Products' },
  '/products/new': { title: 'Add New Product' },
  '/magic-request': { title: 'Magic Request' },
  '/strategy': { title: 'AI Business Strategy' },
  '/settings': { title: 'Settings' },
}

function getTitleFromPathname(pathname: string): { title: string; showCount?: 'orders' | 'products' } {
  // Exact match first
  if (routeTitles[pathname]) return routeTitles[pathname]
  
  // Prefix match for nested routes
  for (const [route, config] of Object.entries(routeTitles)) {
    if (route !== '/' && pathname.startsWith(route)) return config
  }

  // Fallback for unknown routes
  const title = pathname.split('/').pop()?.replace(/-/g, ' ') || 'Admin'
  return { title: title.charAt(0).toUpperCase() + title.slice(1) }
}

export function Header() {
  const pathname = usePathname()
  const { title, showCount } = getTitleFromPathname(pathname)
  const [orderCount, setOrderCount] = useState<number | null>(null)

  useEffect(() => {
    if (showCount === 'orders') {
      getOrders(50)
        .then(orders => setOrderCount(orders.length))
        .catch(() => setOrderCount(null))
    }
  }, [showCount])

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b glass px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
          {/* Count badge for data pages */}
          {showCount === 'orders' && orderCount !== null && (
            <Badge variant="secondary" className="tabular-nums">
              {orderCount}
            </Badge>
          )}
        </div>
        <div className="hidden">
          {/* Profile icon removed - user info is already in sidebar */}
        </div>
      </div>
    </header>
  )
}

