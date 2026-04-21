// app/obras/lib/types.ts

export type ObraStatus =
  | "Assinatura de contrato"
  | "Aguardando validação técnica"
  | "Compras"
  | "À iniciar"
  | "Execução"
  | "Aguardando pagamento"
  | "Pendência"
  | "Finalizado"

export type PagamentoStatus = "Pendente" | "Efetuado"

export type FormaPagamento = string

export type PedidoStatusPadrao = "Pendente" | "Aguardando pagamento" | "Pedido feito" | "Entregue"
export type PedidoStatusMateriais = "Pendente" | "Em estoque" | "Entregue"
export type PedidoStatusAndaimes = "Pendente" | "Pedido feito" | "Entregue" | "À coletar" | "Coletado"

export type UIMaterial = {
  id: string | number
  nome: string
  componente: string | null
  quantidade: number
  preco: number
  tamanho?: number | null
  frete?: number
}

export type ImagemInput = { url: string; ordem?: number | null; legenda?: string | null }

export type GetOrcamentoResult = {
  id: number
  titulo: string
  clienteId: number
  cliente: { nome: string; telefone: string; bairro: string; cidade: string | null }
  parametros: {
    tipoObra: string | null
    largura: number | null
    comprimento: number | null
    larguraMaior: number | null
    larguraMenor: number | null
    comprimentoMaior: number | null
    comprimentoMenor: number | null
  }
  materiais: {
    madeiras: UIMaterial[]
    materiaisGerais: UIMaterial[]
    telhas: UIMaterial[]
  }
  totais: {
    madeiras: number
    materiais: number
    comissao: number
    frete: number
    empresaPS: number
    empresaGD: number
  }
  links: { slideUrl: string | null; pdfUrl: string | null }
  telhaValores: Record<string, { pix: number; x10: number; x18: number }>
  dataCriacao: string | null
  dataUltimaAlteracao: string | null
  createdBy: { id: number; name: string; email: string } | null
  updatedBy: { id: number; name: string; email: string } | null
  lancadoObra: boolean
  lancadoObraEm: string | null
  obraId: number | null
}

export type PedidoCategoria = "TELHA" | "MADEIRA" | "MATERIAIS" | "ANDAIMES"

export type PedidoCompraStatus =
  | "RASCUNHO"
  | "PENDENTE"
  | "APROVADO"
  | "EM_COMPRA"
  | "AGUARDANDO_PAGAMENTO"
  | "AGUARDANDO_ENTREGA"
  | "ENTREGUE"
  | "CANCELADO"

export type PedidoItemDTO = {
  id: number
  pedidoCompraId: number
  descricao: string
  quantidade: number
  tamanho: number | null
  precoUnitario: number
  total: number
  createdAt: string | null
  updatedAt: string | null
}

export type PedidoCompraDTO = {
  id: number
  obraId: number
  categoria: PedidoCategoria | string
  status: PedidoCompraStatus | string

  fornecedorId: number | null
  fornecedor: { id: number; nome: string } | null

  valorOrcado: number | null
  valorPedido: number | null
  valorRealizado: number | null
  frete: number | null

  descricao: string | null
  observacoes: string | null

  dataEntrega: string | null
  enderecoEntrega: string | null
  nomeReceptor: string | null
  telefoneReceptor: string | null
  linkMaps: string | null

  createdAt: string | null
  updatedAt: string | null

  valores: {
    orcado: number | null
    pedido: number | null
    realizado: number | null
    frete: number | null
  }

  entrega: {
    data: string | null
    endereco: string | null
    receptor: string | null
    telefone: string | null
    maps: string | null
  }

  itens: PedidoItemDTO[]
}

