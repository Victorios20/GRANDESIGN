import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"

type Body = {
  id: number
  excluido: boolean
}

export async function PATCH(req: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
    const token = await getToken({ req, secret })

    const roles = token?.roles ?? []

    if (!roles.includes("ADMIN") && !roles.includes("DEV")) {
      return NextResponse.json(
        { error: "Você não tem permissão para excluir um orçamento" },
        { status: 401 }
      )
    }

    const body = (await req.json()) as Partial<Body>

    if (typeof body.id !== "number" || Number.isNaN(body.id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    if (typeof body.excluido !== "boolean") {
      return NextResponse.json(
        { error: "Campo 'excluido' deve ser boolean" },
        { status: 400 }
      )
    }

    const updated = await prisma.orcamento.update({
      where: { id: body.id },
      data: { excluido: body.excluido },
    })

    return NextResponse.json(
      {
        success: true,
        orcamento: {
          id: updated.id,
          excluido: updated.excluido,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[ORCAMENTO_EXCLUIR] erro:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar orçamento" },
      { status: 500 }
    )
  }
}
