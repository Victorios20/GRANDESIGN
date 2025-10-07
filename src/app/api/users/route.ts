import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = Boolean(session?.user?.roles?.includes("ADMIN"));

    const { name, email, password, role } = await req.json();
    const nameOk = String(name || "").trim();
    const emailNorm = String(email || "").trim().toLowerCase();
    const pass = String(password || "");

    if (!nameOk || !emailNorm || !pass) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    if (pass.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (exists) {
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
    }

    const password_hash = await hashPassword(pass);

    const user = await prisma.user.create({
      data: {
        name: nameOk,
        email: emailNorm,
        password_hash,
        is_active: true,
      },
    });

    const roleName = isAdmin && role ? String(role) : "VISITANTE";
    const roleRow = await prisma.role.findUnique({ where: { name: roleName } });
    if (roleRow) {
      await prisma.userRole.create({
        data: { user_id: user.id, role_id: roleRow.id },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
