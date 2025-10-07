import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const can = session?.user?.roles?.some(r => r === "ADMIN" || r === "DEV");
  if (!can) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const roles = Array.isArray(body?.roles) ? body.roles.map(String) : null;
  if (!roles) return NextResponse.json({ error: "roles inválidas" }, { status: 400 });

  // só aceita roles que existem
  const roleRows = await prisma.role.findMany({ where: { name: { in: roles } } });
  const roleIds = roleRows.map(r => r.id);

  // zera e recria
  await prisma.userRole.deleteMany({ where: { user_id: id } });
  if (roleIds.length) {
    await prisma.userRole.createMany({ data: roleIds.map(role_id => ({ user_id: id, role_id })) });
  }

  return NextResponse.json({ ok: true, roles: roleRows.map(r => r.name) });
}
