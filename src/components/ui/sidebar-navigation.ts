"use client"

import type { LucideIcon } from "lucide-react"
import {
  ArrowLeftRight,
  CalendarDays,
  ChartColumnIncreasing,
  ChartSpline,
  CircleDollarSign,
  ClipboardList,
  ClipboardPenLine,
  Construction,
  FileChartColumnIncreasing,
  FolderCog,
  GitBranch,
  HandCoins,
  HardHat,
  House,
  Landmark,
  LayoutDashboard,
  PackageCheck,
  ReceiptText,
  Scale,
  SlidersHorizontal,
  Tags,
  UserCog,
  UserRound,
  Users2,
  Wrench,
} from "lucide-react"
import { isRestrictedVendedor, isVendedorAllowedPage } from "@/lib/vendedor-access"

export type SidebarChildItem = {
  label: string
  href: string
  icon?: LucideIcon
  roles?: string[]
}

export type SidebarLinkItem = {
  type: "link"
  label: string
  href: string
  icon: LucideIcon
  roles?: string[]
}

export type SidebarGroupItem = {
  type: "group"
  id: string
  label: string
  icon: LucideIcon
  children: SidebarChildItem[]
}

export type SidebarSectionItem = {
  type: "section"
  label: string
}

export type SidebarNavigationItem =
  | SidebarLinkItem
  | SidebarGroupItem
  | SidebarSectionItem

export type BreadcrumbItem = {
  href: string
  label: string
}

export const SIDEBAR_NAVIGATION: SidebarNavigationItem[] = [
  {
    type: "link",
    label: "Home",
    href: "/",
    icon: House,
  },
  {
    type: "section",
    label: "Módulos",
  },
  {
    type: "link",
    label: "Clientes",
    href: "/clientes",
    icon: UserRound,
  },
  {
    type: "link",
    label: "Orçamentos",
    href: "/orcamento",
    icon: ClipboardPenLine,
  },
  {
    type: "group",
    id: "operacional",
    label: "Operacional",
    icon: Construction,
    children: [
      {
        label: "Obras",
        href: "/obras",
        icon: HardHat,
      },
      {
        label: "Calendário",
        href: "/calendario",
        icon: CalendarDays,
      },
      {
        label: "Pedidos de Compra",
        href: "/pedido_compra",
        icon: PackageCheck,
      },
    ],
  },
  {
    type: "group",
    id: "financeiro",
    label: "Financeiro",
    icon: CircleDollarSign,
    children: [
      {
        label: "Dashboard",
        href: "/dashboard-financeiro",
        icon: LayoutDashboard,
      },
      {
        label: "Contas a Pagar",
        href: "/contas-pagar",
        icon: ReceiptText,
      },
      {
        label: "Contas a Receber",
        href: "/contas-receber",
        icon: HandCoins,
      },
      {
        label: "Transações",
        href: "/lancamentos",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    type: "group",
    id: "relatorios",
    label: "Relatórios",
    icon: ChartColumnIncreasing,
    children: [
      {
        label: "Performance Equipe",
        href: "/relatorios/equipe",
        icon: Users2,
      },
      {
        label: "DRE",
        href: "/relatorios/resultado-operacional",
        icon: FileChartColumnIncreasing,
      },
      {
        label: "Balancete",
        href: "/relatorios/balancete",
        icon: Scale,
      },
      {
        label: "Orçado x Realizado",
        href: "/relatorios/orcado-realizado",
        icon: ClipboardList,
      },
      {
        label: "Fluxo de Caixa",
        href: "/relatorios/fluxo-caixa",
        icon: ChartSpline,
      },
    ],
  },
  {
    type: "group",
    id: "configuracoes",
    label: "Configurações",
    icon: Wrench,
    children: [
      {
        label: "Cadastros",
        href: "/cadastros",
        icon: FolderCog,
      },
      {
        label: "Parametrizações",
        href: "/configuracoes/parametrizacoes",
        icon: SlidersHorizontal,
        roles: ["ADMIN", "DEV"],
      },
      {
        label: "Contas Bancárias",
        href: "/configuracoes/contas-bancarias",
        icon: Landmark,
        roles: ["ADMIN", "DEV"],
      },
      {
        label: "Centros de Custo",
        href: "/configuracoes/centros-custo",
        icon: GitBranch,
        roles: ["ADMIN", "DEV"],
      },
      {
        label: "Categorias Financeiras",
        href: "/configuracoes/categorias-financeiras",
        icon: Tags,
        roles: ["ADMIN", "DEV"],
      },
      {
        label: "Usuários",
        href: "/admin/users",
        icon: UserCog,
        roles: ["ADMIN", "DEV"],
      },
    ],
  },
]

export function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function isSidebarLinkItem(
  item: SidebarNavigationItem
): item is SidebarLinkItem {
  return item.type === "link"
}

export function isSidebarGroupItem(
  item: SidebarNavigationItem
): item is SidebarGroupItem {
  return item.type === "group"
}

function hasRequiredRole(itemRoles: string[] | undefined, rolesUpper: string[]) {
  if (!itemRoles || itemRoles.length === 0) {
    return true
  }

  return itemRoles.some((role) => rolesUpper.includes(role))
}

export function filterSidebarNavigation(
  items: SidebarNavigationItem[],
  rolesUpper: string[]
): SidebarNavigationItem[] {
  const isVendedor = isRestrictedVendedor(rolesUpper)

  return items.reduce<SidebarNavigationItem[]>((result, item) => {
    if (item.type === "section") {
      result.push(item)
      return result
    }

    if (item.type === "link") {
      if (
        hasRequiredRole(item.roles, rolesUpper) &&
        (!isVendedor || isVendedorAllowedPage(item.href))
      ) {
        result.push(item)
      }

      return result
    }

    const children = item.children.filter(
      (child) =>
        hasRequiredRole(child.roles, rolesUpper) &&
        (!isVendedor || isVendedorAllowedPage(child.href))
    )

    if (children.length === 0) {
      return result
    }

    result.push({ ...item, children })
    return result
  }, [])
}

export function getActiveGroupIds(
  pathname: string,
  items: SidebarNavigationItem[]
) {
  return items.flatMap((item) => {
    if (item.type !== "group") {
      return []
    }

    return item.children.some((child) => isActivePath(pathname, child.href))
      ? [item.id]
      : []
  })
}

function normalizePath(path: string) {
  if (!path || path === "/") {
    return "/"
  }

  return path.endsWith("/") ? path.slice(0, -1) : path
}

export function getNavigationBreadcrumbs(pathname: string): BreadcrumbItem[] | null {
  const normalizedPath = normalizePath(pathname)

  if (normalizedPath === "/") {
    return [{ href: "/", label: "Home" }]
  }

  for (const item of SIDEBAR_NAVIGATION) {
    if (item.type === "section") {
      continue
    }

    if (item.type === "link" && isActivePath(normalizedPath, item.href)) {
      return [
        { href: "/", label: "Home" },
        { href: item.href, label: item.label },
      ]
    }

    if (item.type !== "group") {
      continue
    }

    const child = item.children.find((entry) => isActivePath(normalizedPath, entry.href))

    if (!child) {
      continue
    }

    return [
      { href: "/", label: "Home" },
      { href: "#", label: item.label },
      { href: child.href, label: child.label },
    ]
  }

  return null
}
