"use client"

import {
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from "@/components/ui/sidebar"

import {
    HomeIcon,
    PlusIcon,
    EditIcon,
    LogOutIcon,
    PackageIcon,
    BoxesIcon,
    TruckIcon,
    ChevronDown,
} from "lucide-react"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function CustomSidebar({ isOpen }: { isOpen: boolean }) {
    const pathname = usePathname()
    const [editarAberto, setEditarAberto] = useState(true)

    const isActive = (href: string) => pathname.startsWith(href)

    const iconClass = (active: boolean) =>
        cn("size-5 transition", active && "text-primary")

    return (
        <aside
  className={cn(
    "h-screen bg-sidebar border-r border-zinc-200 transition-all flex flex-col",
    isOpen ? "w-72" : "w-20"
  )}
>


            <SidebarHeader className="justify-center px-4 py-4">
                <Image src="/favicon.ico" alt="Logo" width={32} height={32} />
                {isOpen && <span className="ml-2 font-bold text-marromEscuro">GRANDESIGN</span>}
            </SidebarHeader>

            <SidebarContent className="flex-1 overflow-y-hidden">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Link href="/">
                            <SidebarMenuButton
                                isActive={false}
                                className={cn(isOpen ? "justify-start" : "justify-center")}
                            >
                                <HomeIcon className={iconClass(isActive("/"))} />
                                {isOpen && <span className="ml-2">Home</span>}
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <Link href="/gerar-orcamento">
                            <SidebarMenuButton
                                isActive={false}
                                className={cn(isOpen ? "justify-start" : "justify-center")}
                            >
                                <PlusIcon className={iconClass(isActive("/gerar-orcamento"))} />
                                {isOpen && <span className="ml-2">Gerar Orçamento</span>}
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>

                    <SidebarSeparator />

                    <SidebarGroup>
                        <SidebarGroupLabel
                            className={cn(
                                "cursor-pointer flex items-center transition-all",
                                isOpen ? "justify-between px-3 py-2" : "justify-center py-2"
                            )}
                            onClick={() => setEditarAberto(!editarAberto)}
                        >
                            <EditIcon className="size-5" />
                            {isOpen && <span className="ml-2">Editar</span>}
                            {isOpen && (
                                <ChevronDown
                                    className={`ml-auto transition-transform ${editarAberto ? "rotate-180" : ""}`}
                                />
                            )}
                        </SidebarGroupLabel>

                        {editarAberto && (
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <Link href="/editar/materia-prima">
                                            <SidebarMenuButton
                                                isActive={false}
                                                className={cn(isOpen ? "justify-start" : "justify-center")}
                                            >
                                                <PackageIcon className={iconClass(isActive("/editar/materia-prima"))} />
                                                {isOpen && <span className="ml-2">Matéria-Prima</span>}
                                            </SidebarMenuButton>
                                        </Link>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <Link href="/editar/produtos">
                                            <SidebarMenuButton
                                                isActive={false}
                                                className={cn(isOpen ? "justify-start" : "justify-center")}
                                            >
                                                <BoxesIcon className={iconClass(isActive("/editar/produtos"))} />
                                                {isOpen && <span className="ml-2">Produtos</span>}
                                            </SidebarMenuButton>
                                        </Link>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <Link href="/editar/frete">
                                            <SidebarMenuButton
                                                isActive={false}
                                                className={cn(isOpen ? "justify-start" : "justify-center")}
                                            >
                                                <TruckIcon className={iconClass(isActive("/editar/frete"))} />
                                                {isOpen && <span className="ml-2">Frete</span>}
                                            </SidebarMenuButton>
                                        </Link>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        )}
                    </SidebarGroup>
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="p-2 hover:bg-transparent">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => console.log("Logout")}
                            className={cn(isOpen ? "justify-start" : "justify-center", "hover:bg-transparent")}
                        >
                            <LogOutIcon className="size-5" />
                            {isOpen && <span className="ml-2">Sair</span>}
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </aside>
    )
}
