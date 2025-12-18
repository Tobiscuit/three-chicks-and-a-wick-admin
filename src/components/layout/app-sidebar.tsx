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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Camera,
  LayoutDashboard,
  BrainCircuit,
  Package,
  Settings,
  Flame,
  Wand2,
  ShoppingCart,
  LogOut,
  Moon,
  Sun,
  ChevronUp,
  Palette,
  Store,
  Monitor,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from "../auth/auth-provider"
import { useEffect, useState } from "react"
import { getOrders } from "@/services/shopify"
import { auth } from "@/lib/firebase"
import { useTheme } from "next-themes"
import { getLastReadStrategyAt } from "@/services/user-settings"
import { getCachedStrategy } from "@/lib/background-strategy"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingCart, showBadge: true },
  { href: "/products", label: "Products", icon: Package },
  { href: "/magic-request", label: "Magic Request", icon: Wand2 },
  { href: "/strategy", label: "Strategy", icon: BrainCircuit, showStrategyBadge: true },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [unfulfilledCount, setUnfulfilledCount] = useState<number | null>(null)
  const [hasUnreadStrategy, setHasUnreadStrategy] = useState(false)

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

  // Check if strategy is unread
  useEffect(() => {
    async function checkUnreadStrategy() {
      if (!user?.uid) return
      
      try {
        // Get user's last read timestamp
        const lastReadAt = await getLastReadStrategyAt(user.uid)
        
        // Get cached strategy's generated timestamp
        const cached = await getCachedStrategy(user.uid)
        
        if (cached && cached.generatedAt) {
          // Strategy is unread if it was generated after last read (or never read)
          const isUnread = !lastReadAt || cached.generatedAt > lastReadAt
          setHasUnreadStrategy(isUnread)
        }
      } catch (error) {
        console.error("Failed to check unread strategy:", error)
      }
    }
    
    checkUnreadStrategy()
    
    // Re-check when pathname changes (user might have viewed /strategy)
    if (pathname === '/strategy') {
      // Small delay to let the markAsRead complete
      const timeout = setTimeout(() => setHasUnreadStrategy(false), 500)
      return () => clearTimeout(timeout)
    }
  }, [user?.uid, pathname])

  // Determine user role based on email
  let userRole = "Admin"; // Default role
  if (user?.email === 'threechicksandawick@gmail.com') {
    userRole = "Store Owner";
  }

  // Determine the first letter for the Avatar fallback
  const fallbackLetter = user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : "A");

  const handleLogout = async () => {
    await auth.signOut()
  }

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
                {/* Unread strategy indicator - subtle dot */}
                {item.showStrategyBadge && hasUnreadStrategy && (
                  <SidebarMenuBadge className="bg-primary text-primary-foreground h-2 w-2 p-0 rounded-full animate-pulse">
                    <span className="sr-only">New strategy available</span>
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="items-center">
        <Separator className="my-2" />
        {/* User Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between p-2 rounded-md transition-colors hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring cursor-pointer">
              <div className="flex items-center gap-3">
                {/* Avatar with subtle ring glow */}
                <Avatar className="h-9 w-9 ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-all duration-300 group-hover:ring-primary/40 motion-reduce:transition-none">
                  <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "Admin"} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">{fallbackLetter}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate text-left" data-sidebar="user-info">
                  <span className="text-sm font-medium text-foreground">{userRole}</span>
                  <span className="text-xs text-muted-foreground truncate">{user?.displayName || user?.email}</span>
                </div>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-56 animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.displayName || userRole}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Theme Toggle */}
            <DropdownMenuItem 
              onClick={() => setTheme('light')}
              className="cursor-pointer"
            >
              <Sun className="mr-2 h-4 w-4" />
              <span>Light Mode</span>
              {theme === 'light' && <span className="ml-auto text-xs text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setTheme('dark')}
              className="cursor-pointer"
            >
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark Mode</span>
              {theme === 'dark' && <span className="ml-auto text-xs text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setTheme('storefront')}
              className="cursor-pointer"
            >
              <Store className="mr-2 h-4 w-4" />
              <span>Storefront</span>
              {theme === 'storefront' && <span className="ml-auto text-xs text-primary">✓</span>}
            </DropdownMenuItem>
            
            {/* Settings Link */}
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {/* Logout */}
            <DropdownMenuItem 
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}


