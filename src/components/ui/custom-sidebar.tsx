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
} from "@/components/ui/sidebar"

import { HomeIcon, PlusIcon, EditIcon, LogOutIcon, PackageIcon, BoxesIcon, TruckIcon, ChevronDown, ClockIcon } from 'lucide-react'

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSidebar } from "@/components/ui/sidebar"


export function CustomSidebar() {
  const { open: isOpen } = useSidebar()

  const pathname = usePathname()
  const [editarAberto, setEditarAberto] = useState(true)

  const isActive = (href: string) => pathname.startsWith(href)

  // Efeito para fechar automaticamente o menu "Editar" quando a sidebar estiver fechada
  useEffect(() => {
    if (!isOpen) {
      setEditarAberto(false)
    }
  }, [isOpen])

  const iconClass = (active: boolean) =>
    cn("size-5 transition-all duration-300", active && "text-primary scale-110")

  // Variantes de animação para os itens do menu
  const menuItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
      },
    }),
  }

  // Variantes para o submenu
  const submenuVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: {
      opacity: 1,
      height: "auto",
      transition: {
        duration: 0.3,
        when: "beforeChildren",
        staggerChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.2,
      },
    },
  }

  return (
    <motion.aside
      initial={{ width: isOpen ? 240 : 80 }}
      animate={{ width: isOpen ? 240 : 80 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "h-screen bg-sidebar border-r border-zinc-200 transition-all flex flex-col"
      )}
    >
      <SidebarHeader className="justify-center px-4 py-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center"
        >
          <Image
            src="/favicon.ico"
            alt="Logo"
            width={32}
            height={32}
            className="transition-transform duration-300 hover:scale-110"
          />
          {isOpen && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="ml-2 font-bold text-marromEscuro"
            >
              GRANDESIGN
            </motion.span>
          )}
        </motion.div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-hidden">
        <SidebarMenu>
          <TooltipProvider delayDuration={300}>
            <AnimatePresence>
              {/* Home */}
              <motion.div custom={0} initial="hidden" animate="visible" variants={menuItemVariants}>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href="/">
                        <SidebarMenuButton
                          isActive={false}
                          className={cn(
                            isOpen ? "justify-start" : "justify-center",
                            "hover:bg-black/5 transition-all duration-200"
                          )}
                        >
                          <HomeIcon className={iconClass(isActive("/"))} />
                          {isOpen && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="ml-2"
                            >
                              Home
                            </motion.span>
                          )}
                        </SidebarMenuButton>
                      </Link>
                    </TooltipTrigger>
                    {!isOpen && <TooltipContent side="right">Home</TooltipContent>}
                  </Tooltip>
                </SidebarMenuItem>
              </motion.div>

              {/* Gerar Orçamento */}
              <motion.div custom={1} initial="hidden" animate="visible" variants={menuItemVariants}>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href="/gerar-orcamento">
                        <SidebarMenuButton
                          isActive={false}
                          className={cn(
                            isOpen ? "justify-start" : "justify-center",
                            "hover:bg-black/5 transition-all duration-200"
                          )}
                        >
                          <PlusIcon className={iconClass(isActive("/gerar-orcamento"))} />
                          {isOpen && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="ml-2"
                            >
                              Gerar Orçamento
                            </motion.span>
                          )}
                        </SidebarMenuButton>
                      </Link>
                    </TooltipTrigger>
                    {!isOpen && <TooltipContent side="right">Gerar Orçamento</TooltipContent>}
                  </Tooltip>
                </SidebarMenuItem>
              </motion.div>

              {/* Histórico Orçamento */}
              <motion.div custom={2} initial="hidden" animate="visible" variants={menuItemVariants}>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href="/">
                        <SidebarMenuButton
                          isActive={false}
                          className={cn(
                            isOpen ? "justify-start" : "justify-center",
                            "hover:bg-black/5 transition-all duration-200"
                          )}
                        >
                          <ClockIcon className={iconClass(isActive("/"))} />
                          {isOpen && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="ml-2"
                            >
                              Histórico Orçamento
                            </motion.span>
                          )}
                        </SidebarMenuButton>
                      </Link>
                    </TooltipTrigger>
                    {!isOpen && <TooltipContent side="right">Histórico Orçamento</TooltipContent>}
                  </Tooltip>
                </SidebarMenuItem>
              </motion.div>
            </AnimatePresence>
          </TooltipProvider>

          {/* Separador com animação */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="h-px w-full bg-black opacity-10 my-1 origin-left"
          />

          {/* Seção Editar */}
          <SidebarGroup>
            <motion.div custom={3} initial="hidden" animate="visible" variants={menuItemVariants}>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarGroupLabel
                      className={cn(
                        "cursor-pointer flex items-center transition-all duration-200",
                        isOpen ? "justify-between px-3 py-2" : "justify-center py-2"
                      )}
                      onClick={() => setEditarAberto(!editarAberto)}
                    >
                      <div className="flex items-center">
                        <EditIcon className="size-5 transition-all duration-300" />
                        {isOpen && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="ml-2"
                          >
                            Editar
                          </motion.span>
                        )}
                      </div>
                      {isOpen && (
                        <motion.div
                          animate={{ rotate: editarAberto ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="ml-auto transition-transform" />
                        </motion.div>
                      )}
                    </SidebarGroupLabel>
                  </TooltipTrigger>
                  {!isOpen && <TooltipContent side="right">Editar</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </motion.div>

            <AnimatePresence>
              {editarAberto && (
                <motion.div initial="hidden" animate="visible" exit="exit" variants={submenuVariants}>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <TooltipProvider delayDuration={300}>
                        {/* Matéria-Prima */}
                        <motion.div variants={menuItemVariants} custom={0}>
                          <SidebarMenuItem>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href="/editar/materia-prima">
                                  <SidebarMenuButton
                                    isActive={false}
                                    className={cn(
                                      isOpen ? "justify-start" : "justify-center",
                                      "hover:bg-black/5 transition-all duration-200"
                                    )}
                                  >
                                    <PackageIcon className={iconClass(isActive("/editar/materia-prima"))} />
                                    {isOpen && (
                                      <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="ml-2"
                                      >
                                        Matéria-Prima
                                      </motion.span>
                                    )}
                                  </SidebarMenuButton>
                                </Link>
                              </TooltipTrigger>
                              {!isOpen && <TooltipContent side="right">Matéria-Prima</TooltipContent>}
                            </Tooltip>
                          </SidebarMenuItem>
                        </motion.div>

                        {/* Produtos */}
                        <motion.div variants={menuItemVariants} custom={1}>
                          <SidebarMenuItem>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href="/editar/produtos">
                                  <SidebarMenuButton
                                    isActive={false}
                                    className={cn(
                                      isOpen ? "justify-start" : "justify-center",
                                      "hover:bg-black/5 transition-all duration-200"
                                    )}
                                  >
                                    <BoxesIcon className={iconClass(isActive("/editar/produtos"))} />
                                    {isOpen && (
                                      <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="ml-2"
                                      >
                                        Produtos
                                      </motion.span>
                                    )}
                                  </SidebarMenuButton>
                                </Link>
                              </TooltipTrigger>
                              {!isOpen && <TooltipContent side="right">Produtos</TooltipContent>}
                            </Tooltip>
                          </SidebarMenuItem>
                        </motion.div>

                        {/* Frete */}
                        <motion.div variants={menuItemVariants} custom={2}>
                          <SidebarMenuItem>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href="/editar/frete">
                                  <SidebarMenuButton
                                    isActive={false}
                                    className={cn(
                                      isOpen ? "justify-start" : "justify-center",
                                      "hover:bg-black/5 transition-all duration-200"
                                    )}
                                  >
                                    <TruckIcon className={iconClass(isActive("/editar/frete"))} />
                                    {isOpen && (
                                      <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="ml-2"
                                      >
                                        Frete
                                      </motion.span>
                                    )}
                                  </SidebarMenuButton>
                                </Link>
                              </TooltipTrigger>
                              {!isOpen && <TooltipContent side="right">Frete</TooltipContent>}
                            </Tooltip>
                          </SidebarMenuItem>
                        </motion.div>
                      </TooltipProvider>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </motion.div>
              )}
            </AnimatePresence>
          </SidebarGroup>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2 hover:bg-transparent">
        <SidebarMenu>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => console.log("Logout")}
                    className={cn(
                      isOpen ? "justify-start" : "justify-center",
                      "hover:bg-transparent transition-all duration-200"
                    )}
                  >
                    <LogOutIcon className="size-5 transition-all duration-300 hover:rotate-12" />
                    {isOpen && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-2"
                      >
                        Sair
                      </motion.span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </TooltipTrigger>
              {!isOpen && <TooltipContent side="right">Sair</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </SidebarMenu>
      </SidebarFooter>
    </motion.aside>
  )
}