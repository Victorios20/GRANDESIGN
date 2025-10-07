"use client"

import React, { type PropsWithChildren } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ChevronRight, PanelLeft } from "lucide-react"
import { SessionProvider } from "next-auth/react"

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { CustomSidebar } from "@/components/ui/custom-sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type PageLayoutProps = PropsWithChildren<{
  links?: { href: string; label: string }[]
  backgroundImage?: boolean
  headerActions?: React.ReactNode
}>

export function PageLayout({ children, links, backgroundImage = false, headerActions }: PageLayoutProps) {
  const pathname = usePathname() || "/"

  const autoBreadcrumbs =
    links ||
    (() => {
      const segments = pathname.split("/").filter((seg) => seg.length > 0)
      return [
        { label: "Home", href: "/" },
        ...segments.map((seg, idx) => {
          const href = "/" + segments.slice(0, idx + 1).join("/")
          const label = seg
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
          return { label, href }
        }),
      ]
    })()

  return (
    <SessionProvider>
      <SidebarProvider>
        <InnerLayout breadcrumbs={autoBreadcrumbs} backgroundImage={backgroundImage} headerActions={headerActions}>
          {children}
        </InnerLayout>
      </SidebarProvider>
    </SessionProvider>
  )
}

function InnerLayout({
  children,
  breadcrumbs,
  backgroundImage,
  headerActions,
}: PropsWithChildren<{
  breadcrumbs: { href: string; label: string }[]
  backgroundImage?: boolean
  headerActions?: React.ReactNode
}>) {
  const { toggleSidebar } = useSidebar()
  const hasActions = !!headerActions && React.Children.count(headerActions) > 0

  return (
    <div className="flex h-screen w-full bg-bege-pagina">
      <CustomSidebar />

      <div className="flex-1 flex flex-col relative">
        {backgroundImage && (
          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
            <Image
              src="/favicon.ico"
              alt="Logo centralizada (fundo)"
              width={400}
              height={400}
              className="opacity-10"
            />
          </div>
        )}

        <header className="flex h-14 md:h-16 items-center justify-between bg-bege-header px-4 md:px-6 shadow-header z-10 border-b border-marromClaro/20">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="flex-shrink-0 hover:bg-marromClaro/20 h-8 w-8"
            >
              <PanelLeft className="h-4 w-4 text-marromEscuro" />
            </Button>

            <div className="hidden sm:block flex-1 min-w-0">
              <Breadcrumb className="flex items-center gap-1 text-sm text-marromEscuro">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1
                  return (
                    <React.Fragment key={crumb.href}>
                      <BreadcrumbItem>
                        <BreadcrumbLink
                          href={crumb.href}
                          aria-current={isLast ? "page" : undefined}
                          className={
                            isLast
                              ? "font-semibold text-marromEscuro"
                              : "text-marromEscuro hover:text-marromEscuro/80 transition-colors"
                          }
                        >
                          {crumb.label}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      {!isLast && (
                        <BreadcrumbSeparator>
                          <ChevronRight className="h-4 w-4 text-marromClaro" />
                        </BreadcrumbSeparator>
                      )}
                    </React.Fragment>
                  )
                })}
              </Breadcrumb>
            </div>

            <div className="sm:hidden flex-1 min-w-0">
              <h1 className="font-semibold text-marromEscuro text-base truncate">
                {breadcrumbs[breadcrumbs.length - 1]?.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            {hasActions ? (
              <div className="flex items-center gap-2">{headerActions}</div>
            ) : (
              <>
                <div className="hidden md:block">
                  <h2 className="text-base md:text-lg text-marromEscuro font-bold bg-gradient-to-r from-marromEscuro to-marromEscuro/80 bg-clip-text tracking-wide">
                    GRANDESIGN
                  </h2>
                </div>

                <div className="relative">
                  <Avatar className="h-8 w-8 md:h-10 md:w-10 shadow-md hover:shadow-lg transition-all duration-300 border-0 ring-0">
                    <AvatarImage
                      src="/favicon.ico"
                      alt="Logo Grandesign"
                      className="object-cover p-0.5 bg-gradient-to-br from-white to-bege rounded-full"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-marromClaro to-bege text-marromEscuro font-bold text-sm border-0">
                      GD
                    </AvatarFallback>
                  </Avatar>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="sm:hidden px-4 py-1.5 bg-bege-header/50 border-b border-marromClaro/10">
          <Breadcrumb className="flex items-center gap-1 text-xs text-marromEscuro">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <React.Fragment key={crumb.href}>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href={crumb.href}
                      aria-current={isLast ? "page" : undefined}
                      className={
                        isLast
                          ? "font-semibold text-marromEscuro"
                          : "text-marromEscuro/70 hover:text-marromEscuro transition-colors"
                      }
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {!isLast && (
                    <BreadcrumbSeparator>
                      <ChevronRight className="h-3 w-3 text-marromClaro" />
                    </BreadcrumbSeparator>
                  )}
                </React.Fragment>
              )
            })}
          </Breadcrumb>
        </div>

        <main className="flex-1 overflow-auto p-6 md:p-4 lg:p-6 relative z-10 w-full">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
