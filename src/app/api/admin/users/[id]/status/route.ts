import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const can = session?.user?.roles?.some(r => r === "ADMIN" || r === "DEV");
  if (!can) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const id = Number(params.id);
  const { is_active } = await req.json();
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  await prisma.user.update({ where: { id }, data: { is_active: Boolean(is_active) } });
  return NextResponse.json({ ok: true });
}
