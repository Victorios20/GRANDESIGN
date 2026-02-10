type GerarContratoInput = {
  orcamentoId?: number
  cliente: {
    nome: string
    telefone: string
    cpf: string
    bairro: string
    cidade: string
  }
  endereco: {
    logradouro: string
    bairro: string
    cidade: string
    mapsUrl: string
  }
  pagamento: {
    entrada: {
      valor: number
      forma: string | null
      status: string | null
    }
    quitacao: {
      valor: number
      forma: string | null
      status: string | null
    }
  }
  telhaEscolhida: string
}

type Args = {
  obraId: number
  input: GerarContratoInput
}

function pickContratoUrl(data: any): string {
  const cands = [
    data?.url,
    data?.link,
    data?.contratoUrl,
    data?.contrato_url,
    data?.data?.url,
    data?.data?.link,
    data?.data?.contratoUrl,
    data?.data?.contrato_url,
  ]

  for (const c of cands) {
    const s = String(c ?? "").trim()
    if (s) return s
  }
  return ""
}

function toErrorMessage(prefix: string, res: Response, bodyText?: string) {
  const status = res?.status
  const statusText = res?.statusText || ""
  const tail = bodyText ? ` - ${bodyText}` : ""
  return `${prefix} (${status}${statusText ? ` ${statusText}` : ""})${tail}`
}

export async function gerarContratoN8nESalvar({ obraId, input }: Args): Promise<string> {
  const webhookUrl = "https://n8n.grandesignce.com.br/webhook/gerar-contrato"

  const n8nRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!n8nRes.ok) {
    const txt = await n8nRes.text().catch(() => "")
    throw new Error(toErrorMessage("Falha no n8n ao gerar contrato", n8nRes, txt))
  }

  const n8nJson = await n8nRes.json().catch(() => ({}))
  const contratoUrl = pickContratoUrl(n8nJson)
  if (!contratoUrl) {
    throw new Error("n8n não retornou a URL do contrato.")
  }

  const saveRes = await fetch(`/api/obras/${obraId}/contrato`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ link_contrato: contratoUrl }),
  })

  if (!saveRes.ok) {
    const txt = await saveRes.text().catch(() => "")
    throw new Error(toErrorMessage("Falha ao salvar link_contrato na obra", saveRes, txt))
  }

  return contratoUrl
}
