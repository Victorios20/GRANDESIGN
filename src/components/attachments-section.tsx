import { File, FileText, ImageIcon, Package } from "lucide-react"

export function AttachmentsSection() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <h3 className="font-semibold">Anexos/documentos relacionados</h3>
      </div>
      <div className="p-4">
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <span>Orçamento</span>
          </li>
          <li className="flex items-center gap-2">
            <File className="size-4 text-muted-foreground" />
            <span>Contrato</span>
          </li>
          <li className="flex items-center gap-2">
            <ImageIcon className="size-4 text-muted-foreground" />
            <span>Projetos</span>
          </li>
          <li className="flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" />
            <span>Ordem de serviço</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
