import { Button } from "@/components/ui/button"
import { ArrowLeft, Settings } from "lucide-react"

export function ProjectHeader() {
  return (
    <div className="flex items-center justify-between border-b border-border pb-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <p className="text-xs text-muted-foreground">Home / Obras</p>
          <h1 className="text-2xl font-semibold text-foreground">Obra Itaitinga</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="default">Salvar</Button>
        <Button variant="ghost" size="icon" className="size-8">
          <Settings className="size-4" />
        </Button>
      </div>
    </div>
  )
}
