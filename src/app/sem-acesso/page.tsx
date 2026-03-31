import Link from "next/link"
import { ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SemAcessoPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F4EE] px-4">
            <Card className="w-full max-w-md border border-[#2C201B]/10 bg-[#FFFCF7] shadow-sm">
                <CardHeader className="space-y-4 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2C201B]/8 bg-[#FAF3E0]">
                        <ShieldAlert className="size-6 text-[#393316]" />
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-2xl font-semibold text-[#2C201B]">Sem acesso</CardTitle>
                        <p className="text-sm text-[#2C201B]/64">
                            Você não tem permissão para visualizar esta área administrativa.
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Button asChild>
                        <Link href="/">Voltar para Home</Link>
                    </Button>
                </CardContent>
            </Card>
        </main>
    )
}
