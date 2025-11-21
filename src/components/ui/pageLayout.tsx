// components/ui/pageLayout.tsx (COMPLETO — título à direita com ícone redondo à DIREITA do texto)
"use client"

import React, { type PropsWithChildren } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ChevronRight, PanelLeft } from "lucide-react"
import { Toaster } from "sonner"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

import { SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { CustomSidebar } from "@/components/ui/custom-sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type Crumb = { href: string; label: string }

type PageLayoutProps = PropsWithChildren<{
  links?: Crumb[]
  backgroundImage?: boolean
  headerActions?: React.ReactNode
  title?: string
  /** Com ações: mostra o título ao lado dos botões quando true. Sem ações: sempre mostra. */
  isTitulo?: boolean
}>

export function PageLayout({
  children,
  links,
  backgroundImage = false,
  headerActions,
  title,
  isTitulo,
}: PageLayoutProps) {
  const pathname = usePathname() || "/"

  const baseBreadcrumbs =
    links ??
    (() => {
      const segments = pathname.split("/").filter((seg) => seg.length > 0)
      return [
        { label: "Home", href: "/" },
        ...segments.map((seg, idx) => {
          const href = "/" + segments.slice(0, idx + 1).join("/")
          const label = seg
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
          return { label, href }
        }),
      ]
    })()

  const breadcrumbs = title ? [...baseBreadcrumbs, { label: title, href: pathname }] : baseBreadcrumbs

  return (
    <SidebarProvider>
      <InnerLayout
        breadcrumbs={breadcrumbs}
        backgroundImage={backgroundImage}
        headerActions={headerActions}
        isTitulo={isTitulo}
      >
        {children}
      </InnerLayout>
    </SidebarProvider>
  )
}

function InnerLayout({
  children,
  breadcrumbs,
  backgroundImage,
  headerActions,
  isTitulo,
}: PropsWithChildren<{
  breadcrumbs: Crumb[]
  backgroundImage?: boolean
  headerActions?: React.ReactNode
  isTitulo?: boolean
}>) {
  const { toggleSidebar } = useSidebar()
  const hasActions = !!headerActions && React.Children.count(headerActions) > 0
  const showTitleNearActions = hasActions ? (isTitulo ?? false) : true

  return (
    <div className="flex h-screen w-full bg-bege-pagina">
      <CustomSidebar />

      <div className="flex-1 flex flex-col relative">
        {backgroundImage && (
          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
            <Image src="/favicon.ico" alt="Logo centralizada (fundo)" width={400} height={400} className="opacity-10" />
          </div>
        )}
        <Toaster position="top-right" duration={10000} closeButton richColors offset={80} />

        {/* HEADER */}
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

            {/* Desktop: breadcrumbs */}
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

            {/* Mobile: página atual */}
            <div className="sm:hidden flex-1 min-w-0">
              <h1 className="font-semibold text-marromEscuro text-base truncate">
                {breadcrumbs[breadcrumbs.length - 1]?.label}
              </h1>
            </div>
          </div>

          {/* LADO DIREITO DO HEADER */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            {hasActions ? (
              // Botões à ESQUERDA  |  Título + ícone à DIREITA (com pequeno espaçamento)
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">{headerActions}</div>

                {showTitleNearActions && (
                  <div className="hidden md:flex items-center gap-2">
                    <h2 className="text-base md:text-lg text-marromEscuro font-bold tracking-wide">GRANDESIGN</h2>
                    <Avatar className="h-7 w-7 md:h-8 md:w-8 shadow-sm border-0 ring-0">
                      <AvatarImage src="/favicon.ico" alt="Logo Grandesign" className="object-cover" />
                      <AvatarFallback className="bg-bege text-marromEscuro text-xs font-bold">GD</AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </div>
            ) : (
              // Sem ações: título + avatar grande (legado)
              <>
                <div className="hidden md:flex items-center gap-2">
                  <h2 className="text-base md:text-lg text-marromEscuro font-bold tracking-wide">GRANDESIGN</h2>
                  <Avatar className="h-8 w-8 md:h-10 md:w-10 shadow-md border-0 ring-0">
                    <AvatarImage src="/favicon.ico" alt="Logo Grandesign" className="object-cover" />
                    <AvatarFallback className="bg-bege text-marromEscuro text-sm font-bold">GD</AvatarFallback>
                  </Avatar>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Breadcrumb fino no mobile */}
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

        {/* MAIN */}
        <main className="flex-1 overflow-auto p-6 md:p-4 lg:p-6 relative z-10 w-full">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
