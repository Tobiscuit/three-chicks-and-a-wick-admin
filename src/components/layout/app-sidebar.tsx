
"use client"

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarFooter,
  SidebarContent
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Camera,
  LayoutDashboard,
  BrainCircuit,
  Package,
  Settings,
  Flame,
  Wand2,
  ShoppingCart,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from 'next/navigation'
import { useAuth } from "../auth/auth-provider"
import { useEffect, useState } from "react"
import { getOrders } from "@/services/shopify"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingCart, showBadge: true },
  { href: "/products", label: "Products", icon: Package },
  { href: "/magic-request", label: "Magic Request", icon: Wand2 },
  { href: "/", label: "Image Studio", icon: Camera },
  { href: "/strategy", label: "Strategy", icon: BrainCircuit },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [unfulfilledCount, setUnfulfilledCount] = useState<number | null>(null)

  // Fetch unfulfilled order count for badge
  useEffect(() => {
    async function fetchUnfulfilledCount() {
      try {
        const orders = await getOrders(50)
        const unfulfilled = orders.filter(order => {
          const status = (order.displayFulfillmentStatus || 'UNFULFILLED').toUpperCase()
          return status === 'UNFULFILLED' || status === 'ON_HOLD' || status === 'SCHEDULED'
        })
        setUnfulfilledCount(unfulfilled.length > 0 ? unfulfilled.length : null)
      } catch (error) {
        console.error("Failed to fetch unfulfilled count:", error)
      }
    }
    fetchUnfulfilledCount()
  }, [])

  // Determine user role based on email
  let userRole = "Admin"; // Default role
  if (user?.email === 'threechicksandawick@gmail.com') {
    userRole = "Store Owner";
  }

  // Determine the first letter for the Avatar fallback
  const fallbackLetter = user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : "A");

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="h-16 items-center">
        <div className="flex items-center gap-2" data-sidebar="logo">
          {/* Logo with subtle glow on hover */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 motion-reduce:transition-none">
            <Flame className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold text-foreground">Three Chicks & a Wick</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item, index) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            
            return (
              <SidebarMenuItem 
                key={item.label}
                style={{ 
                  animationDelay: `${index * 50}ms`,
                }}
                className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2 motion-safe:duration-300"
              >
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className={`
                    relative
                    transition-all duration-200 motion-reduce:transition-none
                    hover:translate-x-0.5
                    ${isActive ? 'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:rounded-full before:bg-primary before:shadow-sm before:shadow-primary/50' : ''}
                  `}
                >
                  <Link href={item.href}>
                    <item.icon className={`transition-transform duration-200 motion-reduce:transition-none group-hover:scale-110 ${isActive ? 'text-primary' : ''}`} />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
                {/* Badge for unfulfilled orders */}
                {item.showBadge && unfulfilledCount && (
                  <SidebarMenuBadge className="bg-destructive text-destructive-foreground animate-in fade-in duration-300">
                    {unfulfilledCount > 99 ? '99+' : unfulfilledCount}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="items-center">
        <Separator className="my-2" />
        <div className="flex w-full items-center justify-between p-2">
            <div className="flex items-center gap-3">
                {/* Avatar with subtle ring glow */}
                <Avatar className="h-9 w-9 ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-all duration-300 hover:ring-primary/40 motion-reduce:transition-none">
                    <AvatarImage src={user?.photoURL || "https://picsum.photos/id/42/100/100"} alt={user?.displayName || "Admin"} data-ai-hint="woman face" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">{fallbackLetter}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate" data-sidebar="user-info">
                    <span className="text-sm font-medium text-foreground">{userRole}</span>
                    <span className="text-xs text-muted-foreground truncate">{user?.displayName || user?.email}</span>
                </div>
            </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