export type ObraDetalheDTO = {
  id: number
  titulo: string | null
  status?: ObraStatus | string
  dataInicioObra?: string | null
  dataFimObra?: string | null
  orcamentoId?: number | null
  orcamento: { id: number } | null

  dataContrato: string | null
  dataConclusao: string | null

  anexos: {
    orcamentoId: number | null
    propostaSlide: string | null
    propostaPdf: string | null
    orcamentoPdf?: string | null
    contrato: string | null
    linkContratoAssinado?: string | null
    ordemServico: string | null
  }

  cliente: {
    id: number
    nome: string
    telefone: string | null
    bairro: string | null
    cidade: { id: number | null; nome: string | null }
    cpf: string | null
  }

  equipe: { id: number; nome: string } | null

  obra?: {
    endereco: string
    mapsUrl: string
    tipo: string
    largura: number
    comprimento: number
    telha: string
    valorObra: number
    valorMaoDeObra: number
    observacoes: string | null
  }

  dadosObra: {
    endereco: string
    mapsUrl: string
    tipoObra: string
    isLShape: boolean
    largura: number
    comprimento: number
    larguraMaior: number | null
    larguraMenor: number | null
    comprimentoMaior: number | null
    comprimentoMenor: number | null
    telhaEscolhida: string
    valorObra: number
    valorMaoDeObra: number
    status: ObraStatus
    observacoes: string | null
    dataCriacao: string | null
    dataUltimaAlteracao: string | null
  }

  financeiro: {
    entrada: { valor: number | null; forma: FormaPagamento | null; status: PagamentoStatus }
    quitacao: { valor: number | null; forma: FormaPagamento | null; status: PagamentoStatus }
  }

  pedidosCompra: PedidoCompraDTO[]

  ordemServico: {
    id: number
    equipeId: number
    equipe: { id: number; nome: string } | null
    dataPrevInicio: string
    dataPrevConclusao: string
  } | null

  imagens: Array<{ id: number; url: string; ordem: number | null; legenda: string | null; createdAt: string }>
  agenda?: Array<{
    id: number
    start: string
    end: string
    tipo: string
    status: string
    equipe: { id: number; nome: string; cor: string | null } | null
    observacoes: string | null
  }>
}
export type PedidoItemCreatePayload = {
  descricao: string
  quantidade: number | string
  preco_unitario: number | string
  total: number | string
  tamanho?: number | string
}

export type PedidoCompraCreatePayload = {
  categoria: "TELHA" | "MADEIRA" | "MATERIAIS" | "ANDAIMES" | string
  status?: string | null
  valor_orcado?: number | string | null
  valor_realizado?: number | string | null
  frete?: number | string | null
  descricao?: string | null
  observacoes?: string | null
  fornecedor_id?: number | string | null
  data_entrega?: string | Date | null
  endereco_entrega?: string | null
  nome_receptor?: string | null
  telefone_receptor?: string | null
  link_maps?: string | null
  itens?: PedidoItemCreatePayload[]
}

export type CreateObraPayload = {
  orcamentoId: number
  titulo?: string | null
  endereco_obra: string
  maps_url: string
  tipo_obra: string
  largura: number | string
  comprimento: number | string
  largura_maior?: number | string | null
  largura_menor?: number | string | null
  comprimento_maior?: number | string | null
  comprimento_menor?: number | string | null
  is_l_shape?: boolean
  telha_escolhida: string

  valor_obra: number | string
  valor_mao_de_obra: number | string

  status?: ObraStatus
  observacoes?: string | null

  equipe_id?: number | null
  data_prev_inicio?: string | Date | null
  data_prev_conclusao?: string | Date | null

  imagens?: ImagemInput[]

  area_telha?: number | string
  orcamento_telha?: number | string
  previsao_telha?: string | Date | null
  status_telha?: PedidoStatusPadrao | null
  fornecedor_telha_id?: number | null

  orcamento_madeira?: number | string
  previsao_madeira?: string | Date | null
  status_madeira?: PedidoStatusPadrao | null
  fornecedor_madeira_id?: number | null

  materiais_status?: PedidoStatusMateriais | null

  andaimes_status?: PedidoStatusAndaimes | null
  andaimes_fornecedor_id?: number | null

  telhaItens?: Array<{ descricao: string; quantidade: number | string; preco_unitario: number | string; total: number | string }>
  madeiraItens?: Array<{
    componente: string
    madeira_nome: string
    descricao: string
    quantidade: number | string
    tamanho: number | string
    preco_unitario: number | string
    total: number | string
  }>
  materiaisItens?: Array<{ descricao: string; quantidade: number | string; preco_unitario: number | string; total: number | string }>
  andaimesItens?: Array<{ descricao: string; quantidade: number | string; preco_unitario: number | string; total: number | string }>

  pedidosCompra?: PedidoCompraCreatePayload[]

  pagamento_entrada?: number | string
  forma_pagamento_entrada?: FormaPagamento | null
  status_pagamento_entrada?: PagamentoStatus | null

  pagamento_quitacao?: number | string
  forma_pagamento_quitacao?: FormaPagamento | null
  status_pagamento_quitacao?: PagamentoStatus | null

  clienteCpf?: string | null
  forceUpdateClienteCpf?: boolean
}


