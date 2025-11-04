"use client"

import { ObraDetalhada } from "../lib/types"
import { ComboboxAdd } from "@/components/ui/comboboxAdd"

type Props = {
  data: ObraDetalhada
  onChange: (patch: Partial<ObraDetalhada>) => void
  isEditing: boolean
}

export default function InfosGerais({ data, onChange, isEditing }: Props) {
  const tiposObra = [{ value: "Pontalete", label: "Pontalete" }, { value: "Estrutural", label: "Estrutural" }]
  const statusList = [
    { value: "Assinatura de contrato", label: "Assinatura de contrato" },
    { value: "Aguardando validação técnica", label: "Aguardando validação técnica" },
    { value: "Compras", label: "Compras" },
    { value: "À iniciar", label: "À iniciar" },
    { value: "Execução", label: "Execução" },
    { value: "Aguardando pagamento", label: "Aguardando pagamento" },
    { value: "Pendência", label: "Pendência" },
    { value: "Finalizado", label: "Finalizado" }
  ]
  return (
    <section className="w-full">
      <h2 className="text-2xl font-semibold text-marromEscuro mb-4">Informações gerais</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6">
        <div>
          <p className="text-sm text-marromClaro">Tipo de obra</p>
          {!isEditing ? (
            <p className="text-lg font-semibold text-marromEscuro">{data.tipoObra}</p>
          ) : (
            <div className="mt-1">
              <ComboboxAdd items={tiposObra} buttonText={data.tipoObra || "Selecionar"} onSelect={(v) => onChange({ tipoObra: v })} />
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-marromClaro">Endereço</p>
          {!isEditing ? (
            <p className="text-lg font-semibold text-marromEscuro">{data.endereco.logradouro}</p>
          ) : (
            <input value={data.endereco.logradouro} onChange={(e) => onChange({ endereco: { ...data.endereco, logradouro: e.target.value } })} className="mt-1 w-full h-8 px-3 border border-marromClaro rounded-md bg-white" />
          )}
        </div>

        <div>
          <p className="text-sm text-marromClaro">Largura</p>
          {!isEditing ? (
            <p className="text-lg font-semibold text-marromEscuro">{data.largura.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          ) : (
            <input type="number" step="0.01" value={data.largura} onChange={(e) => onChange({ largura: Number(e.target.value) })} className="mt-1 w-28 h-8 px-3 border border-marromClaro rounded-md bg-white" />
          )}
        </div>

        <div>
          <p className="text-sm text-marromClaro">Bairro</p>
          {!isEditing ? (
            <p className="text-lg font-semibold text-marromEscuro">{data.endereco.bairro}</p>
          ) : (
            <input value={data.endereco.bairro} onChange={(e) => onChange({ endereco: { ...data.endereco, bairro: e.target.value } })} className="mt-1 w-full h-8 px-3 border border-marromClaro rounded-md bg-white" />
          )}
        </div>

        <div>
          <p className="text-sm text-marromClaro">Comprimento</p>
          {!isEditing ? (
            <p className="text-lg font-semibold text-marromEscuro">{data.comprimento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          ) : (
            <input type="number" step="0.01" value={data.comprimento} onChange={(e) => onChange({ comprimento: Number(e.target.value) })} className="mt-1 w-28 h-8 px-3 border border-marromClaro rounded-md bg-white" />
          )}
        </div>

        <div>
          <p className="text-sm text-marromClaro">Cidade</p>
          {!isEditing ? (
            <p className="text-lg font-semibold text-marromEscuro">{data.endereco.cidade}</p>
          ) : (
            <input value={data.endereco.cidade} onChange={(e) => onChange({ endereco: { ...data.endereco, cidade: e.target.value } })} className="mt-1 w-full h-8 px-3 border border-marromClaro rounded-md bg-white" />
          )}
        </div>

        <div>
          <p className="text-sm text-marromClaro">Telha</p>
          {!isEditing ? (
            <p className="text-lg font-semibold text-marromEscuro">{data.telhaEscolhida}</p>
          ) : (
            <input value={data.telhaEscolhida} onChange={(e) => onChange({ telhaEscolhida: e.target.value })} className="mt-1 w-full h-8 px-3 border border-marromClaro rounded-md bg-white" />
          )}
        </div>

        <div>
          <p className="text-sm text-marromClaro">Cliente</p>
          <p className="text-lg font-semibold text-marromEscuro">{data.cliente.nome}</p>
        </div>

        <div>
          <p className="text-sm text-marromClaro">Status</p>
          {!isEditing ? (
            <p className="text-lg font-semibold text-orange-500">{data.status}</p>
          ) : (
            <div className="mt-1">
              <ComboboxAdd items={statusList} buttonText={data.status || "Selecionar"} onSelect={(v) => onChange({ status: v })} />
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-marromClaro">Telefone</p>
          <p className="text-lg font-semibold text-marromEscuro">{data.cliente.telefone}</p>
        </div>

        <div>
          <p className="text-sm text-marromClaro">CPF</p>
          <p className="text-lg font-semibold text-marromEscuro">{data.cliente.cpf}</p>
        </div>

        <div>
          <p className="text-sm text-marromClaro">Maps</p>
          {!isEditing ? (
            <a href={data.endereco.mapsUrl} target="_blank" className="text-lg font-semibold text-marromEscuro underline break-all">{data.endereco.mapsUrl}</a>
          ) : (
            <input value={data.endereco.mapsUrl} onChange={(e) => onChange({ endereco: { ...data.endereco, mapsUrl: e.target.value } })} className="mt-1 w-full h-8 px-3 border border-marromClaro rounded-md bg-white" />
          )}
        </div>
      </div>
    </section>
  )
}
