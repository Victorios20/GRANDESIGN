"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  ArrowRightToLine,
  ChevronDown,
  Loader2,
  type LucideIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  SIDEBAR_NAVIGATION,
  type SidebarChildItem,
  type SidebarGroupItem,
  type SidebarLinkItem,
  type SidebarNavigationItem,
  filterSidebarNavigation,
  getActiveGroupIds,
  isActivePath,
  isSidebarGroupItem,
  isSidebarLinkItem,
} from "@/components/ui/sidebar-navigation"
import { cn } from "@/lib/utils"

const SIDEBAR_THEME = {
  "--sidebar": "#FFFCF7",
  "--sidebar-foreground": "#2C201B",
  "--sidebar-accent": "#F8EFD9",
  "--sidebar-accent-foreground": "#2C201B",
  "--sidebar-border": "rgba(44, 32, 27, 0.08)",
  "--sidebar-ring": "rgba(245, 209, 147, 0.72)",
} as React.CSSProperties

const focusRingClass =
  "focus-visible:ring-2 focus-visible:ring-[#F5D193]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFCF7] outline-none"

type SidebarNavIconProps = {
  icon?: LucideIcon
  active?: boolean
  compact?: boolean
}

function SidebarNavIcon({
  icon: Icon,
  active = false,
  compact = false,
}: SidebarNavIconProps) {
  if (!Icon) {
    return null
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center border transition-[background-color,border-color,color] duration-150 ease-out",
        "size-7 rounded-[10px]",
        compact && "size-8 rounded-[12px]",
        active
          ? "border-[#393316]/16 bg-[#393316]/8 text-[#393316]"
          : "border-[#2C201B]/8 bg-white/35 text-[#2C201B]/58 group-hover/sidebar-link:border-[#2C201B]/14 group-hover/sidebar-link:bg-white/70 group-hover/sidebar-link:text-[#2C201B]/88"
      )}
    >
      <Icon
        className={cn(
          "shrink-0",
          compact ? "size-[17.5px]" : "size-[16.5px]"
        )}
        strokeWidth={1.95}
      />
    </span>
  )
}

function getUserInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "Grandesign"
  const parts = source.split(/\s+/).filter(Boolean)

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase()
}

