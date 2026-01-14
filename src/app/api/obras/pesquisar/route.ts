import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = String(searchParams.get("q") ?? "").trim()

  if (!q) {
    return NextResponse.json({ data: [] }, { status: 200 })
  }

  const isNumeric = /^\d+$/.test(q)
  const idNum = isNumeric ? Number(q) : null

  const obras = await prisma.obras.findMany({
    where: {
      OR: [
        ...(idNum != null ? [{ id: idNum }] : []),
        {
          titulo: {
            contains: q,
            mode: "insensitive",
          },
        },
      ],
    },
    take: 10,
    orderBy: [{ titulo: "asc" }, { id: "asc" }],
    select: {
      id: true,
      titulo: true,
      endereco_obra: true,
      maps_url: true,
      cliente: true,
    },
  })

  const items = obras.map((o) => {
    const clienteAny = o.cliente as any
    return {
      id: o.id,
      titulo: o.titulo ?? null,

      // dados pra preencher a seção "Endereço de Entrega"
      nomeReceptor: clienteAny?.nome ?? null,
      telefoneReceptor: clienteAny?.telefone ?? clienteAny?.celular ?? null,
      enderecoEntrega: o.endereco_obra ?? null,
      linkMaps: o.maps_url ?? null,
    }
  })

  // Se digitou número e existe id exato, deixa ele no topo (UX melhor)
  if (idNum != null) {
    items.sort((a, b) => {
      const aExact = a.id === idNum ? 0 : 1
      const bExact = b.id === idNum ? 0 : 1
      if (aExact !== bExact) return aExact - bExact
      const at = (a.titulo ?? "").localeCompare(b.titulo ?? "", "pt-BR", { sensitivity: "base" })
      if (at !== 0) return at
      return a.id - b.id
    })
  }

  return NextResponse.json({ data: items }, { status: 200 })
}
