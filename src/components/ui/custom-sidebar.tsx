"use client"

import * as React from "react"
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import {
  HomeIcon,
  PlusIcon,
  LogOutIcon,
  ClockIcon,
  Loader2,
  Users2,
  HardHat,
  ShoppingCart,
  CalendarDays,
  Settings as SettingsIcon,
  Contact,
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  BarChart3,
  Scale,
  TrendingUp,
  ChevronDown,
} from "lucide-react"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { signOut, useSession } from "next-auth/react"
import versionInfo from "@/../version.json"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// --- TYPES ---
type MenuItem = {
  label: string
  href: string
  icon: any
  roles?: string[] // if set, user needs one of these roles
}

type MenuGroup = {
  id: string
  label: string
  items: MenuItem[]
}

// --- DATA ---
const MENU_GROUPS: MenuGroup[] = [
  {
    id: "gerar",
    label: "Gerar",
    items: [
      { label: "Novo Orçamento", href: "/orcamento/new", icon: PlusIcon },
    ],
  },
  {
    id: "gerenciar",
    label: "Gerenciar",
    items: [
      { label: "Orçamentos", href: "/orcamento", icon: ClockIcon },
      { label: "Clientes", href: "/clientes", icon: Contact },
      { label: "Obras", href: "/obras", icon: HardHat },
      { label: "Calendário", href: "/calendario", icon: CalendarDays },
      { label: "Pedidos de Compra", href: "/pedido_compra", icon: ShoppingCart },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    items: [
      { label: "Dashboard", href: "/dashboard-financeiro", icon: LayoutDashboard },
      { label: "Contas a Pagar", href: "/contas-pagar", icon: ArrowDownCircle },
      { label: "Contas a Receber", href: "/contas-receber", icon: ArrowUpCircle },
      { label: "Transações", href: "/lancamentos", icon: ArrowLeftRight },
    ],
  },
  {
    id: "relatorios",
    label: "Relatórios",
    items: [
      { label: "DRE", href: "/relatorios/resultado-operacional", icon: BarChart3 },
      { label: "Balancete", href: "/relatorios/balancete", icon: Scale },
      { label: "Orçado x Realizado", href: "/relatorios/orcado-realizado", icon: BarChart3 },
      { label: "Fluxo de Caixa", href: "/relatorios/fluxo-caixa", icon: TrendingUp },
    ],
  },
  {
    id: "configuracoes",
    label: "Configurações",
    items: [
      { label: "Cadastros", href: "/cadastros", icon: SettingsIcon },
      { label: "Usuários", href: "/admin/users", icon: Users2, roles: ["ADMIN", "DEV"] },
    ],
  },
]

function formatPtBR(dateIso: string) {
  try {
    const d = new Date(dateIso)
    return new Intl.DateTimeFormat("pt-BR").format(d)
  } catch {
    return "-"
  }
}

export function CustomSidebar() {
  const { open: isOpen } = useSidebar()
  const { data: session } = useSession()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)

  // Compact Mode State
  const [isCompact, setIsCompact] = useState(false)

  // Accordion State
  // Default open based on pathname
  const defaultOpen = useMemo(() => {
    for (const group of MENU_GROUPS) {
      if (group.items.some(item => pathname.startsWith(item.href))) {
        return group.id
      }
    }
    return "gerenciar" // Default fallback
  }, [pathname])

  const [activeGroupId, setActiveGroupId] = useState<string | null>(defaultOpen)

  // Listen for resize to set compact mode
  useEffect(() => {
    const checkHeight = () => {
      setIsCompact(window.innerHeight < 800)
    }
    checkHeight()
    window.addEventListener("resize", checkHeight)
    return () => window.removeEventListener("resize", checkHeight)
  }, [])

  // Auto-expand group if navigating to a link inside it
  useEffect(() => {
    for (const group of MENU_GROUPS) {
      if (group.items.some(item => pathname.startsWith(item.href))) {
        if (activeGroupId !== group.id) {
          setActiveGroupId(group.id)
        }
        break
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Helpers
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const iconClass = (active: boolean) =>
    cn(
      "transition-all duration-300",
      isCompact ? "size-4" : "size-5",
      active && "text-primary scale-110",
      !active && "text-muted-foreground group-hover:text-foreground"
    )

  async function handleLogout() {
    try {
      setLoggingOut(true)
      await signOut({ callbackUrl: "/login", redirect: true })
    } finally {
      setLoggingOut(false)
    }
  }

  const rolesUpper = useMemo(() => {
    const rs = (session?.user as any)?.roles ?? []
    return Array.isArray(rs) ? rs.map((r: any) => String(r).toUpperCase()) : []
  }, [session])

  const checkRole = (itemRoles?: string[]) => {
    if (!itemRoles) return true
    return itemRoles.some(r => rolesUpper.includes(r))
  }

  const toggleGroup = (id: string) => {
    setActiveGroupId(prev => prev === id ? null : id)
  }

  // --- RENDER ---

  return (
    <motion.aside
      initial={{ width: isOpen ? 240 : 80 }}
      animate={{ width: isOpen ? 240 : 80 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "h-screen bg-sidebar border-r border-zinc-200 transition-all flex flex-col overflow-hidden select-none",
        isCompact ? "text-sm" : "text-base"
      )}
    >
      {/* HEADER */}
      <SidebarHeader className={cn("justify-center px-4", isCompact ? "py-2" : "py-4")}>
        <motion.div
          layout
          className={cn("flex items-center", !isOpen && "justify-center")}
        >
          <Image
            src="/favicon.ico"
            alt="Logo"
            width={isCompact ? 24 : 32}
            height={isCompact ? 24 : 32}
            className="transition-transform duration-300 hover:scale-110"
          />
          {isOpen && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className={cn("ml-2 font-bold text-marromEscuro whitespace-nowrap", isCompact && "text-sm")}
            >
              GRANDESIGN
            </motion.span>
          )}
        </motion.div>
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
        <SidebarMenu className={cn("gap-1", isCompact ? "p-1" : "p-2")}>
          <TooltipProvider delayDuration={300}>

            {/* HOME */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={!isOpen ? "Home" : undefined}
                isActive={pathname === "/"}
                className={cn(
                  isOpen ? "justify-start" : "justify-center",
                  "hover:bg-black/5 transition-all duration-200 rounded-none border-l-2 border-transparent",
                  pathname === "/" && "bg-black/5 border-l-primary font-medium",
                  isCompact ? "h-9" : "h-11"
                )}
              >
                <Link href="/">
                  <HomeIcon className={iconClass(pathname === "/")} />
                  {isOpen && <span className="ml-3">Home</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <div className="h-px w-full bg-black/5 my-1" />

            {/* GROUPS */}
            {MENU_GROUPS.map((group) => {
              const visibleItems = group.items.filter(item => checkRole(item.roles))
              if (visibleItems.length === 0) return null

              const isExpanded = activeGroupId === group.id

              // --- COLLAPSED MODE RENDERING ---
              if (!isOpen) {
                return (
                  <React.Fragment key={group.id}>
                    {/* Divider / Group Indicator */}
                    <div className="flex justify-center my-2">
                      <div className="w-8 h-px bg-black/5" />
                    </div>

                    {/* Items */}
                    {visibleItems.map(item => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          tooltip={item.label}
                          isActive={isActive(item.href)}
                          className={cn(
                            "justify-center hover:bg-black/5 transition-all duration-200 rounded-md",
                            isActive(item.href) && "bg-black/5 text-primary",
                            isCompact ? "h-9" : "h-10"
                          )}
                        >
                          <Link href={item.href}>
                            <item.icon className={iconClass(isActive(item.href))} />
                            <span className="sr-only">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </React.Fragment>
                )
              }

              // --- EXPANDED MODE RENDERING (ACCORDION) ---
              return (
                <SidebarGroup key={group.id} className="p-0">
                  {/* Accordion Trigger */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-black/5 rounded-sm text-foreground/70 transition-colors group",
                      isCompact ? "my-0.5" : "my-1"
                    )}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                      {group.label}
                    </span>
                    <ChevronDown
                      className={cn("size-3 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")}
                    />
                  </button>

                  {/* Accordion Content */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "circOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-1 pb-2">
                          {visibleItems.map(item => (
                            <SidebarMenuItem key={item.href}>
                              <SidebarMenuButton
                                asChild
                                isActive={isActive(item.href)}
                                className={cn(
                                  "justify-start hover:bg-black/5 transition-all duration-200 border-l-2 border-transparent pl-3",
                                  isActive(item.href) && "bg-black/5 border-l-primary font-medium",
                                  isCompact ? "h-8 text-xs" : "h-10 text-sm"
                                )}
                              >
                                <Link href={item.href}>
                                  <item.icon className={iconClass(isActive(item.href))} />
                                  <span className="ml-3 truncate">{item.label}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </SidebarGroup>
              )
            })}
          </TooltipProvider>
        </SidebarMenu>
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter className={cn("hover:bg-transparent mt-auto border-t border-black/5 bg-sidebar", isCompact ? "p-1" : "p-2")}>
        <SidebarMenu>
          <TooltipProvider>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                disabled={loggingOut}
                tooltip={!isOpen ? "Sair" : undefined}
                className={cn(
                  isOpen ? "justify-start" : "justify-center",
                  "hover:bg-red-50 hover:text-red-600 transition-colors text-muted-foreground",
                  isCompact ? "h-8" : "h-10"
                )}
              >
                {loggingOut ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <LogOutIcon className="size-5" />
                )}
                {isOpen && <span className="ml-3 font-medium">{loggingOut ? "Saindo..." : "Sair"}</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </TooltipProvider>
        </SidebarMenu>

        {isOpen && (
          <div className={cn(
            "w-full flex items-center justify-center text-muted-foreground/50 font-mono select-none",
            isCompact ? "pt-1 text-[9px]" : "pt-2 text-[10px]"
          )}>
            <span>v{versionInfo.version}</span>
          </div>
        )}
      </SidebarFooter>
    </motion.aside>
  )
}
