import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const can = session?.user?.roles?.some(r => r === "ADMIN" || r === "DEV");
  if (!can) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { created_at: "desc" },
    include: { roles: { include: { role: true } } },
  });

  const data = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    is_active: u.is_active,
    roles: u.roles.map(r => r.role.name),
    created_at: u.created_at,
  }));

  return NextResponse.json({ data });
}
