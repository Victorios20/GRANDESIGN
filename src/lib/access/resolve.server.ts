// Resolução de acesso no servidor: carrega as concessões por papel e os overrides
// por usuário do banco e delega o cálculo ao resolver puro de `./modules`.
// NÃO importar no edge/client — usa Prisma.

import { prisma } from "@/lib/prisma"
import {
  ADMIN_ROLE_NAMES,
  ALL_MODULE_KEYS,
  getEffectiveModules,
  normalizeRoleList,
  type RoleModuleMap,
  type UserOverride,
} from "./modules"

/**
 * Retorna as chaves de módulo efetivas de um usuário (papéis + overrides).
 * Usado no callback `jwt` (para embutir no token) e nas server pages.
 */
export async function resolveEffectiveModuleKeys(
  userId: string | number | null | undefined,
  roleNames: unknown
): Promise<string[]> {
  const rolesUpper = normalizeRoleList(roleNames)

  // ADMIN/DEV: acesso total, sem necessidade de bater no banco.
  if (rolesUpper.some((role) => (ADMIN_ROLE_NAMES as readonly string[]).includes(role))) {
    return [...ALL_MODULE_KEYS]
  }

  const numericUserId = userId != null && Number.isFinite(Number(userId)) ? Number(userId) : null

  const [grantRows, overrideRows] = await Promise.all([
    rolesUpper.length
      ? prisma.roleModuleAccess.findMany({
          where: { role: { name: { in: rolesUpper } } },
          select: { module_key: true, role: { select: { name: true } } },
        })
      : Promise.resolve([]),
    numericUserId !== null
      ? prisma.userModuleAccess.findMany({
          where: { user_id: numericUserId },
          select: { module_key: true, effect: true },
        })
      : Promise.resolve([]),
  ])

  const roleGrants: RoleModuleMap = {}
  for (const row of grantRows) {
    const roleName = row.role.name.toUpperCase()
    ;(roleGrants[roleName] ??= []).push(row.module_key)
  }

  const overrides: UserOverride[] = overrideRows.map((row) => ({
    moduleKey: row.module_key,
    effect: row.effect,
  }))

  return [...getEffectiveModules(rolesUpper, roleGrants, overrides)]
}
