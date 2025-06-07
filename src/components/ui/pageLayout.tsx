"use client"

import React, { PropsWithChildren, useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ChevronRight, PanelLeft  } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

import { SidebarProvider } from "@/components/ui/sidebar"
import { CustomSidebar } from "@/components/ui/custom-sidebar"
import { Button } from "@/components/ui/button"

type PageLayoutProps = PropsWithChildren<{
  links?: { href: string; label: string }[]
  backgroundImage?: boolean
}>

export function PageLayout({
  children,
  links,
  backgroundImage = false,
}: PageLayoutProps) {
  const pathname = usePathname() || "/"
  const [isOpen, setIsOpen] = useState(true)

  const autoBreadcrumbs =
    links ||
    (() => {
      const segments = pathname.split("/").filter((seg) => seg.length > 0)
      return [
        { label: "Home", href: "/" },
        ...segments.map((seg, idx) => {
          const href = "/" + segments.slice(0, idx + 1).join("/")
          const label = seg.charAt(0).toUpperCase() + seg.slice(1)
          return { label, href }
        }),
      ]
    })()

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-bege-pagina">
        <CustomSidebar isOpen={isOpen} />

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

          <header className="flex h-16 items-center justify-between bg-bege-header px-6 shadow-header z-10">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
                <PanelLeft  className="h-5 w-5 text-marromEscuro" />
              </Button>

              <Breadcrumb className="flex items-center gap-1 text-sm text-marromEscuro">
                {autoBreadcrumbs.map((crumb, idx) => {
                  const isLast = idx === autoBreadcrumbs.length - 1
                  return (
                    <React.Fragment key={crumb.href}>
                      <BreadcrumbItem>
                        <BreadcrumbLink
                          href={crumb.href}
                          aria-current={isLast ? "page" : undefined}
                          className={
                            isLast
                              ? "font-semibold text-marromEscuro"
                              : "text-marromEscuro"
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

            <div className="relative w-10 h-10 rounded-full overflow-hidden ml-4">
              <Image
                src="/favicon.ico"
                alt="Logo (favicon)"
                fill
                sizes="40px"
                style={{ objectFit: "cover" }}
              />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6 relative z-10 w-full">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
