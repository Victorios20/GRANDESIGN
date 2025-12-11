import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Body = {
  id: number
  excluido: boolean
}

export async function PATCH(req: Request) {
  try {
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
