import { prisma } from "@/lib/prisma"

function onlyDigits(s?: string | null) {
  return (s || "").replace(/\D/g, "")
}

export async function buscarClientesPorNome(q: string, limit = 10) {
  const termo = (q || "").trim()
  if (termo.length < 2) return []

  const rows = await prisma.$queryRaw<
    { id: number; nome: string; telefone: string | null; bairro: string | null; cidade_id: number | null; cidade_nome: string | null; cpf: string | null }[]
  >`
    SELECT c.id,
           c.nome,
           c.telefone,
           c.bairro,
           c.cidade_id,
           ci.nome AS cidade_nome,
           c.cpf
    FROM public.cliente c
    LEFT JOIN public.cidades ci ON ci.id = c.cidade_id
    WHERE immutable_unaccent(lower(c.nome)) LIKE '%' || immutable_unaccent(lower(${termo})) || '%'
    ORDER BY similarity(immutable_unaccent(lower(c.nome)), immutable_unaccent(lower(${termo}))) DESC,
             c.id DESC
    LIMIT ${Math.min(Math.max(limit, 1), 25)}
  `
  return rows
}


export async function buscarClientesPorTelefone(q: string, limit = 10) {
  const qDigits = onlyDigits(q)
  if (!qDigits || qDigits.length < 3) return []

  const rows = await prisma.$queryRaw<
    { id: number; nome: string; telefone: string | null; bairro: string | null; cidade_id: number | null; cidade_nome: string | null; cpf: string | null }[]
  >`
    SELECT c.id,
           c.nome,
           c.telefone,
           c.bairro,
           c.cidade_id,
           ci.nome AS cidade_nome,
           c.cpf
    FROM public.cliente c
    LEFT JOIN public.cidades ci ON ci.id = c.cidade_id
    WHERE regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g') LIKE '%' || ${qDigits} || '%'
    ORDER BY similarity(regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g'), ${qDigits}) DESC,
             c.id DESC
    LIMIT ${Math.min(Math.max(limit, 1), 25)}
  `
  return rows
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

    // checagem UX com mesmo critério do índice (unaccent + lower)
  const existenteId = await getClienteIdByNomeUnaccent(nome)
  if (existenteId) {
    const err: any = new Error("Cliente já existe. Associado ao existente.")
    err.status = 409
    err.code = "NOME_DUPLICADO"
    err.clienteId = existenteId
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


export async function getClienteIdByNomeUnaccent(nome: string): Promise<number | null> {
  const termo = String(nome ?? "").trim()
  if (!termo) return null
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM public.cliente
    WHERE immutable_unaccent(lower(nome)) = immutable_unaccent(lower(${termo}))
    ORDER BY id DESC LIMIT 1`
  return rows?.[0]?.id ?? null
}
