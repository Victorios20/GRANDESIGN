"use client"

import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { useRouter } from "next/navigation"

type Props = {
  obraId: string
}

export default function HeaderActions({ obraId }: Props) {
  const router = useRouter()
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => router.push(`/obras/edit/${obraId}`)}
        className="bg-marromEscuro hover:bg-marromEscuro/90 text-white"
      >
        <Edit className="h-4 w-4 mr-2" />
        Editar
      </Button>
    </div>
  )
}
