import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // sessão (para saber se pode aplicar role arbitrária)
    let session: any = null;
    try {
      session = await getServerSession(authOptions);
    } catch {}

    const isAdmin = Boolean(session?.user?.roles?.includes("ADMIN"));

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const nameOk = String(body.name ?? "").trim();
    const emailNorm = String(body.email ?? "").trim().toLowerCase();
    const pass = String(body.password ?? "");
    const requestedRole = body.role ? String(body.role).trim().toUpperCase() : null;

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

    // resolve a role final:
    // - se ADMIN e veio role -> usa a pedida (se existir)
    // - se não -> VISITANTE
    let finalRoleName = "VISITANTE";
    if (isAdmin && requestedRole) {
      const roleRow = await prisma.role.findUnique({ where: { name: requestedRole } });
      if (!roleRow) {
        return NextResponse.json({ error: "Role informada é inválida." }, { status: 422 });
      }
      finalRoleName = requestedRole;
    }

    const password_hash = await hashPassword(pass);

    // cria usuário + vincula role em transação
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: nameOk,
          email: emailNorm,
          password_hash,
          is_active: true,
        },
      });

      const roleRow = await tx.role.findUnique({ where: { name: finalRoleName } });
      if (roleRow) {
        await tx.userRole.create({
          data: { user_id: user.id, role_id: roleRow.id },
        });
      }

      return { user, role: roleRow ? finalRoleName : null };
    });

    return NextResponse.json(
      {
        message: "Conta criada com sucesso.",
        id: result.user.id,
        user: { id: result.user.id, name: result.user.name, email: result.user.email },
        role_aplicada: result.role,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
