
"use client"

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
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
} from "lucide-react"
import Link from "next/link"
import { usePathname } from 'next/navigation'
import { useAuth } from "../auth/auth-provider"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/", label: "Image Studio", icon: Camera },
  { href: "/magic-request", label: "Magic Request", icon: Wand2 },
  { href: "/strategy", label: "Strategy", icon: BrainCircuit },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Flame className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold text-foreground">Three Chicks & a Wick</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="items-center">
        <Separator className="my-2" />
        <div className="flex w-full items-center justify-between p-2">
            <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.photoURL || "https://picsum.photos/id/42/100/100"} alt={user?.displayName || "Admin"} data-ai-hint="woman face" />
                    <AvatarFallback>{fallbackLetter}</AvatarFallback>
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
