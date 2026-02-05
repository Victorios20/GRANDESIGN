import { Badge } from "@/components/ui/badge"
import { Phone, MapPin, Mail } from "lucide-react"

export function ProjectInfo() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border p-6">
        <h2 className="text-lg font-semibold">Informações gerais</h2>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Área Prevista</p>
              <p className="mt-1 text-sm font-medium">6,00</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Área Executada</p>
              <p className="mt-1 text-sm font-medium">3,00</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Área Paga</p>
              <p className="mt-1 text-sm font-medium">3,00</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Profissional</p>
            <p className="mt-1 text-sm font-medium">Roberta Martins</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-1">
              <Badge className="bg-warning/10 text-warning-foreground">Execução visita técnica</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Observações</p>
            <p className="text-sm text-foreground">Obra atende as condições correntes típicas de até 18 andares info</p>
            <p className="text-sm text-foreground">Quebra das de calc não tem troca de</p>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="flex items-start gap-2">
            <Phone className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Celular do Andrade</p>
              <p className="mt-1 text-sm font-medium">(85) 9 9999-9999</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Rua Governador Elisio 78</p>
              <div className="mt-1 flex gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Bairro</p>
                  <p className="text-sm font-medium">Ancuri</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cidade</p>
                  <p className="text-sm font-medium">Itaitinga</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p className="mt-1 text-sm font-medium">maps.google.com.br</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Imagens</p>
            <div className="mt-2 flex gap-2">
              <div className="relative size-20 overflow-hidden rounded-md border border-border bg-muted">
                <img src="/images/image.png" alt="Imagem da obra" className="size-full object-cover" />
              </div>
              <div className="relative size-20 overflow-hidden rounded-md border border-border bg-muted">
                <img src="/images/image.png" alt="Imagem da obra" className="size-full object-cover" />
              </div>
              <div className="flex size-20 items-center justify-center rounded-md border border-border bg-muted text-xs font-medium text-muted-foreground">
                +3
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
