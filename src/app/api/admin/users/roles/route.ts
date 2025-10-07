import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const can = session?.user?.roles?.some(r => r === "ADMIN" || r === "DEV");
  if (!can) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ data: roles.map(r => ({ id: r.id, name: r.name, label: r.label })) });
}
