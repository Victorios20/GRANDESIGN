"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Trash2, Plus, Image as ImageIcon, Eye, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export type ImgItem = {
  id?: number
  url: string
  legenda?: string | null
  file?: File
  previewUrl?: string
  uid?: string
  ordem?: number | null
}

type Props = {
  observacoes: string | null | undefined
  imagens: ImgItem[]
  onChange: (patch: { observacoes?: string | null; imagens?: ImgItem[] }) => void
  isEditing: boolean
}

function isBlobUrl(u?: string) {
  return typeof u === "string" && u.startsWith("blob:")
}

function isSignedUrl(u?: string) {
  if (!u) return false
  return u.includes("X-Amz-Signature=") || u.includes("X-Amz-Algorithm=")
}

function newUid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `uid_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function itemKey(it: ImgItem, fallbackIdx: number): string {
  return it.uid || (typeof it.id === "number" ? `db_${it.id}` : `idx_${fallbackIdx}`)
}

function withOrdem(list: ImgItem[]): ImgItem[] {
  return list.map((it, i) => ({ ...it, ordem: i + 1 }))
}

function stopDragStart(e: React.PointerEvent | React.MouseEvent | React.KeyboardEvent) {
  e.stopPropagation()
}

function extractS3KeyFromUrlOrKey(rawUrl: string): string | null {
  const u = (rawUrl ?? "").trim()
  if (!u) return null

  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    const key = u.replace(/^\/+/, "")
    return key ? key : null
  }

  try {
    const parsed = new URL(u)
    const path = parsed.pathname.replace(/^\/+/, "")
    if (!path) return null

    const parts = path.split("/")
    if (parts.length >= 2 && parts[0] !== "obras") {
      const maybeKey = parts.slice(1).join("/")
      return maybeKey ? maybeKey : null
    }

    return path
  } catch {
    return null
  }
}

async function presignKey(key: string): Promise<string> {
  const r = await fetch(`/api/s3/presign?key=${encodeURIComponent(key)}`, {
    method: "GET",
    cache: "no-store",
  })
  if (!r.ok) throw new Error("presign_failed")
  const j = await r.json()
  return String(j?.url ?? "")
}

function SortableCard({
  img,
  idx,
  isEditing,
  onOpenViewer,
  onRemove,
  onUpdateLegenda,
  onBroken,
  isBroken,
  resolvedSrc,
}: {
  img: ImgItem
  idx: number
  isEditing: boolean
  onOpenViewer: () => void
  onRemove: () => void
  onUpdateLegenda: (v: string) => void
  onBroken: () => void
  isBroken: boolean
  resolvedSrc: string
}) {
  const id = itemKey(img, idx)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <div
        className="rounded-xl border border-green/60 p-3 bg-white"
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        aria-label={`Reordenar mídia ${idx + 1}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-black/70">
            <GripVertical className="h-4 w-4" />
            <span className="text-xs">Posição {idx + 1}</span>
          </div>

          {isEditing && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 px-2"
              onPointerDown={stopDragStart}
              onClick={(e) => {
                e.stopPropagation()
                onOpenViewer()
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>

        <button
          type="button"
          onPointerDown={stopDragStart}
          onClick={(e) => {
            e.stopPropagation()
            onOpenViewer()
          }}
          className="w-full rounded-lg overflow-hidden bg-[#f4f4f4] border border-black/5"
          title="Clique para visualizar"
        >
          <div className="h-20 w-full flex items-center justify-center">
            {resolvedSrc?.trim() && !isBroken ? (
              <img
                src={resolvedSrc}
                alt={img.legenda ?? `Imagem ${idx + 1}`}
                className="h-full w-full object-cover"
                draggable={false}
                onError={onBroken}
              />
            ) : (
              <div className="flex items-center gap-2 text-black/50">
                <ImageIcon className="h-5 w-5" />
                Sem preview
              </div>
            )}
          </div>
        </button>

        {isEditing ? (
          <div className="mt-3 space-y-2">
            <div className="flex flex-col gap-1">
              <Label className="text-black/80">Legenda</Label>
              <Input
                value={img.legenda ?? ""}
                onPointerDown={stopDragStart}
                onChange={(e) => onUpdateLegenda(e.target.value)}
                placeholder="Descrição curta"
                className="bg-white h-9"
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8"
                onPointerDown={stopDragStart}
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenViewer()
                }}
              >
                <Eye className="h-4 w-4 mr-1" />
                Ver
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onPointerDown={stopDragStart}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
                className="bg-marromEscuro text-white hover:bg-black/80 h-8"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remover
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-1">
            <div className="text-sm text-black/80">
              <span className="font-medium">Legenda:</span> {img.legenda?.trim() || "-"}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ObsImagens({ observacoes, imagens, onChange, isEditing }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const imgs = useMemo(() => {
    const base = (imagens ?? []).filter(Boolean)
    const sorted = [...base].sort((a, b) => {
      const ao = Number(a?.ordem ?? 999999)
      const bo = Number(b?.ordem ?? 999999)
      if (ao !== bo) return ao - bo
      const ai = Number(a?.id ?? 999999)
      const bi = Number(b?.id ?? 999999)
      if (ai !== bi) return ai - bi
      return String(a?.url ?? "").localeCompare(String(b?.url ?? ""))
    })
    return sorted
  }, [imagens])

  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIdx, setViewerIdx] = useState<number>(0)

  const [brokenMap, setBrokenMap] = useState<Record<string, true>>({})
  const [signedMap, setSignedMap] = useState<Record<string, string>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  useEffect(() => {
    if (!imgs.length) {
      if (viewerOpen) setViewerOpen(false)
      setViewerIdx(0)
      return
    }
    if (viewerIdx > imgs.length - 1) setViewerIdx(imgs.length - 1)
  }, [imgs.length, viewerIdx, viewerOpen])

  useEffect(() => {
    const run = async () => {
      const tasks: Array<Promise<void>> = []

      imgs.forEach((img, idx) => {
        const keyId = itemKey(img, idx)
        const url = String(img?.url ?? "").trim()
        if (!url) return
        if (isBlobUrl(url)) return
        if (isSignedUrl(url)) return
        if (signedMap[keyId]) return

        const maybeKey = extractS3KeyFromUrlOrKey(url)
        if (!maybeKey) return
        if (!maybeKey.startsWith("obras/")) return

        tasks.push(
          presignKey(maybeKey)
            .then((signed) => {
              if (!signed) return
              setSignedMap((m) => ({ ...m, [keyId]: signed }))
              setBrokenMap((m) => {
                const next = { ...m }
                delete next[keyId]
                return next
              })
            })
            .catch(() => {})
        )
      })

      if (tasks.length) await Promise.all(tasks)
    }

    run()
  }, [imgs, signedMap])

  useEffect(() => {
    if (!isEditing) return
    if (!imgs.length) return

    const hasAnyNewWithoutUid = imgs.some((it) => typeof it.id !== "number" && !it.uid)
    if (!hasAnyNewWithoutUid) return

    const next = withOrdem(
      imgs.map((it) => ({
        ...it,
        uid: it.uid || (typeof it.id === "number" ? undefined : newUid()),
      }))
    )

    onChange({ imagens: next })
  }, [isEditing, imgs, onChange])

  function setObs(v: string) {
    onChange({ observacoes: v })
  }

  function openPicker() {
    inputRef.current?.click()
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    const nextBase = [...imgs]

    const added: ImgItem[] = Array.from(files).map((file) => {
      const preview = URL.createObjectURL(file)
      return {
        uid: newUid(),
        url: preview,
        previewUrl: preview,
        file,
        legenda: "",
      }
    })

    onChange({ imagens: withOrdem([...nextBase, ...added]) })
    if (inputRef.current) inputRef.current.value = ""
  }

  function removeAt(idx: number) {
    const target = imgs[idx]
    const blob = target?.previewUrl || target?.url
    if (isBlobUrl(blob)) {
      try {
        URL.revokeObjectURL(blob)
      } catch {}
    }

    const next = imgs.filter((_, i) => i !== idx)
    onChange({ imagens: withOrdem(next) })
    if (viewerOpen && viewerIdx === idx) setViewerOpen(false)

    const k = itemKey(target, idx)
    setSignedMap((m) => {
      const nextMap = { ...m }
      delete nextMap[k]
      return nextMap
    })
    setBrokenMap((m) => {
      const nextMap = { ...m }
      delete nextMap[k]
      return nextMap
    })
  }

  function openViewer(idx: number) {
    setViewerIdx(idx)
    setViewerOpen(true)
  }

  function updateLegenda(idx: number, legenda: string) {
    const next = [...imgs]
    next[idx] = { ...next[idx], legenda }
    onChange({ imagens: withOrdem(next) })
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    if (active.id === over.id) return

    const ids = imgs.map((it, i) => itemKey(it, i))
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return

    const moved = arrayMove(imgs, oldIndex, newIndex)
    onChange({ imagens: withOrdem(moved) })
  }

  const current = imgs[viewerIdx]
  const currentKey = current ? itemKey(current, viewerIdx) : ""
  const isCurrentBroken = currentKey ? !!brokenMap[currentKey] : false

  const currentSrc = useMemo(() => {
    if (!current) return ""
    const url = String(current.url ?? "").trim()
    if (!url) return ""
    if (isBlobUrl(url)) return url
    if (isSignedUrl(url)) return url
    return signedMap[currentKey] ?? url
  }, [current, currentKey, signedMap])

  return (
    <Card className="rounded-2xl bg-white border-0 shadow-md">
      <CardHeader className="p-5">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-green">
          <ImageIcon className="h-5 w-5" />
          Observação & Imagens
        </CardTitle>
      </CardHeader>

      <CardContent className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                {observacoes?.trim() ? observacoes : "-"}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-green">Imagens</Label>

            {isEditing && (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
                <Button onClick={openPicker} size="sm" className="bg-green text-white hover:bg-green/80">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            )}
          </div>

          {imgs?.length ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={imgs.map((it, i) => itemKey(it, i))} strategy={rectSortingStrategy}>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {imgs.map((img, idx) => {
                    const key = itemKey(img, idx)
                    const isBroken = !!brokenMap[key]

                    const url = String(img?.url ?? "").trim()
                    const resolvedSrc =
                      !url
                        ? ""
                        : isBlobUrl(url) || isSignedUrl(url)
                        ? url
                        : signedMap[key] ?? url

                    return (
                      <SortableCard
                        key={key}
                        img={img}
                        idx={idx}
                        isEditing={isEditing}
                        onOpenViewer={() => openViewer(idx)}
                        onRemove={() => removeAt(idx)}
                        onUpdateLegenda={(v) => updateLegenda(idx, v)}
                        onBroken={() => setBrokenMap((m) => ({ ...m, [key]: true }))}
                        isBroken={isBroken}
                        resolvedSrc={resolvedSrc}
                      />
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="rounded-xl border border-green/60 p-6 text-center text-black/60">
              Nenhuma imagem adicionada.
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-green">
              {current?.legenda?.trim() ? current.legenda : `Imagem ${viewerIdx + 1}`}
            </DialogTitle>
          </DialogHeader>

          <div className="w-full flex items-center justify-center">
            {currentSrc?.trim() && !isCurrentBroken ? (
              <img
                src={currentSrc}
                alt={current?.legenda ?? `Imagem ${viewerIdx + 1}`}
                className="max-h-[72vh] w-auto rounded-xl object-contain"
                onError={() => {
                  if (!current) return
                  const k = itemKey(current, viewerIdx)
                  setBrokenMap((m) => ({ ...m, [k]: true }))
                }}
              />
            ) : (
              <div className="text-black/60">Sem imagem</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
