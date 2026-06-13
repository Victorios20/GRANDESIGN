import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session;
}

export async function hasRole(role: string) {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.roles?.includes(role));
}

export async function requireRole(role: string) {
  const session = await requireAuth();
  if (!session.user.roles?.includes(role)) throw new Error("FORBIDDEN");
  return session;
}

/** True se a sessão atual é ADMIN ou DEV. */
export async function isAdminOrDev() {
  const session = await getServerSession(authOptions);
  const roles = session?.user?.roles ?? [];
  return roles.includes("ADMIN") || roles.includes("DEV");
}

/** Exige que a sessão seja ADMIN ou DEV; lança FORBIDDEN caso contrário. */
export async function requireAdminOrDev() {
  const session = await requireAuth();
  const roles = session.user.roles ?? [];
  if (!roles.includes("ADMIN") && !roles.includes("DEV")) throw new Error("FORBIDDEN");
  return session;
}
