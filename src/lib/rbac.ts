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
