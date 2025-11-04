"use client"

import { ObraDetalhada } from "../lib/types"

type Props = {
  data: ObraDetalhada
  onChange: (patch: Partial<ObraDetalhada>) => void
  isEditing: boolean
}

export default function FinanceiroExec({ data, onChange, isEditing }: Props) {
  const f = data.financeiro
  const e = data.execucao
  return (
    <section className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div>
        <h3 className="text-2xl font-semibold text-marromEscuro mb-4">Financeiro</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-marromClaro">Valor da obra</p>
            <p className="text-2xl font-bold text-marromEscuro">{f.valorObra.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          </div>
          <div>
            <p className="text-sm text-marromClaro">Mão de obra</p>
            <p className="text-2xl font-bold text-marromEscuro">{f.maoDeObra.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-cinza rounded-md border border-marromClaro">
          <p className="text-marromEscuro font-semibold">Pagamento</p>
          <div className="grid grid-cols-2 gap-6 mt-2">
            <div>
              <p className="text-sm text-marromClaro">Entrada</p>
              {!isEditing ? (
                <p className="text-xl font-bold text-marromEscuro">{f.pagamento.entradaValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
              ) : (
                <input type="number" step="0.01" value={f.pagamento.entradaValor} onChange={(v) => onChange({ financeiro: { ...f, pagamento: { ...f.pagamento, entradaValor: Number(v.target.value) } } as any })} className="mt-1 w-40 h-8 px-3 border border-marromClaro rounded-md bg-white" />
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-marromEscuro">{f.pagamento.entradaForma}</span>
                <span className={`text-xs px-2 py-1 rounded-md ${f.pagamento.entradaStatus === "Efetuado" ? "bg-green text-green border border-green" : "bg-gray-200 text-marromEscuro"}`}>{f.pagamento.entradaStatus}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-marromClaro">Quitação</p>
              {!isEditing ? (
                <p className="text-xl font-bold text-marromEscuro">{f.pagamento.quitacaoValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
              ) : (
                <input type="number" step="0.01" value={f.pagamento.quitacaoValor} onChange={(v) => onChange({ financeiro: { ...f, pagamento: { ...f.pagamento, quitacaoValor: Number(v.target.value) } } as any })} className="mt-1 w-40 h-8 px-3 border border-marromClaro rounded-md bg-white" />
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-marromEscuro">{f.pagamento.quitacaoForma}</span>
                <span className={`text-xs px-2 py-1 rounded-md ${f.pagamento.quitacaoStatus === "Efetuado" ? "bg-green text-green border border-green" : "bg-gray-200 text-marromEscuro"}`}>{f.pagamento.quitacaoStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-semibold text-marromEscuro mb-4">Execução</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-marromClaro">Equipe</p>
            {!isEditing ? (
              <p className="text-xl font-bold text-marromEscuro">{e.equipe}</p>
            ) : (
              <input value={e.equipe} onChange={(v) => onChange({ execucao: { ...e, equipe: v.target.value } })} className="mt-1 w-full h-8 px-3 border border-marromClaro rounded-md bg-white" />
            )}
          </div>
          <div>
            <p className="text-sm text-marromClaro">Data prevista de início</p>
            {!isEditing ? (
              <p className="text-xl font-bold text-marromEscuro">{e.dataPrevInicio || "-"}</p>
            ) : (
              <input type="date" value={e.dataPrevInicio || ""} onChange={(v) => onChange({ execucao: { ...e, dataPrevInicio: v.target.value } })} className="mt-1 w-48 h-8 px-3 border border-marromClaro rounded-md bg-white" />
            )}
          </div>
          <div>
            <p className="text-sm text-marromClaro">Data prevista de conclusão</p>
            {!isEditing ? (
              <p className="text-xl font-bold text-marromEscuro">{e.dataPrevConclusao || "-"}</p>
            ) : (
              <input type="date" value={e.dataPrevConclusao || ""} onChange={(v) => onChange({ execucao: { ...e, dataPrevConclusao: v.target.value } })} className="mt-1 w-48 h-8 px-3 border border-marromClaro rounded-md bg-white" />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
