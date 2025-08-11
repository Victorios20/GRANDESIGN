// src/app/gerar-orcamento/new/page.tsx

import OrcamentoPage from "../_components/OrcamentoPage"

export const metadata = {
  title: "Gerar Orçamento — Novo",
  description: "Criar um novo orçamento",
}

export default function NewOrcamentoPage() {
  // O componente já está preparado para o modo create por padrão,
  // mas passamos explicitamente para deixar claro.
  return <OrcamentoPage mode="create" />
}
