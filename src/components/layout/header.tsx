
"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"
import { usePathname } from "next/navigation"

function getTitleFromPathname(pathname: string): string {
    if (pathname === '/') return 'Image Studio';
    if (pathname.startsWith('/products/new')) return 'Add New Product';
    if (pathname.startsWith('/products')) return 'Products';
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    if (pathname.startsWith('/strategy')) return 'AI Business Strategy';
    if (pathname.startsWith('/settings')) return 'Settings';

    // Fallback for other routes
    const title = pathname.split('/').pop()?.replace(/-/g, ' ') || 'Admin';
    return title.charAt(0).toUpperCase() + title.slice(1);
}

export function Header() {
  const pathname = usePathname();
  const title = getTitleFromPathname(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex w-full items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl hidden sm:block">{title}</h1>
        <div className="hidden">
          {/* Profile icon removed - user info is already in sidebar */}
        </div>
      </div>
    </header>
  )
}
