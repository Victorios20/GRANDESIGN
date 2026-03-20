"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { editableStatusList, statusConfig } from "@/lib/pedido-compra-theme"
import { normalizeStatus } from "@/lib/pedido-compra-utils"
import { cn } from "@/lib/utils"
import type { PedidoStatus } from "@/types/pedido-compra"

type Props = {
  status: PedidoStatus
  disabled?: boolean
  onSubmit: (status: PedidoStatus) => Promise<void>
}

export function PedidoCompraInlineStatus({ status, disabled = false, onSubmit }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const currentLabel = useMemo(() => {
    const current = editableStatusList.find((item) => normalizeStatus(item) === status)
    return current ? statusConfig[current].label : status
  }, [status])

  async function handleSelect(nextStatus: PedidoStatus) {
    if (nextStatus === status) {
      setOpen(false)
      return
    }

    setSaving(true)
    try {
      await onSubmit(nextStatus)
      setOpen(false)
    } catch {
      return
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-9 min-w-[148px] justify-between rounded-lg border-[#ddd7cc] bg-white px-3 text-sm font-medium text-[#2c201b] hover:bg-[#f7f4ec]"
          aria-label="Alterar status do pedido"
        >
          <span className="truncate">{currentLabel}</span>
          {saving ? <Loader2 className="size-4 shrink-0 animate-spin text-[#6f6556]" /> : <ChevronsUpDown className="size-4 shrink-0 text-[#6f6556]" />}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 rounded-xl border-[#e8e1d6] p-3">
        <p className="text-sm font-medium text-[#2c201b]">Status</p>

        <div className="mt-2.5">
          <div className="space-y-1 rounded-xl border border-[#ece6db] bg-[#faf8f3] p-1">
            {editableStatusList.map((item) => {
              const value = normalizeStatus(item)
              const selected = status === value

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => void handleSelect(value)}
                  disabled={saving}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-wait disabled:opacity-70",
                    selected ? "bg-white text-[#2c201b] shadow-[0_1px_2px_rgba(16,24,40,0.06)]" : "text-[#6f6556] hover:bg-white/80 hover:text-[#2c201b]"
                  )}
                >
                  <span>{statusConfig[item].label}</span>
                  {saving && value !== status ? null : selected ? <Check className="size-4 text-[#393316]" /> : null}
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
