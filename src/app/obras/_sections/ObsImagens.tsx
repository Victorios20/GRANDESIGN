"use client"

import { useMemo } from "react"
import { Trash2, Plus, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export type ImgItem = { id?: number; url: string; ordem?: number | null; legenda?: string | null }

type Props = {
  /** string livre de observações da obra */
  observacoes: string | null | undefined
  /** lista de imagens simples para a obra (preview por URL por enquanto) */
  imagens: ImgItem[]
  /** troca VM parcial (Obs + Imagens) */
  onChange: (patch: { observacoes?: string | null; imagens?: ImgItem[] }) => void
  /** controla renderização estática/dinâmica */
  isEditing: boolean
}

export default function ObsImagens({ observacoes, imagens, onChange, isEditing }: Props) {
  const imgs = useMemo(() => imagens ?? [], [imagens])

  function setObs(v: string) {
    onChange({ observacoes: v })
  }

  function addEmpty() {
    const next: ImgItem[] = [...imgs, { url: "", ordem: (imgs?.length || 0) + 1, legenda: "" }]
    onChange({ imagens: next })
  }

  function updateAt(idx: number, patch: Partial<ImgItem>) {
    const next = [...imgs]
    next[idx] = { ...next[idx], ...patch }
    onChange({ imagens: next })
  }

  function removeAt(idx: number) {
    const next = imgs.filter((_, i) => i !== idx).map((it, i) => ({ ...it, ordem: i + 1 }))
    onChange({ imagens: next })
  }

  return (
    <Card className="rounded-2xl bg-white border-0 shadow-md">
      <CardHeader className="p-5">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-green">
          <ImageIcon className="h-5 w-5" />
          Observação & Imagens
        </CardTitle>
      </CardHeader>

      <CardContent className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Observações */}
        <div className="lg:col-span-1">
          <div className="flex flex-col gap-2">
            <Label className="text-green">Observações</Label>
            {isEditing ? (
              <Textarea
                className="min-h-40 bg-white"
                value={observacoes ?? ""}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Anote detalhes importantes sobre a obra…"
              />
            ) : (
              <div className="text-black/80 leading-relaxed whitespace-pre-wrap">
                {observacoes?.trim() ? observacoes : "—"}
              </div>
            )}
          </div>
        </div>

        {/* Imagens */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-green">Imagens</Label>
            {isEditing && (
              <Button onClick={addEmpty} size="sm" className="bg-green text-white hover:bg-green/80">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            )}
          </div>

          {imgs?.length ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {imgs.map((img, idx) => (
                <div key={(img.id ?? idx) + "-" + idx} className="rounded-xl border border-green/60 p-3">
                  <div className="aspect-video overflow-hidden rounded-lg bg-[#f4f4f4] flex items-center justify-center mb-3">
                    {img.url?.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img.url}
                        alt={img.legenda ?? `Imagem ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-black/50">
                        <ImageIcon className="h-5 w-5" />
                        Sem preview
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-black/80">URL</Label>
                        <Input
                          value={img.url ?? ""}
                          onChange={(e) => updateAt(idx, { url: e.target.value })}
                          placeholder="https://…"
                          className="bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1 flex flex-col gap-1">
                          <Label className="text-black/80">Ordem</Label>
                          <Input
                            type="number"
                            min={1}
                            value={img.ordem ?? idx + 1}
                            onChange={(e) => updateAt(idx, { ordem: Number(e.target.value || 0) })}
                            className="bg-white text-right"
                          />
                        </div>
                        <div className="col-span-2 flex flex-col gap-1">
                          <Label className="text-black/80">Legenda</Label>
                          <Input
                            value={img.legenda ?? ""}
                            onChange={(e) => updateAt(idx, { legenda: e.target.value })}
                            placeholder="Descrição curta"
                            className="bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeAt(idx)}
                          className="bg-black text-white hover:bg-black/80"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-sm text-black/70">
                        <span className="font-medium">Ordem:</span> {img.ordem ?? idx + 1}
                      </div>
                      <div className="text-sm text-black/80">
                        <span className="font-medium">Legenda:</span> {img.legenda?.trim() || "—"}
                      </div>
                      <div className="text-xs text-black/60 break-all">{img.url || "—"}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-green/60 p-6 text-center text-black/60">
              Nenhuma imagem adicionada.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
