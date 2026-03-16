"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, FileText, Building2, Users, ShoppingCart, CalendarDays, Settings, Contact } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { useMemo } from "react"

export function DashboardSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/orcamentos", label: "Orçamentos", icon: FileText },
    { href: "/clientes", label: "Clientes", icon: Contact },
    { href: "/obras", label: "Obras", icon: Building2 },
    { href: "/calendario", label: "Calendário", icon: CalendarDays },
    { href: "/pedidos", label: "Compras", icon: ShoppingCart },
    { href: "/cadastros", label: "Cadastros", icon: Settings },
    { href: "/usuarios", label: "Usuários", icon: Users },
  ]

  const rolesUpper = useMemo(() => {
    const rs = (session?.user as any)?.roles ?? []
    return Array.isArray(rs) ? rs.map((r: string) => String(r).toUpperCase()) : []
  }, [session])

  const canSeeAdmin = rolesUpper.includes("ADMIN") || rolesUpper.includes("DEV")
  const isVendedor = rolesUpper.includes("VENDEDOR") && !canSeeAdmin

  const allowedNavItems = useMemo(() => {
    if (isVendedor) {
      return navItems.filter((item) => ["Home", "Orçamentos"].includes(item.label))
    }
    return navItems
  }, [isVendedor])

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">G</span>
        </div>
        <span className="text-xl font-bold tracking-tight">Grandesign</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {allowedNavItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-xs font-medium">AD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Admin</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">admin@grandesign.com</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
