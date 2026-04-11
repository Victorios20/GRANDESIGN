"use client"

import React, { type PropsWithChildren } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Toaster } from "sonner"

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CustomSidebar } from "@/components/ui/custom-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { getNavigationBreadcrumbs, type BreadcrumbItem as NavigationBreadcrumbItem } from "@/components/ui/sidebar-navigation"
import { cn } from "@/lib/utils"

type Crumb = NavigationBreadcrumbItem

type PageLayoutProps = PropsWithChildren<{
  links?: Crumb[]
  backgroundImage?: boolean
  headerActions?: React.ReactNode
  title?: string
  isTitulo?: boolean
  pageBackground?: string
}>

export function PageLayout({
  children,
  links,
  backgroundImage = false,
  headerActions,
  title,
  isTitulo,
  pageBackground,
}: PageLayoutProps) {
  const pathname = usePathname() || "/"
  const breadcrumbs = buildBreadcrumbs({ pathname, links, title })

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "17rem",
          "--sidebar-width-icon": "4.5rem",
          "--sidebar": "#FFFCF7",
          "--sidebar-foreground": "#2C201B",
          "--sidebar-accent": "#F8EFD9",
          "--sidebar-accent-foreground": "#2C201B",
          "--sidebar-border": "rgba(44, 32, 27, 0.08)",
          "--sidebar-ring": "rgba(245, 209, 147, 0.72)",
        } as React.CSSProperties
      }
    >
      <CustomSidebar />
      <InnerLayout
        breadcrumbs={breadcrumbs}
        backgroundImage={backgroundImage}
        headerActions={headerActions}
        isTitulo={isTitulo}
        pageBackground={pageBackground}
      >
        {children}
      </InnerLayout>
    </SidebarProvider>
  )
}

function buildBreadcrumbs({
  pathname,
  links,
  title,
}: {
  pathname: string
  links?: Crumb[]
  title?: string
}) {
  const baseBreadcrumbs = links ?? getNavigationBreadcrumbs(pathname) ?? buildFallbackBreadcrumbs(pathname)

  if (!title) {
    return baseBreadcrumbs
  }

  const lastCrumb = baseBreadcrumbs[baseBreadcrumbs.length - 1]

  if (lastCrumb && normalizePath(lastCrumb.href) === normalizePath(pathname)) {
    return [...baseBreadcrumbs.slice(0, -1), { ...lastCrumb, label: title }]
  }

  return [...baseBreadcrumbs, { href: pathname, label: title }]
}

function buildFallbackBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter((segment) => segment.length > 0)

  return [
    { label: "Home", href: "/" },
    ...segments.map((segment, index) => ({
      href: `/${segments.slice(0, index + 1).join("/")}`,
      label: humanizeSegment(segment),
    })),
  ]
}

function humanizeSegment(segment: string) {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function normalizePath(path: string) {
  if (!path || path === "/") {
    return "/"
  }

  return path.endsWith("/") ? path.slice(0, -1) : path
}

function InnerLayout({
  children,
  breadcrumbs,
  backgroundImage,
  headerActions,
  isTitulo,
  pageBackground,
}: PropsWithChildren<{
  breadcrumbs: Crumb[]
  backgroundImage?: boolean
  headerActions?: React.ReactNode
  isTitulo?: boolean
  pageBackground?: string
}>) {
  const hasActions = !!headerActions && React.Children.count(headerActions) > 0
  const showTitleNearActions = hasActions ? (isTitulo ?? false) : true

  return (
    <SidebarInset className={cn(pageBackground ?? "bg-[#F7F4EE]", "min-w-0 overflow-hidden font-sans")}>
      {backgroundImage ? (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
          <Image src="/favicon.ico" alt="Logo centralizada de fundo" width={400} height={400} className="opacity-10" />
        </div>
      ) : null}

      <Toaster position="top-right" duration={10000} closeButton richColors offset={80} />

      <header className="relative z-10 flex h-14 items-center justify-between border-b border-[#2C201B]/8 bg-[#FFFCF7]/95 px-4 backdrop-blur md:h-16 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SidebarTrigger className="h-9 w-9 flex-shrink-0 rounded-[12px] border border-[#2C201B]/10 bg-white/70 text-[#2C201B]/76 hover:bg-[#FAF3E0] hover:text-[#2C201B]" />

          <div className="hidden min-w-0 flex-1 sm:block">
            <Breadcrumb className="flex items-center gap-1 text-sm text-[#2C201B]">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1

                return (
                  <React.Fragment key={`${crumb.href}-${index}`}>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        href={crumb.href}
                        aria-current={isLast ? "page" : undefined}
                        className={
                          isLast
                            ? "font-semibold text-[#2C201B]"
                            : "text-[#2C201B]/62 transition-colors hover:text-[#2C201B]"
                        }
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {!isLast ? (
                      <BreadcrumbSeparator>
                        <ChevronRight className="h-4 w-4 text-[#2C201B]/28" />
                      </BreadcrumbSeparator>
                    ) : null}
                  </React.Fragment>
                )
              })}
            </Breadcrumb>
          </div>

          <div className="min-w-0 flex-1 sm:hidden">
            <h1 className="truncate text-base font-semibold text-[#2C201B]">
              {breadcrumbs[breadcrumbs.length - 1]?.label}
            </h1>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 md:gap-3">
          {hasActions ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">{headerActions}</div>

              {showTitleNearActions ? (
                <div className="hidden items-center gap-2 md:flex">
                  <h2 className="text-base font-semibold tracking-[0.08em] text-[#2C201B] md:text-lg">GRANDESIGN</h2>
                  <Avatar className="h-7 w-7 border border-[#2C201B]/8 bg-[#FAF3E0] ring-0 md:h-8 md:w-8">
                    <AvatarImage src="/favicon.ico" alt="Logo Grandesign" className="object-cover" />
                    <AvatarFallback className="bg-[#FAF3E0] text-xs font-semibold text-[#2C201B]">GD</AvatarFallback>
                  </Avatar>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <h2 className="text-base font-semibold tracking-[0.08em] text-[#2C201B] md:text-lg">GRANDESIGN</h2>
              <Avatar className="h-8 w-8 border border-[#2C201B]/8 bg-[#FAF3E0] ring-0 md:h-10 md:w-10">
                <AvatarImage src="/favicon.ico" alt="Logo Grandesign" className="object-cover" />
                <AvatarFallback className="bg-[#FAF3E0] text-sm font-semibold text-[#2C201B]">GD</AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 border-b border-[#2C201B]/6 bg-[#FFFCF7]/80 px-4 py-1.5 sm:hidden">
        <Breadcrumb className="flex items-center gap-1 text-xs text-[#2C201B]">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1

            return (
              <React.Fragment key={`${crumb.href}-${index}`}>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href={crumb.href}
                    aria-current={isLast ? "page" : undefined}
                    className={
                      isLast
                        ? "font-semibold text-[#2C201B]"
                        : "text-[#2C201B]/58 transition-colors hover:text-[#2C201B]"
                    }
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {!isLast ? (
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-3 w-3 text-[#2C201B]/28" />
                  </BreadcrumbSeparator>
                ) : null}
              </React.Fragment>
            )
          })}
        </Breadcrumb>
      </div>

      <section className="relative z-10 flex-1 overflow-auto p-6 md:p-5 lg:p-6">
        <div className="w-full min-w-0">{children}</div>
      </section>
    </SidebarInset>
  )
}
