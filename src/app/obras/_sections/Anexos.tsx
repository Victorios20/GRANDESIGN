"use client"

import { useMemo } from "react"
import { toast } from "sonner"
import {
  Paperclip,
  ExternalLink,
  FileText,
  FileSignature,
  FileSpreadsheet,
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import CopyLinkButton from "@/components/ui/CopyLinkButton"

type Mode = "new" | "view" | "edit"

type Props = {
  mode: Mode
  /** Se vier pronto, usamos este link. Caso não venha, tentamos montar via `orcamentoId`. */
  orcamentoLink?: string | null
  /** Usado apenas como fallback para montar a URL do orçamento local. */
  orcamentoId?: number | null
  /** link da proposta (ex: slide) */
  propostaLink?: string | null
  /** só aparece em view/edit */
  contratoLink?: string | null
  /** só aparece em view/edit */
  ordemServicoLink?: string | null
  className?: string
}

type LinkFieldProps = {
  label: string
  value?: string | null
  icon: React.ElementType
}

function LinkField({ label, value, icon: Icon }: LinkFieldProps) {
  const hasValue = Boolean(value && value.trim().length > 0)

  const goTo = () => {
    if (!hasValue || !value) return
    try {
      window.open(value, "_blank", "noopener,noreferrer")
    } catch {
      // fallback silencioso
    }
  }

  return (
    <div className="w-full md:w-[22rem] lg:w-[24rem] flex flex-col gap-2">
      <Label className="inline-flex items-center gap-2 font-medium text-black">
        <Icon className="h-4 w-4" />
        {label}
      </Label>

      <div className="flex items-center gap-2">
        <Input
          value={value ?? ""}
          disabled
          className="h-10 rounded-xl bg-cinza border-0 text-black disabled:opacity-100 disabled:cursor-default"
          placeholder="—"
        />

        {/* Botão de copiar — verde com ícone branco */}
        <CopyLinkButton
          value={value ?? ""}
          label={`Copiar ${label}`}
          color="green"
          className="h-10 w-10 rounded-xl"
        />

        {/* Abrir link — verde com ícone branco */}
        <Button
          type="button"
          className="h-10 w-10 p-0 rounded-xl bg-green text-white hover:bg-green/90"
          onClick={goTo}
          disabled={!hasValue}
          aria-label={`Abrir ${label}`}
          title="Abrir em nova aba"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function Anexos({
  mode,
  orcamentoLink,
  orcamentoId,
  propostaLink,
  contratoLink,
  ordemServicoLink,
  className,
}: Props) {
  const orcamentoUrl = useMemo(() => {
    // 1) Se já veio pronto, usa direto
    if (orcamentoLink && orcamentoLink.trim()) return orcamentoLink.trim()

    // 2) Fallback: montar pela rota local usando o ID
    if (!orcamentoId) return ""
    if (typeof window === "undefined") return ""

    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"

    const base = isLocal ? "http://localhost:3000" : `${window.location.origin}`
    return `${base}/orcamento/detalhes/${orcamentoId}`
  }, [orcamentoLink, orcamentoId])

  const showExtra = mode !== "new" // contrato & OS só em view/edit

  return (
    <Card className={`w-full rounded-2xl border-0 shadow-md bg-white ${className ?? ""}`}>
      <CardHeader className="px-6 pt-6 pb-2">
        <CardTitle className="flex items-center gap-2 text-green text-xl">
          <Paperclip className="h-5 w-5" />
          Anexos
        </CardTitle>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-2">
        <div className="w-full flex flex-wrap items-start justify-center gap-5">
          <LinkField label="Orçamento" value={orcamentoUrl} icon={FileText} />
          {showExtra && (
            <LinkField label="Contrato" value={contratoLink ?? ""} icon={FileSignature} />
          )}
          <LinkField label="Proposta" value={propostaLink ?? ""} icon={FileSpreadsheet} />
          {showExtra && (
            <LinkField label="Ordem de Serviço" value={ordemServicoLink ?? ""} icon={FileText} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
