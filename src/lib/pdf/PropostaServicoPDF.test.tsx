import { renderToBuffer } from "@react-pdf/renderer"
import { expect, test } from "vitest"
import { PropostaServicoDocument, type PropostaPDFData } from "@/lib/pdf/PropostaServicoPDF"

test("renderiza um PDF não-vazio", async () => {
  const data: PropostaPDFData = {
    numero: "0001",
    titulo: "Reforma de coberta — Teste",
    clienteNome: "Cliente Teste",
    descricaoServico: "Execução completa da cobertura em massaranduba.",
    dimensoes: "5,00 m x 2,00 m",
    itens: ["Linha 10cm", "Caibros", "Parafusos Franceses"],
    valorFinal: 7300,
    formaPagamento: "60% entrada, 40% no término",
    prazoExecucao: "Até 20 dias",
    validade: "07/07/2026",
  }
  const buffer = await renderToBuffer(<PropostaServicoDocument data={data} /> as any)
  expect(buffer.length).toBeGreaterThan(1000)
  // Assinatura de arquivo PDF
  expect(buffer.subarray(0, 4).toString()).toBe("%PDF")
})
