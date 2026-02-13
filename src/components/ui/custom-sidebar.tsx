"use client"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
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
    Wallet,
    HandCoins,
    ArrowLeftRight,
    BarChart3,
    PieChart,
    Scale,
    Package,
} from "lucide-react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function CustomSidebar() {
    const pathname = usePathname()
    const router = useRouter()

    return (
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-1">
                    <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src="/favicon.ico" alt="Grandesign" />
                        <AvatarFallback className="rounded-lg">GD</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">Grandesign</span>
                        <span className="truncate text-xs">Gestão</span>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                {/* ESSENTIALS */}
                <SidebarGroup>
                    <SidebarGroupLabel>Principal</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={pathname === "/"}
                                    onClick={() => router.push("/")}
                                    tooltip="Home"
                                >
                                    <HomeIcon className="size-4" />
                                    <span>Home</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={pathname?.startsWith("/obras")}
                                    onClick={() => router.push("/obras")}
                                    tooltip="Obras"
                                >
                                    <HardHat className="size-4" />
                                    <span>Obras</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* FINANCEIRO */}
                <SidebarGroup>
                    <SidebarGroupLabel>Financeiro</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={pathname === "/dashboard-financeiro"}
                                    onClick={() => router.push("/dashboard-financeiro")}
                                    tooltip="Dashboard Financeiro"
                                >
                                    <BarChart3 className="size-4" />
                                    <span>Dashboard</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={pathname === "/lancamentos"}
                                    onClick={() => router.push("/lancamentos")}
                                    tooltip="Lançamentos"
                                >
                                    <ArrowLeftRight className="size-4" />
                                    <span>Lançamentos</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={pathname === "/contas-pagar"}
                                    onClick={() => router.push("/contas-pagar")}
                                    tooltip="Contas a Pagar"
                                >
                                    <Wallet className="size-4" />
                                    <span>Contas a Pagar</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={pathname === "/contas-receber"}
                                    onClick={() => router.push("/contas-receber")}
                                    tooltip="Contas a Receber"
                                >
                                    <HandCoins className="size-4" />
                                    <span>Contas a Receber</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={pathname === "/relatorios/resultado-operacional"}
                                    onClick={() => router.push("/relatorios/resultado-operacional")}
                                    tooltip="Resultado Operacional"
                                >
                                    <PieChart className="size-4" />
                                    <span>Resultado Op.</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={pathname === "/relatorios/balancete"}
                                    onClick={() => router.push("/relatorios/balancete")}
                                    tooltip="Balancete Financeiro"
                                >
                                    <Scale className="size-4" />
                                    <span>Balancete</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* SUPRIMENTOS */}
                <SidebarGroup>
                    <SidebarGroupLabel>Suprimentos</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={pathname?.startsWith("/pedidos-compra")}
                                    onClick={() => router.push("/pedidos-compra")}
                                    tooltip="Pedidos de Compra"
                                >
                                    <ShoppingCart className="size-4" />
                                    <span>Pedidos de Compra</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={pathname?.startsWith("/fornecedores")}
                                    onClick={() => router.push("/fornecedores")}
                                    tooltip="Fornecedores"
                                >
                                    <Users2 className="size-4" />
                                    <span>Fornecedores</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={pathname?.startsWith("/insumos")}
                                    onClick={() => router.push("/insumos")}
                                    tooltip="Insumos"
                                >
                                    <Package className="size-4" />
                                    <span>Insumos</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* CRM */}
                <SidebarGroup>
                    <SidebarGroupLabel>CRM</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={pathname?.startsWith("/leads")}
                                    onClick={() => router.push("/leads")}
                                    tooltip="Leads"
                                >
                                    <Contact className="size-4" />
                                    <span>Leads</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={pathname?.startsWith("/clientes")}
                                    onClick={() => router.push("/clientes")}
                                    tooltip="Clientes"
                                >
                                    <Users2 className="size-4" />
                                    <span>Clientes</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            isActive={pathname === "/configuracoes"}
                            onClick={() => router.push("/configuracoes")}
                            tooltip="Configurações"
                        >
                            <SettingsIcon className="size-4" />
                            <span>Configurações</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            tooltip="Sair do sistema"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                        >
                            <LogOutIcon className="size-4" />
                            <span>Sair</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