export function CustomSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { state, isMobile } = useSidebar()
  const [loggingOut, setLoggingOut] = React.useState(false)
  const [openGroupIds, setOpenGroupIds] = React.useState<string[]>(() =>
    getActiveGroupIds(pathname, SIDEBAR_NAVIGATION)
  )
  const sessionUser = session?.user as
    | {
        name?: string | null
        email?: string | null
        image?: string | null
        roles?: unknown[]
      }
    | undefined

  const isCollapsed = !isMobile && state === "collapsed"

  const rolesUpper = React.useMemo(() => {
    const roles = sessionUser?.roles ?? []
    return Array.isArray(roles) ? roles.map((role) => String(role).toUpperCase()) : []
  }, [sessionUser])

  const navigationItems = React.useMemo(
    () => filterSidebarNavigation(SIDEBAR_NAVIGATION, rolesUpper),
    [rolesUpper]
  )
  const activeGroupIds = React.useMemo(
    () => getActiveGroupIds(pathname, navigationItems),
    [navigationItems, pathname]
  )

  React.useEffect(() => {
    if (activeGroupIds.length === 0) {
      return
    }

    setOpenGroupIds(activeGroupIds)
  }, [activeGroupIds])

  const toggleGroup = React.useCallback((groupId: string) => {
    setOpenGroupIds((current) =>
      current.includes(groupId)
        ? []
        : [groupId]
    )
  }, [])

  async function handleLogout() {
    try {
      setLoggingOut(true)
      await signOut({ callbackUrl: "/login", redirect: true })
    } finally {
      setLoggingOut(false)
    }
  }

  const renderLinkItem = React.useCallback(
    ({
      item,
      nested = false,
      compact = false,
    }: {
      item: SidebarLinkItem | SidebarChildItem
      nested?: boolean
      compact?: boolean
    }) => {
      const active = isActivePath(pathname, item.href)

      return (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={active}
            tooltip={isCollapsed && !nested ? item.label : undefined}
            className={cn(
              "group/sidebar-link transition-[background-color,border-color,color] duration-150 ease-out",
              focusRingClass,
              nested
                ? "relative flex h-[34px] w-full items-center rounded-none -ml-[1px] border-l-[2px] border-transparent bg-transparent pl-4 text-[13px] font-medium text-[#2C201B]/60 hover:bg-transparent hover:text-[#2C201B] data-[active=true]:border-[#393316] data-[active=true]:bg-transparent data-[active=true]:font-semibold data-[active=true]:text-[#2C201B]"
                : "flex items-center gap-3 px-3 h-[44px] rounded-[14px] text-sm font-semibold text-[#2C201B]/84 hover:bg-[#F7F0E1] hover:text-[#2C201B] data-[active=true]:bg-[#FAF3E0] data-[active=true]:text-[#393316] shadow-[inset_0_0_0_1px_rgba(44,32,27,0)]",
              compact && "h-[44px] w-[44px] justify-center px-0 rounded-[14px]",
              isCollapsed && !nested && "h-[44px] w-[44px] justify-center px-0 rounded-[14px]"
            )}
          >
            <Link href={item.href} aria-current={active ? "page" : undefined}>
              {!nested ? (
                <SidebarNavIcon
                  icon={item.icon}
                  active={active}
                  compact={compact || isCollapsed}
                />
              ) : null}
              {!compact ? <span className="truncate">{item.label}</span> : <span className="sr-only">{item.label}</span>}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    },
    [isCollapsed, pathname]
  )

  const renderCollapsedGroup = React.useCallback(
    (group: SidebarGroupItem) => {
      const groupActive = group.children.some((item) => isActivePath(pathname, item.href))

      return (
        <SidebarMenuItem key={group.id}>
          <Popover>
            <PopoverTrigger asChild>
              <SidebarMenuButton
                type="button"
                isActive={groupActive}
                tooltip={group.label}
                className={cn(
                  "group/sidebar-link h-[44px] w-[44px] justify-center rounded-[14px] p-0 text-[#2C201B]/84 transition-[background-color,color] duration-150 ease-out",
                  "hover:bg-[#F7F0E1] hover:text-[#2C201B] data-[active=true]:bg-[#FAF3E0] data-[active=true]:text-[#393316]",
                  focusRingClass
                )}
              >
                <SidebarNavIcon icon={group.icon} active={groupActive} compact />
                <span className="sr-only">{group.label}</span>
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="start"
              sideOffset={14}
              className="w-[248px] rounded-[18px] border border-[#2C201B]/10 bg-[#FFFCF7] p-2 shadow-[0_12px_30px_rgba(44,32,27,0.08)]"
            >
              <div className="px-2 pb-2 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-[#2C201B]/44">
                {group.label}
              </div>
              <div className="ml-2 border-l border-[#2C201B]/10 py-1">
                <SidebarMenu className="gap-0">
                  {group.children.map((child) =>
                    renderLinkItem({ item: child, nested: true, compact: false })
                  )}
                </SidebarMenu>
              </div>
            </PopoverContent>
          </Popover>
        </SidebarMenuItem>
      )
    },
    [pathname, renderLinkItem]
  )

  const renderExpandedGroup = React.useCallback(
    (group: SidebarGroupItem) => {
      const isOpen = openGroupIds.includes(group.id)
      const groupActive = group.children.some((item) => isActivePath(pathname, item.href))
      const contentId = `sidebar-group-${group.id}`

      return (
        <SidebarGroup key={group.id} className="gap-0 p-0">
          <button
            type="button"
            onClick={() => toggleGroup(group.id)}
            aria-expanded={isOpen}
            aria-controls={contentId}
            className={cn(
              "group/sidebar-link flex h-[44px] w-full items-center justify-between rounded-[14px] px-3 text-left text-sm font-semibold transition-[background-color,color] duration-150 ease-out",
              focusRingClass,
              groupActive
                ? "bg-[#FAF3E0] text-[#393316]"
                : isOpen
                  ? "bg-[#F8F0E1] text-[#2C201B]"
                  : "text-[#2C201B]/84 hover:bg-[#F7F0E1] hover:text-[#2C201B]"
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <SidebarNavIcon icon={group.icon} active={groupActive || isOpen} />
              <span className="truncate">{group.label}</span>
            </div>
            <ChevronDown
              className={cn(
                "size-[17px] shrink-0 text-[#2C201B]/42 transition-transform duration-200 ease-out",
                isOpen && "rotate-180"
              )}
              strokeWidth={1.9}
            />
          </button>

          <div
            className={cn(
              "grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-200 ease-out",
              isOpen ? "mt-1.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <SidebarGroupContent id={contentId} className="overflow-hidden pl-4 pr-1">
              <div className="relative mt-1 ml-4 border-l border-[#2C201B]/10 py-1">
                <SidebarMenu className="gap-0">
                  {group.children.map((child) =>
                    renderLinkItem({ item: child, nested: true, compact: false })
                  )}
                </SidebarMenu>
              </div>
            </SidebarGroupContent>
          </div>
        </SidebarGroup>
      )
    },
    [openGroupIds, pathname, renderLinkItem, toggleGroup]
  )

  const renderNavigationItem = React.useCallback(
    (item: SidebarNavigationItem, index: number) => {
      if (item.type === "section") {
        if (isCollapsed) {
          return null
        }

        return (
          <div
            key={`${item.label}-${index}`}
            className={cn(
              "px-2 pb-2 pt-6 text-[10.5px] font-semibold uppercase tracking-[0.28em] text-[#2C201B]/42",
              index > 0 && "mt-2"
            )}
          >
            {item.label}
          </div>
        )
      }

      if (isSidebarLinkItem(item)) {
        return (
          <SidebarMenu key={item.href} className="gap-0">
            {renderLinkItem({ item, compact: isCollapsed })}
          </SidebarMenu>
        )
      }

      if (isSidebarGroupItem(item)) {
        return isCollapsed ? (
          <SidebarMenu key={item.id} className="gap-0">
            {renderCollapsedGroup(item)}
          </SidebarMenu>
        ) : (
          renderExpandedGroup(item)
        )
      }

      return null
    },
    [isCollapsed, renderCollapsedGroup, renderExpandedGroup, renderLinkItem]
  )

  const primaryIdentity = sessionUser?.name?.trim() || sessionUser?.email?.trim() || "Arthur"
  const secondaryIdentity =
    sessionUser?.name?.trim() && sessionUser.email?.trim()
      ? sessionUser.email.trim()
      : "Conta ativa"
  const userImage = sessionUser?.image || undefined
  const userInitials = getUserInitials(sessionUser?.name, sessionUser?.email)

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="border-r-0"
      style={SIDEBAR_THEME}
    >
      <SidebarHeader className="border-b border-[#2C201B]/8 px-4 py-5">
        <div className={cn("flex items-center gap-3.5", isCollapsed && "justify-center")}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-[#2C201B]/6 bg-[#FAF3E0]/80">
            <Image
              src="/images/logo.png"
              alt="Logo da GRANDESIGN"
              width={34}
              height={34}
              className="h-8 w-8 object-contain"
            />
          </div>
          {!isCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[0.04em] text-[#2C201B]">
                GRANDESIGN
              </p>
            </div>
          ) : null}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <div className="flex flex-col gap-1">
          {navigationItems.map((item, index) => renderNavigationItem(item, index))}
        </div>
      </SidebarContent>

      <SidebarSeparator className="bg-[#2C201B]/8" />

      <SidebarFooter className="px-3 py-4">
        <div className={cn("rounded-[18px] border border-[#2C201B]/10 bg-[#FCF8EF] p-3", isCollapsed && "p-2.5")}>
          <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
            <Avatar className="size-11 border border-[#2C201B]/8 bg-white/70">
              <AvatarImage src={userImage} alt={primaryIdentity} className="object-cover" />
              <AvatarFallback className="bg-[#FAF3E0] text-xs font-semibold text-[#2C201B]">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#2C201B]">{primaryIdentity}</p>
                <p className="truncate text-xs font-medium text-[#2C201B]/52">{secondaryIdentity}</p>
              </div>
            ) : null}
          </div>

          <div className={cn("mt-3 border-t border-[#2C201B]/8 pt-2", isCollapsed && "mt-2")}>
            <SidebarMenu className="gap-0">
              <SidebarMenuItem>
                <SidebarMenuButton
                  type="button"
                  tooltip={isCollapsed ? "Sair" : undefined}
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className={cn(
                    "h-[38px] rounded-[12px] px-2.5 text-[13.5px] font-medium text-[#2C201B]/62 transition-[background-color,color] duration-150 ease-out",
                    "hover:bg-white/80 hover:text-[#2C201B]",
                    focusRingClass,
                    isCollapsed && "h-[40px] w-full justify-center rounded-[14px] p-0"
                  )}
                >
                  {loggingOut ? (
                    <Loader2 className="size-4 animate-spin" strokeWidth={1.9} />
                  ) : (
                    <ArrowRightToLine className="size-4" strokeWidth={1.9} />
                  )}
                  {!isCollapsed ? (
                    <span>{loggingOut ? "Saindo..." : "Sair"}</span>
                  ) : (
                    <span className="sr-only">Sair</span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
