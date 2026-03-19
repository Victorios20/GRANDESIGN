"use client"

import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"

export function PedidoCompraExportActions() {
  return (
    <div className="flex items-center justify-end gap-2 print:hidden">
      <Button type="button" variant="outline" onClick={() => window.close()}>
        Fechar
      </Button>
      <Button type="button" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" />
        Salvar em PDF
      </Button>
    </div>
  )
}
