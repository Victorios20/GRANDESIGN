// Catálogo de módulos de acesso — source of truth do controle de acesso por
// módulo/página. Este arquivo é PURO: não importa Prisma nem `next/server`, para
// poder rodar no edge (middleware), no client (sidebar) e no servidor.

export type ModuleGroup = "operacional" | "financeiro" | "admin"

export type ModuleDefinition = {
  /** Chave estável persistida em role_module_access / user_module_access. */
  key: string
  /** Rótulo exibido no painel. */
  label: string
  /** Raízes de rota que pertencem a este módulo (match por prefixo). */
  pathRoots: string[]
  group: ModuleGroup
}

export type ModuleAccessEffect = "ALLOW" | "DENY"

// Papéis com acesso irrestrito — espelham o `canSeeAdmin` do middleware atual.
export const ADMIN_ROLE_NAMES = ["ADMIN", "DEV"] as const

export const MODULE_CATALOG: ModuleDefinition[] = [
  { key: "home", label: "Home", pathRoots: ["/"], group: "operacional" },
  { key: "orcamento", label: "Orçamentos", pathRoots: ["/orcamento"], group: "operacional" },
  { key: "clientes", label: "Clientes", pathRoots: ["/clientes"], group: "operacional" },
  { key: "obras", label: "Obras", pathRoots: ["/obras"], group: "operacional" },
  { key: "calendario", label: "Calendário", pathRoots: ["/calendario"], group: "operacional" },
  { key: "compras", label: "Compras", pathRoots: ["/pedidos", "/pedido_compra", "/compra"], group: "operacional" },
  { key: "cadastros", label: "Cadastros", pathRoots: ["/cadastros"], group: "operacional" },
  {
    key: "financeiro",
    label: "Financeiro",
    pathRoots: ["/dashboard-financeiro", "/contas-pagar", "/contas-receber", "/lancamentos"],
    group: "financeiro",
  },
  { key: "configuracoes", label: "Configurações", pathRoots: ["/configuracoes"], group: "admin" },
  { key: "usuarios", label: "Usuários", pathRoots: ["/usuarios", "/admin/users"], group: "admin" },
]

export const ALL_MODULE_KEYS: string[] = MODULE_CATALOG.map((m) => m.key)

const MODULE_KEY_SET = new Set(ALL_MODULE_KEYS)

export function isKnownModuleKey(key: string): boolean {
  return MODULE_KEY_SET.has(key)
}

export function normalizeRoleList(roles: unknown): string[] {
  if (!Array.isArray(roles)) {
    return []
  }
  return roles.map((role) => String(role).toUpperCase())
}

function isAdminLike(rolesUpper: string[]): boolean {
  return rolesUpper.some((role) => (ADMIN_ROLE_NAMES as readonly string[]).includes(role))
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/"
  }
  const pathOnly = pathname.split(/[?#]/)[0]
  const normalized = pathOnly.endsWith("/") ? pathOnly.slice(0, -1) : pathOnly
  return normalized || "/"
}

function matchesRoot(path: string, root: string): boolean {
  const normalizedRoot = normalizePath(root)
  if (normalizedRoot === "/") {
    return path === "/"
  }
  return path === normalizedRoot || path.startsWith(`${normalizedRoot}/`)
}

/**
 * Mapeia uma rota para a chave de módulo correspondente.
 * Retorna `null` para rotas não catalogadas (o middleware as deixa passar —
 * fallback-allow), incluindo páginas como /login, /sem-acesso, etc.
 * Escolhe o root mais específico (mais longo) quando há mais de um match.
 */
export function resolveModuleKeyFromPath(pathname: string): string | null {
  const path = normalizePath(pathname)

  let best: { key: string; rootLength: number } | null = null
  for (const mod of MODULE_CATALOG) {
    for (const root of mod.pathRoots) {
      if (matchesRoot(path, root)) {
        const rootLength = normalizePath(root).length
        if (!best || rootLength > best.rootLength) {
          best = { key: mod.key, rootLength }
        }
      }
    }
  }

  return best ? best.key : null
}

export type RoleModuleMap = Record<string, string[]>

export type UserOverride = {
  moduleKey: string
  effect: ModuleAccessEffect
}

/**
 * Calcula o conjunto efetivo de módulos para um usuário.
 *
 * Regras (ver plano — riscos 1 e 3):
 * - ADMIN/DEV: acesso total (todos os módulos).
 * - Usuário sem papéis: acesso total (preserva o comportamento atual em que
 *   apenas VENDEDOR é restrito; ninguém mais é travado).
 * - Papel SEM nenhuma concessão configurada (ausente do mapa ou lista vazia):
 *   tratado como "sem restrição" → contribui com todos os módulos (fallback-allow).
 *   A restrição só passa a valer quando o admin configura ao menos um módulo.
 * - Base = união das concessões de todos os papéis do usuário.
 * - Overrides por usuário: ALLOW adiciona, DENY remove (aplicados por último).
 */
export function getEffectiveModules(
  roleNames: unknown,
  roleGrants: RoleModuleMap,
  userOverrides: UserOverride[] = []
): Set<string> {
  const rolesUpper = normalizeRoleList(roleNames)

  if (isAdminLike(rolesUpper) || rolesUpper.length === 0) {
    return new Set(ALL_MODULE_KEYS)
  }

  const effective = new Set<string>()
  for (const role of rolesUpper) {
    const keys = roleGrants[role]
    if (!keys || keys.length === 0) {
      // Papel não configurado → allow-all (rede de segurança contra travar usuários).
      for (const key of ALL_MODULE_KEYS) effective.add(key)
    } else {
      for (const key of keys) {
        if (isKnownModuleKey(key)) effective.add(key)
      }
    }
  }

  for (const override of userOverrides) {
    if (!isKnownModuleKey(override.moduleKey)) continue
    if (override.effect === "ALLOW") {
      effective.add(override.moduleKey)
    } else {
      effective.delete(override.moduleKey)
    }
  }

  return effective
}

/** Conveniência: o usuário pode acessar a rota? Rotas não catalogadas → true. */
export function canAccessPath(pathname: string, effectiveModules: Iterable<string>): boolean {
  const key = resolveModuleKeyFromPath(pathname)
  if (key === null) return true
  const set = effectiveModules instanceof Set ? effectiveModules : new Set(effectiveModules)
  return set.has(key)
}
