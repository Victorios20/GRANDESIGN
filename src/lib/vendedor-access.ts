const ADMIN_ROLES = new Set(["ADMIN", "DEV"])
const VENDEDOR_ROLE = "VENDEDOR"
const VENDEDOR_ALLOWED_PAGE_ROOTS = ["/", "/orcamento", "/obras"] as const

export function normalizeRoleList(roles: unknown): string[] {
  if (!Array.isArray(roles)) {
    return []
  }

  return roles.map((role) => String(role).toUpperCase())
}

export function isRestrictedVendedor(roles: unknown): boolean {
  const rolesUpper = normalizeRoleList(roles)
  const canSeeAdmin = rolesUpper.some((role) => ADMIN_ROLES.has(role))

  return rolesUpper.includes(VENDEDOR_ROLE) && !canSeeAdmin
}

function normalizePath(pathname: string) {
  if (!pathname || pathname === "/") {
    return "/"
  }

  const [pathOnly] = pathname.split(/[?#]/, 1)
  const normalized = pathOnly.endsWith("/") ? pathOnly.slice(0, -1) : pathOnly

  return normalized || "/"
}

function matchesPathRoot(pathname: string, root: string) {
  const path = normalizePath(pathname)
  const normalizedRoot = normalizePath(root)

  if (normalizedRoot === "/") {
    return path === "/"
  }

  return path === normalizedRoot || path.startsWith(`${normalizedRoot}/`)
}

export function isVendedorAllowedPage(pathname: string): boolean {
  return VENDEDOR_ALLOWED_PAGE_ROOTS.some((root) => matchesPathRoot(pathname, root))
}
