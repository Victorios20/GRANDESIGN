"use client"

import { ObraDetalhada } from "../lib/types"

type Props = {
  data: ObraDetalhada
  onChange: (patch: Partial<ObraDetalhada>) => void
  isEditing: boolean
}

export default function ObsImagens({ data, onChange, isEditing }: Props) {
  const obsText = data.observacoes.join("\n")
  function onObsChange(v: string) {
    onChange({ observacoes: v.split("\n") })
  }
  return (
    <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-12">
      <div>
        <h3 className="text-marromEscuro font-semibold mb-3">Observações</h3>
        {!isEditing ? (
          <div className="space-y-2">
            {data.observacoes.map((o, i) => (
              <p key={i} className="text-marromEscuro">{o}</p>
            ))}
          </div>
        ) : (
          <textarea className="w-full h-32 border border-marromClaro rounded-md p-3 bg-white" value={obsText} onChange={(e) => onObsChange(e.target.value)} />
        )}
      </div>
      <div>
        <h3 className="text-marromEscuro font-semibold mb-3">Imagens</h3>
        <div className="grid grid-cols-2 gap-4">
          {data.imagens.slice(0, 4).map((src, i) => (
            <img key={i} src={src} alt="" className="w-full h-28 object-cover rounded-md border border-marromClaro" />
          ))}
        </div>
        {data.imagens.length > 4 && <p className="text-sm text-marromClaro mt-2">+{data.imagens.length - 4}</p>}
      </div>
    </section>
  )
}
