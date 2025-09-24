import { prisma } from "@/lib/prisma"

function onlyDigits(s?: string | null) {
  return (s || "").replace(/\D/g, "")
}

export async function buscarClientesPorNome(q: string, limit = 10) {
  const termo = (q || "").trim()
  if (!termo) return []
  const rows = await prisma.cliente.findMany({
    where: { nome: { contains: termo, mode: "insensitive" } },
    orderBy: { nome: "asc" },
    take: Math.min(Math.max(limit, 1), 25),
    select: {
      id: true,
      nome: true,
      telefone: true,
      bairro: true,
      cidade_id: true,
      cidades: { select: { nome: true } },
      cpf: true
    }
  })
  return rows.map(r => ({
    id: r.id,
    nome: r.nome,
    telefone: r.telefone,
    bairro: r.bairro,
    cidade_id: r.cidade_id,
    cidade_nome: r.cidades?.nome ?? null,
    cpf: r.cpf ?? null
  }))
}

export async function buscarClientesPorTelefone(q: string, limit = 10) {
  const digits = onlyDigits(q)
  if (!digits) return []
  const rows = await prisma.cliente.findMany({
    where: { telefone: { contains: digits } },
    orderBy: { nome: "asc" },
    take: Math.min(Math.max(limit, 1), 25),
    select: {
      id: true,
      nome: true,
      telefone: true,
      bairro: true,
      cidade_id: true,
      cidades: { select: { nome: true } },
      cpf: true
    }
  })
  return rows.map(r => ({
    id: r.id,
    nome: r.nome,
    telefone: r.telefone,
    bairro: r.bairro,
    cidade_id: r.cidade_id,
    cidade_nome: r.cidades?.nome ?? null,
    cpf: r.cpf ?? null
  }))
}

export async function criarClienteBasico(data: {
  nome: string
  telefone?: string | null
  bairro?: string | null
  cidade_id?: number | null
  cpf?: string | null
}) {
  const nome = (data.nome || "").trim()
  if (!nome) {
    const err: any = new Error("Nome obrigatório")
    err.status = 400
    err.code = "VALIDACAO"
    throw err
  }

  // checagem UX (o índice do banco garante de qualquer forma)
  const existe = await prisma.cliente.findFirst({
    where: { nome: { equals: nome, mode: "insensitive" } },
    select: { id: true }
  })
  if (existe) {
    const err: any = new Error("Cliente já existe. Associado ao existente.")
    err.status = 409
    err.code = "NOME_DUPLICADO"
    err.clienteId = existe.id
    throw err
  }

  const created = await prisma.cliente.create({
    data: {
      nome,
      telefone: onlyDigits(data.telefone),
      bairro: data.bairro ?? null,
      cidade_id: data.cidade_id ?? null,
      cpf: data.cpf ? onlyDigits(data.cpf) : null
    },
    select: {
      id: true,
      nome: true,
      telefone: true,
      bairro: true,
      cidade_id: true,
      cpf: true
    }
  })
  return created
}
