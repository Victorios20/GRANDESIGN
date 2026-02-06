import { prisma } from "@/lib/prisma"

function onlyDigits(s?: string | null) {
  return (s || "").replace(/\D/g, "")
}

// =====================
// TYPES
// =====================
export type ListarClientesParams = {
  page?: number | string
  perPage?: number | string
  search?: string | null
  telefone?: string | null
  bairro?: string | null
  cidadeId?: number | string | null
  temObras?: boolean | string | null
  temOrcamentos?: boolean | string | null
  ordem?: "nome_asc" | "nome_desc" | "recentes" | string | null
}

export type ClienteListDTO = {
  id: number
  nome: string
  telefone: string | null
  bairro: string | null
  cidade_id: number | null
  cidade_nome: string | null
  cpf: string | null
  _count: {
    obras: number
    orcamentos: number
  }
}

export type ClienteDetalheDTO = {
  id: number
  nome: string
  telefone: string | null
  bairro: string | null
  cidade_id: number | null
  cpf: string | null
  cidade: { id: number; nome: string } | null
  obras: Array<{
    id: number
    titulo: string | null
    status: string
    valor_obra: number
    equipe: { id: number; nome: string } | null
  }>
  orcamentos: Array<{
    id: number
    titulo: string | null
    data_criacao: Date | null
    totais_empresa_gd_preco: number
  }>
}

// =====================
// LISTAR (Paginado + Filtros)
// =====================
export async function listarClientes(params?: ListarClientesParams): Promise<{
  dados: ClienteListDTO[]
  total: number
}> {
  const page = Math.max(1, Number(params?.page) || 1)
  const perPage = Math.min(100, Math.max(1, Number(params?.perPage) || 20))
  const skip = (page - 1) * perPage

  const and: any[] = []

  // Search by name (case-insensitive, partial match)
  if (params?.search?.trim()) {
    const termo = params.search.trim()
    and.push({
      OR: [
        { nome: { contains: termo, mode: "insensitive" } },
        { telefone: { contains: onlyDigits(termo), mode: "insensitive" } },
      ],
    })
  }

  // Telefone filter
  if (params?.telefone?.trim()) {
    const telDigits = onlyDigits(params.telefone)
    if (telDigits.length >= 3) {
      and.push({ telefone: { contains: telDigits } })
    }
  }

  // Bairro filter
  if (params?.bairro?.trim()) {
    and.push({ bairro: { contains: params.bairro.trim(), mode: "insensitive" } })
  }

  // Cidade filter
  if (params?.cidadeId) {
    and.push({ cidade_id: Number(params.cidadeId) })
  }

  // Has obras filter
  if (params?.temObras === true || params?.temObras === "true") {
    and.push({ obras: { some: {} } })
  }

  // Has orcamentos filter
  if (params?.temOrcamentos === true || params?.temOrcamentos === "true") {
    and.push({ orcamento: { some: {} } })
  }

  const where = and.length > 0 ? { AND: and } : {}

  // Ordering
  let orderBy: any = { nome: "asc" }
  if (params?.ordem === "nome_desc") {
    orderBy = { nome: "desc" }
  } else if (params?.ordem === "recentes") {
    orderBy = { id: "desc" }
  }

  const [total, rows] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      skip,
      take: perPage,
      orderBy,
      include: {
        cidades: true,
        _count: {
          select: {
            obras: true,
            orcamento: true,
          },
        },
      },
    }),
  ])

  const dados: ClienteListDTO[] = rows.map((c) => ({
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    bairro: c.bairro,
    cidade_id: c.cidade_id,
    cidade_nome: c.cidades?.nome ?? null,
    cpf: c.cpf,
    _count: {
      obras: c._count?.obras ?? 0,
      orcamentos: c._count?.orcamento ?? 0,
    },
  }))

  return { dados, total }
}

// =====================
// GET BY ID (com relacionamentos)
// =====================
export async function getCliente(id: number): Promise<ClienteDetalheDTO | null> {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      cidades: true,
      obras: {
        select: {
          id: true,
          titulo: true,
          status: true,
          valor_obra: true,
          equipe: { select: { id: true, nome: true } },
        },
        orderBy: { id: "desc" },
      },
      orcamento: {
        where: { excluido: false },
        select: {
          id: true,
          titulo: true,
          data_criacao: true,
          totais_empresa_gd_preco: true,
        },
        orderBy: { id: "desc" },
      },
    },
  })

  if (!cliente) return null

  return {
    id: cliente.id,
    nome: cliente.nome,
    telefone: cliente.telefone,
    bairro: cliente.bairro,
    cidade_id: cliente.cidade_id,
    cpf: cliente.cpf,
    cidade: cliente.cidades ? { id: cliente.cidades.id, nome: cliente.cidades.nome } : null,
    obras: cliente.obras.map((o) => ({
      id: o.id,
      titulo: o.titulo,
      status: o.status,
      valor_obra: Number(o.valor_obra),
      equipe: o.equipe,
    })),
    orcamentos: cliente.orcamento.map((o) => ({
      id: o.id,
      titulo: o.titulo,
      data_criacao: o.data_criacao,
      totais_empresa_gd_preco: Number(o.totais_empresa_gd_preco),
    })),
  }
}

// =====================
// UPDATE
// =====================
export async function updateCliente(
  id: number,
  data: {
    nome?: string
    telefone?: string | null
    bairro?: string | null
    cidade_id?: number | null
    cpf?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const nome = data.nome?.trim()
  if (nome !== undefined && !nome) {
    return { success: false, error: "Nome é obrigatório" }
  }

  try {
    await prisma.cliente.update({
      where: { id },
      data: {
        ...(nome && { nome }),
        ...(data.telefone !== undefined && { telefone: onlyDigits(data.telefone) || null }),
        ...(data.bairro !== undefined && { bairro: data.bairro || null }),
        ...(data.cidade_id !== undefined && { cidade_id: data.cidade_id }),
        ...(data.cpf !== undefined && { cpf: data.cpf ? onlyDigits(data.cpf) : null }),
      },
    })
    return { success: true }
  } catch (err: any) {
    console.error("[updateCliente]", err)
    return { success: false, error: err.message || "Erro ao atualizar cliente" }
  }
}

// =====================
// DELETE (com verificação de vínculos)
// =====================
export async function deleteCliente(id: number): Promise<{
  success: boolean
  error?: string
  blockedBy?: { obras: number; orcamentos: number }
}> {
  // Check for linked records
  const counts = await prisma.cliente.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          obras: true,
          orcamento: true,
        },
      },
    },
  })

  if (!counts) {
    return { success: false, error: "Cliente não encontrado" }
  }

  const obrasCount = counts._count?.obras ?? 0
  const orcamentosCount = counts._count?.orcamento ?? 0

  if (obrasCount > 0 || orcamentosCount > 0) {
    return {
      success: false,
      error: "Cliente possui vínculos e não pode ser excluído",
      blockedBy: { obras: obrasCount, orcamentos: orcamentosCount },
    }
  }

  try {
    await prisma.cliente.delete({ where: { id } })
    return { success: true }
  } catch (err: any) {
    console.error("[deleteCliente]", err)
    return { success: false, error: err.message || "Erro ao excluir cliente" }
  }
}

// =====================
// LEGACY FUNCTIONS (mantidas para retrocompatibilidade)
// =====================
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

