"use client"

import { useMemo } from "react"
import type { ElementType } from "react"
import {
  Paperclip,
  ExternalLink,
  FileText,
  FileSignature,
  FileSpreadsheet,
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

type Mode = "new" | "view" | "edit"

type Props = {
  mode: Mode
  orcamentoLink?: string | null
  orcamentoId?: number | null
  propostaLink?: string | null
  contratoLink?: string | null
  ordemServicoId?: number | null
  className?: string
}

type LinkFieldProps = {
  label: string
  value?: string | null
  icon: ElementType
}

function LinkField({ label, value, icon: Icon }: LinkFieldProps) {
  const href = (value ?? "").trim()
  const hasValue = href.length > 0

  return (
    <div className="w-full flex items-center gap-3 min-w-0">
      <Label className="inline-flex items-center gap-2 font-medium text-black text-sm shrink-0">
        <Icon className="h-4 w-4" />
        {label}:
      </Label>

      {hasValue ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-0 items-center gap-2 text-black text-xs cursor-pointer hover:underline"
          title={href}
        >
          <span className="min-w-0 truncate">{href}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" />
        </a>
      ) : (
        <span className="text-black/60 text-xs">-</span>
      )}
    </div>
  )
}

export default function Anexos({
  mode,
  orcamentoLink,
  orcamentoId,
  propostaLink,
  contratoLink,
  ordemServicoId,
  className,
}: Props) {
  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return ""

    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"

    return isLocal ? "http://localhost:3000" : window.location.origin
  }, [])

  const orcamentoUrl = useMemo(() => {
    if (orcamentoLink && orcamentoLink.trim()) return orcamentoLink.trim()
    if (!orcamentoId || !baseUrl) return ""
    return `${baseUrl}/orcamento/detalhes/${orcamentoId}`
  }, [orcamentoLink, orcamentoId, baseUrl])

  const ordemServicoUrl = useMemo(() => {
    if (!ordemServicoId || !baseUrl) return ""
    return `${baseUrl}/ordemServico/${ordemServicoId}`
  }, [ordemServicoId, baseUrl])

  const showExtra = mode !== "new"

  return (
    <Card className={`w-full rounded-2xl border-0 shadow-md bg-white ${className ?? ""}`}>
      <CardHeader className="px-7 pt-7 pb-3">
        <CardTitle className="flex items-center gap-2 text-green text-xl">
          <Paperclip className="h-5 w-5" />
          Anexos
        </CardTitle>
      </CardHeader>

      <CardContent className="px-7 pb-7 pt-3">
        <div className="w-full flex flex-col gap-4">
          <LinkField label="Orçamento" value={orcamentoUrl} icon={FileText} />

          <LinkField
            label="Contrato"
            value={showExtra ? contratoLink ?? "" : ""}
            icon={FileSignature}
          />

          <LinkField
            label="Proposta"
            value={propostaLink ?? ""}
            icon={FileSpreadsheet}
          />

          <LinkField
            label="Ordem de Serviço"
            value={showExtra ? ordemServicoUrl : ""}
            icon={FileText}
          />
        </div>
      </CardContent>
    </Card>
  )
}
