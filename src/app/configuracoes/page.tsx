import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import {
  BellRing,
  FolderCog,
  GitBranch,
  Landmark,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  UserCog,
  type LucideIcon,
} from "lucide-react"

import { PageShell } from "@/components/ds/PageShell"
import { ConfigurationModuleCard } from "@/components/configuracoes/ConfigurationChrome"
import { PageLayout } from "@/components/ui/pageLayout"
import { operationalListPageBackgroundClass } from "@/components/ui/operational-list-styles"
import { authOptions } from "@/lib/auth"

type RoleList = unknown[] | undefined

type ConfigModule = {
  href: string
  badge: string
  title: string
  description: string
  helper: string
  icon: LucideIcon
  roles?: string[]
}

function hasRequiredRole(roles: RoleList, required?: string[]) {
  if (!required || required.length === 0) {
    return true
  }

  const normalized = Array.isArray(roles) ? roles.map((role) => String(role).toUpperCase()) : []
  return required.some((role) => normalized.includes(role))
}

const CONFIGURATION_MODULES: ConfigModule[] = [
  {
    href: "/cadastros",
    badge: "Base",
    title: "Cadastros",
    description: "Fornecedores, materiais, equipes e cidades com a mesma linguagem visual do restante do sistema.",
    helper: "Abrir cadastros",
    icon: FolderCog,
  },
  {
    href: "/configuracoes/parametrizacoes",
    badge: "Financeiro",
    title: "Parametrizações",
    description: "Limite do fluxo de caixa e regras globais que afetam os lançamentos.",
    helper: "Ajustar parâmetros",
    icon: SlidersHorizontal,
    roles: ["ADMIN", "DEV"],
  },
  {
    href: "/configuracoes/contas-bancarias",
    badge: "Financeiro",
    title: "Contas bancárias",
    description: "Cadastro, saldo inicial e status das contas usadas nas operações financeiras.",
    helper: "Gerenciar contas",
    icon: Landmark,
    roles: ["ADMIN", "DEV"],
  },
  {
    href: "/configuracoes/centros-custo",
    badge: "Financeiro",
    title: "Centros de custo",
    description: "Vincule centros às obras e mantenha o uso financeiro sob controle.",
    helper: "Gerenciar centros",
    icon: GitBranch,
    roles: ["ADMIN", "DEV"],
  },
  {
    href: "/configuracoes/categorias-financeiras",
    badge: "Financeiro",
    title: "Categorias financeiras",
    description: "Estruture receitas, despesas e subcategorias com consistência de visual e status.",
    helper: "Gerenciar categorias",
    icon: Tags,
    roles: ["ADMIN", "DEV"],
  },
  {
    href: "/configuracoes/notificacoes",
    badge: "Financeiro",
    title: "Notificações",
    description: "E-mails que recebem aviso quando contas a pagar ou a receber são criadas.",
    helper: "Configurar notificações",
    icon: BellRing,
    roles: ["ADMIN", "DEV"],
  },
  {
    href: "/admin/users",
    badge: "Admin",
    title: "Usuários",
    description: "Permissões e status de acesso para perfis administrativos.",
    helper: "Administrar acessos",
    icon: UserCog,
    roles: ["ADMIN", "DEV"],
  },
  {
    href: "/configuracoes/acessos",
    badge: "Admin",
    title: "Acessos",
    description: "Defina os módulos de cada papel e exceções pontuais por usuário.",
    helper: "Configurar acessos",
    icon: ShieldCheck,
    roles: ["ADMIN", "DEV"],
  },
]

export default async function ConfiguracoesPage() {
  const session = await getServerSession(authOptions)
  const roles = (session?.user as { roles?: RoleList } | undefined)?.roles

  const visibleModules = CONFIGURATION_MODULES.filter((module) => hasRequiredRole(roles, module.roles))

  if (visibleModules.length === 0) {
    redirect("/sem-acesso")
  }

  return (
    <PageLayout pageBackground={operationalListPageBackgroundClass}>
      <PageShell
        title="Configurações"
        count={visibleModules.length}
        description="Central de acesso para ajustes administrativos, cadastros e parametrizações do sistema."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleModules.map((module) => (
            <ConfigurationModuleCard
              key={module.href}
              href={module.href}
              badge={module.badge}
              title={module.title}
              description={module.description}
              helper={module.helper}
              icon={module.icon}
            />
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-[#e8e1d6] bg-white px-4 py-3 text-sm text-[#6f6556]">
          O menu lateral também aponta para esta central, então a navegação não depende mais de atalhos profundos.
        </div>
      </PageShell>
    </PageLayout>
  )
}
