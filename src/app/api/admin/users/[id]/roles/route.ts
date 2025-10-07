import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // params é assíncrono
) {
  const session = await getServerSession(authOptions);
  const can = session?.user?.roles?.some((r: string) => r === "ADMIN" || r === "DEV");
  if (!can) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params; // aguarda params
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as any));
  const rolesIn = Array.isArray(body?.roles) ? body.roles.map((v: unknown) => String(v).toUpperCase()) : null;
  if (!rolesIn) return NextResponse.json({ error: "roles inválidas" }, { status: 400 });

  // só aceita roles existentes
  const roleRows = await prisma.role.findMany({ where: { name: { in: rolesIn } } });
  const roleIds = roleRows.map((r) => r.id);

  // zera e recria
  await prisma.userRole.deleteMany({ where: { user_id: userId } });
  if (roleIds.length) {
    await prisma.userRole.createMany({
      data: roleIds.map((role_id) => ({ user_id: userId, role_id })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true, roles: roleRows.map((r) => r.name) });
}
