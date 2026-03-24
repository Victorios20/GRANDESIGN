"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { listToolbarClass } from "./styles"

type Props = {
  currentPage: number
  totalPages: number
  totalItems: number
  startIndex: number
  endIndex: number
  onPageChange: (page: number) => void
}

export function PedidoCompraListPagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
}: Props) {
  return (
    <section className={cn(listToolbarClass, "flex flex-col gap-4 md:flex-row md:items-center md:justify-between")}>
      <div className="text-sm text-[#7b705f]">
        Mostrando {startIndex} a {endIndex} de {totalItems} pedidos
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="h-8 rounded-lg border-[#ddd7cc] bg-white px-3 text-[#2c201b]"
        >
          Anterior
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <Button
              key={page}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(page)}
              className={cn(
                "h-8 min-w-8 rounded-lg px-0 text-[#6f6556] hover:bg-[#f3efe6] hover:text-[#2c201b]",
                currentPage === page && "bg-[#393316] text-[#faf3e0] hover:bg-[#393316] hover:text-[#faf3e0]"
              )}
            >
              {page}
            </Button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="h-8 rounded-lg border-[#ddd7cc] bg-white px-3 text-[#2c201b]"
        >
          Próximo
        </Button>
      </div>
    </section>
  )
}
