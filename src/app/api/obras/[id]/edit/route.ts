import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { updateObraDB, UpdateObraPayload } from "@/actions/obras/update-obra-db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "ID inválido", code: "VALIDACAO" }, { status: 400 })
  }

  let body: UpdateObraPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido", code: "PAYLOAD_INVALIDO" }, { status: 400 })
  }

  try {
    // seu NextAuth provavelmente guarda o id no token/jwt; ajuste se diferente
    const userId = Number((session.user as any)?.id)
    const result = await updateObraDB(id, body, userId)

    // A função já retorna status convencionado
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "FALHA_ATUALIZAR_OBRA" },
        { status: result.status ?? 400 }
      )
    }

    // Mantive retorno mínimo (id), pois a página se reidrata via GET detalhado
    return NextResponse.json({ data: result.data }, { status: 200 })
  } catch (e: any) {
    // Trata códigos específicos que podem ser lançados dentro da transação (ex.: OS faltando dados)
    const code = e?.code as string | undefined
    if (code === "ORDEM_SERVICO_DADOS_INSUFICIENTES") {
      return NextResponse.json(
        { error: "Dados insuficientes para criar a ordem de serviço", code },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Erro inesperado." }, { status: 500 })
  }
}