export type CriarObraResult = {
  obraId: number
  orcamentoId: number
  pedidoCompraId: number
  pedidos: { telhaId: number; madeiraId: number; materiaisId: number; andaimesId: number }
}

export type ObraInfosVM = {
  titulo?: string
  tipoObra: string | null
  isLShape: boolean
  largura: number | null
  comprimento: number | null
  larguraMaior?: number | null
  larguraMenor?: number | null
  comprimentoMaior?: number | null
  comprimentoMenor?: number | null
  telhaEscolhida: string
  status: ObraStatus
  dataCriacao?: string | null
  dataInicioObra?: string | null
  dataFimObra?: string | null
  dataContrato?: string | null
  dataConclusao?: string | null
  cliente: {
    id?: number
    nome: string
    telefone?: string | null
    cpf?: string | null
    bairro?: string | null
    cidadeId?: number | null
    cidade?: string | null
  }
  endereco: { logradouro: string; bairro: string; cidade: string; mapsUrl: string }
  observacoes?: string | null
}

export type ObsImagensVM = {
  observacoes?: string | null
  imagens: Array<{ id?: number; url: string; ordem?: number | null; legenda?: string | null }>
}

export type FinanceiroExecVM = {
  financeiro: {
    valorObra: number
    valorMaoDeObra: number
    entrada: { valor: number | null; forma: FormaPagamento | null; status: PagamentoStatus }
    quitacao: { valor: number | null; forma: FormaPagamento | null; status: PagamentoStatus }
  }
  execucao: { equipeId: number | null; dataPrevInicio: string | null; dataPrevConclusao: string | null }
}

export type AnexosVM = { orcamento?: string | null; contrato?: string | null; linkContratoAssinado?: string | null; proposta?: string | null; ordemServico?: string | null }

export type OrdemServicoPayload = {
  _delete?: boolean
  id?: number | string
  equipe_id?: number | string
  data_prev_inicio?: string | Date
  data_prev_conclusao?: string | Date
}

export type ImagemPayload = { id?: number | string; url?: string; ordem?: number; legenda?: string; _delete?: boolean }
export type ImagensPayload = { replace?: boolean; list?: ImagemPayload[] }

export type UpdateObraPayload = {
  obra?: {
    titulo?: string
    endereco_obra?: string
    maps_url?: string
    tipo_obra?: string
    largura?: number | string
    comprimento?: number | string
    largura_maior?: number | string | null
    largura_menor?: number | string | null
    comprimento_maior?: number | string | null
    comprimento_menor?: number | string | null
    is_l_shape?: boolean
    telha_escolhida?: string
    status?: ObraStatus
    observacoes?: string
    data_criacao?: string | Date | null
    data_inicio_obra?: string | Date | null
    data_fim_obra?: string | Date | null
    data_contrato?: string | Date | null
    data_conclusao?: string | Date | null
  }
  financeiro?: {
    valor_obra?: number | string
    valor_mao_de_obra?: number | string
    pagamento_entrada?: number | string
    forma_pagamento_entrada?: FormaPagamento
    status_pagamento_entrada?: PagamentoStatus
    pagamento_quitacao?: number | string
    forma_pagamento_quitacao?: FormaPagamento
    status_pagamento_quitacao?: PagamentoStatus
  }
  ordemServico?: OrdemServicoPayload
  imagens?: ImagensPayload
  pedidos_compra?: PedidoCompraCreatePayload[]
}

export type UpdateObraResponse = { ok: boolean; status: number; data?: { id: number }; error?: string }
