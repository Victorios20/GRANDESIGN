import { Badge } from "@/components/ui/badge"

export function FinancialExecutionSection() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Financeiro */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold">Financeiro</h3>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Pagamento</p>
            <p className="mt-1 font-mono text-lg font-semibold">R$ 11.000,00</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Previsto</p>
            <p className="mt-1 font-mono text-lg font-semibold">R$ 52.000,00</p>
          </div>
        </div>
      </div>

      {/* Execução */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold">Execução</h3>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Previsto</p>
              <p className="mt-1 text-sm">Data: 09/10/2025</p>
            </div>
            <Badge className="bg-info/10 text-info-foreground">Em medição</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Executado</p>
              <p className="mt-1 text-sm">Data: 09/10/2025</p>
            </div>
            <Badge className="bg-success/10 text-success-foreground">Finalizado</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
