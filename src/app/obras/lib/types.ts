export type ObraStatus =
  | 'Assinatura de contrato'
  | 'Aguardando validação técnica'
  | 'Compras'
  | 'À iniciar'
  | 'Execução'
  | 'Aguardando pagamento'
  | 'Pendência'
  | 'Finalizado'

export type PagamentoStatus = 'Pendente' | 'Efetuado'

export type PedidoStatusPadrao = 'Pendente' | 'Aguardando pagamento' | 'Pedido feito' | 'Entregue'
export type PedidoStatusMateriais = 'Pendente' | 'Em estoque' | 'Entregue'
export type PedidoStatusAndaimes = 'Pendente' | 'Pedido feito' | 'Entregue' | 'À coletar' | 'Coletado'

export type UIMaterial = {
  id: string | number
  nome: string
  componente: string | null
  quantidade: number
  preco: number
  tamanho?: number | null
  frete?: number
}

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
}

export type ObraDetalheDTO = {
  id: number
  titulo: string | null
  orcamento: { id: number } | null

  anexos: {
    orcamentoId: number | null
    propostaSlide: string | null
    propostaPdf: string | null
    contrato: string | null
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

  dadosObra: {
    endereco: string
    mapsUrl: string
    tipoObra: string
    largura: number
    comprimento: number
    telhaEscolhida: string
    valorObra: number
    valorMaoDeObra: number
    status: ObraStatus
    observacoes: string | null
    dataCriacao: string | null
    dataUltimaAlteracao: string | null
  }

  financeiro: {
    entrada: { valor: number | null; forma: string | null; status: PagamentoStatus }
    quitacao: { valor: number | null; forma: string | null; status: PagamentoStatus }
  }

  pedidoCompra: {
    id: number
    links: { telhaId: number | null; madeiraId: number | null; materiaisId: number | null; andaimesId: number | null }
    linksData: {
      telha?: { id: number; descricao: string; quantidade: number; precoUnitario: number; total: number }
      madeira?: {
        id: number
        componente: string
        madeiraNome: string
        descricao: string
        quantidade: number
        tamanho: number
        precoUnitario: number
        total: number
      }
      materiais?: { id: number; descricao: string; quantidade: number; precoUnitario: number; total: number }
      andaimes?: { id: number; descricao: string; quantidade: number; precoUnitario: number; total: number }
    }
    telha: { orcamento: number; area: number; status: PedidoStatusPadrao; previsao: string | null }
    madeira: { orcamento: number; status: PedidoStatusPadrao; previsao: string | null }
    materiais: { status: PedidoStatusMateriais }
    andaimes: { status: PedidoStatusAndaimes }
    fornecedores: {
      madeira: { id: number; nome: string } | null
      andaimes: { id: number; nome: string } | null
    }
    itens: {
      telha: Array<{ id: number; descricao: string; quantidade: number; precoUnitario: number; total: number }>
      madeira: Array<{
        id: number
        componente: string
        madeiraNome: string
        descricao: string
        quantidade: number
        tamanho: number
        precoUnitario: number
        total: number
      }>
      materiais: Array<{ id: number; descricao: string; quantidade: number; precoUnitario: number; total: number }>
      andaimes: Array<{ id: number; descricao: string; quantidade: number; precoUnitario: number; total: number }>
    }
  } | null

  ordemServico: {
    id: number
    equipeId: number
    equipe: { id: number; nome: string } | null
    dataPrevInicio: string
    dataPrevConclusao: string
  } | null

  imagens: Array<{ id: number; url: string; ordem: number | null; legenda: string | null; createdAt: string }>
}


export type ImagemInput = { url: string; ordem?: number | null; legenda?: string | null }

export type CreateObraPayload = {
  orcamentoId: number
  endereco_obra: string
  maps_url: string
  tipo_obra: string
  largura: number | string
  comprimento: number | string
  telha_escolhida: string
  valor_obra: number | string
  valor_mao_de_obra: number | string
  observacoes?: string | null
  equipe_id?: number | null
  imagens?: ImagemInput[]
  area_telha?: number | string
  orcamento_telha?: number | string
  orcamento_madeira?: number | string
  clienteCpf?: string | null
  forceUpdateClienteCpf?: boolean
}

export type CriarObraResult = {
  obraId: number
  orcamentoId: number
  pedidoCompraId: number
  pedidos: { telhaId: number; madeiraId: number; materiaisId: number; andaimesId: number }
}

export type PedidoLinksPayload = {
  telha?: { id?: number | string; descricao?: string; quantidade?: number | string; preco_unitario?: number | string; total?: number | string }
  madeira?: {
    id?: number | string
    componente?: string
    madeira_nome?: string
    descricao?: string
    quantidade?: number | string
    tamanho?: number | string
    preco_unitario?: number | string
    total?: number | string
  }
  materiais?: { id?: number | string; descricao?: string; quantidade?: number | string; preco_unitario?: number | string; total?: number | string }
  andaimes?: { id?: number | string; descricao?: string; quantidade?: number | string; preco_unitario?: number | string; total?: number | string }
}

export type PedidoItensUpsert = {
  id?: number | string
  _delete?: boolean
  descricao?: string
  quantidade?: number | string
  preco_unitario?: number | string
  total?: number | string
  componente?: string
  madeira_nome?: string
  tamanho?: number | string
}

export type PedidoCompraPayload = {
  orcamento_telha?: number | string
  previsao_telha?: string | Date
  status_telha?: PedidoStatusPadrao
  area_telha?: number | string
  orcamento_madeira?: number | string
  previsao_madeira?: string | Date
  status_madeira?: PedidoStatusPadrao
  fornecedor_madeira_id?: number | string | null
  materiais_status?: PedidoStatusMateriais
  andaimes_status?: PedidoStatusAndaimes
  andaimes_fornecedor_id?: number | string | null
  links?: PedidoLinksPayload
  itens?: {
    telha?: PedidoItensUpsert[]
    madeira?: PedidoItensUpsert[]
    materiais?: PedidoItensUpsert[]
    andaimes?: PedidoItensUpsert[]
  }
}

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
    endereco_obra?: string
    maps_url?: string
    tipo_obra?: string
    largura?: number | string
    comprimento?: number | string
    telha_escolhida?: string
    status?: ObraStatus
    observacoes?: string
  }
  financeiro?: {
    valor_obra?: number | string
    valor_mao_de_obra?: number | string
    pagamento_entrada?: number | string
    forma_pagamento_entrada?: string
    status_pagamento_entrada?: PagamentoStatus
    pagamento_quitacao?: number | string
    forma_pagamento_quitacao?: string
    status_pagamento_quitacao?: PagamentoStatus
  }
  pedidoCompra?: PedidoCompraPayload
  ordemServico?: OrdemServicoPayload
  imagens?: ImagensPayload
}

