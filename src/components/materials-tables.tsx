import { Badge } from "@/components/ui/badge"

export function MaterialsTables() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Telhas */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Telhas</h3>
            <Badge className="bg-info/10 text-info-foreground">Em medição</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Área: 100,00m² | M² R$25,00 | Quantidade</p>
          <p className="text-xs text-muted-foreground">Previsto: R$ 2.500,00 | Executado visita técnica</p>
          <p className="mt-1 text-xs text-muted-foreground">Area: 22,20</p>
        </div>
      </div>

      {/* Madeiras */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Madeiras</h3>
            <Badge className="bg-warning/10 text-warning-foreground">Em andamento</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Desconto: %</p>
        </div>
        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2">Material</th>
                <th className="pb-2">Unid</th>
                <th className="pb-2 text-right">Qtd</th>
                <th className="pb-2 text-right">Executado</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-t border-border">
                <td className="py-2">Pireque</td>
                <td>Unha Obra</td>
                <td className="text-right">1</td>
                <td className="text-right">5 Un</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2">Caibro</td>
                <td>Unha Si Beril</td>
                <td className="text-right">3</td>
                <td className="text-right">2 Un</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2">Ripas</td>
                <td>Unha Si Beril</td>
                <td className="text-right">1</td>
                <td className="text-right">1 Un</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2">Pontalete</td>
                <td>Unha Obra</td>
                <td className="text-right">1</td>
                <td className="text-right">5 Un</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2">Caibros</td>
                <td></td>
                <td className="text-right">1</td>
                <td className="text-right">1 Un</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2">Pregos</td>
                <td></td>
                <td className="text-right">1</td>
                <td className="text-right">1 KG</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Materiais */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Materiais</h3>
            <Badge className="bg-success/10 text-success-foreground">Finalizado</Badge>
          </div>
        </div>
        <div className="p-4">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t border-border">
                <td className="py-2">Saco</td>
                <td className="text-right">Qtd: 3</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2">Areia</td>
                <td className="text-right">Qtd: 1</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2">Parafuso</td>
                <td className="text-right">Qtd: 10</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Andaimes */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Andaimes</h3>
            <Badge className="bg-success/10 text-success-foreground">Finalizado</Badge>
          </div>
        </div>
        <div className="p-4">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t border-border">
                <td className="py-2">Tipo</td>
                <td className="text-right">Qtd: 2</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2">Tipo</td>
                <td className="text-right">Qtd: 1</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2">Parafuso</td>
                <td className="text-right">Qtd: 10</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
