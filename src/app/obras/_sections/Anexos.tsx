"use client"

import { useMemo } from "react"
import { toast } from "sonner"
import { Paperclip, Clipboard, ExternalLink, FileText, FileSignature, FileSpreadsheet, ClipboardCheck } from "lucide-react"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type Mode = "new" | "view" | "edit"

type Props = {
  mode: Mode
  orcamentoId?: number | null
  propostaLink?: string | null // link_slide (pode vir do orçamento no create e da obra no view/edit)
  contratoLink?: string | null // só aparece em view/edit
  ordemServicoLink?: string | null // só aparece em view/edit
  className?: string
}

type LinkFieldProps = {
  label: string
  value?: string | null
  icon: React.ElementType
}

function LinkField({ label, value, icon: Icon }: LinkFieldProps) {
  const hasValue = Boolean(value && value.trim().length > 0)

  const copyToClipboard = async () => {
    if (!hasValue || !value) return
    try {
      await navigator.clipboard.writeText(value)
      toast.success("Link copiado!")
    } catch {
      toast.error("Não foi possível copiar o link.")
    }
  }

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
        <Button
          type="button"
          variant="secondary"
          className="rounded-xl"
          onClick={copyToClipboard}
          disabled={!hasValue}
          aria-label={`Copiar ${label}`}
          title="Copiar"
        >
          {hasValue ? <Clipboard className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4 opacity-50" />}
        </Button>
        <Button
          type="button"
          className="rounded-xl bg-green text-white hover:bg-green/90"
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
  orcamentoId,
  propostaLink,
  contratoLink,
  ordemServicoLink,
  className,
}: Props) {
  const orcamentoUrl = useMemo(() => {
    if (!orcamentoId) return ""
    if (typeof window === "undefined") return ""
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    const base = isLocal ? "http://localhost:3000" : "https://dev.grandesignce.com.br"
    return `${base}/orcamento/detalhes/${orcamentoId}`
  }, [orcamentoId])

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