export type UpdateObraResponse = { ok: boolean; status: number; data?: { id: number }; error?: string }

export type ObraInfosVM = {
  titulo?: string
  tipoObra: string | null
  largura: number | null
  comprimento: number | null
  telhaEscolhida: string
  status: ObraStatus
  cliente: { nome: string; telefone?: string | null; cpf?: string | null; bairro?: string | null; cidade?: string | null }
  endereco: { logradouro: string; bairro: string; cidade: string; mapsUrl: string }
  observacoes?: string | null
}

export type ObsImagensVM = { observacoes?: string | null; imagens: Array<{ id?: number; url: string; ordem?: number | null; legenda?: string | null }> }

export type PedidoCompraVM = {
  telha: {
    status: PedidoStatusPadrao
    previsao: string | null
    orcamento: number
    area: number
    itens: Array<{ id?: number; descricao: string; quantidade: number; precoUnitario: number; total: number }>
  }
  madeira: {
    status: PedidoStatusPadrao
    previsao: string | null
    fornecedorId?: number | null
    orcamento?: number
    itens: Array<{ id?: number; componente: string; madeiraNome: string; descricao: string; quantidade: number; tamanho: number; precoUnitario: number; total: number }>
  }
  materiais: { status: PedidoStatusMateriais; itens: Array<{ id?: number; descricao: string; quantidade: number; precoUnitario: number; total: number }> }
  andaimes: { status: PedidoStatusAndaimes; fornecedorId?: number | null; itens: Array<{ id?: number; descricao: string; quantidade: number; precoUnitario: number; total: number }> }
}

export type FinanceiroExecVM = {
  financeiro: {
    valorObra: number
    valorMaoDeObra: number
    entrada: { valor: number | null; forma: string | null; status: PagamentoStatus }
    quitacao: { valor: number | null; forma: string | null; status: PagamentoStatus }
  }
  execucao: { equipeId: number | null; dataPrevInicio: string | null; dataPrevConclusao: string | null }
}

export type AnexosVM = { orcamento?: string | null; contrato?: string | null; proposta?: string | null; ordemServico?: string | null }
