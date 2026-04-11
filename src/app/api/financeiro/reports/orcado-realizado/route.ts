import { NextRequest, NextResponse } from "next/server"
import { OrcadoRealizadoService } from "@/services/financial/orcado-realizado.service"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const obraIdParam = searchParams.get("obraId")

        if (!obraIdParam) {
            return NextResponse.json({ error: "Obra ID is required" }, { status: 400 })
        }

        const obraId = Number(obraIdParam)
        if (isNaN(obraId)) {
            return NextResponse.json({ error: "Invalid Obra ID" }, { status: 400 })
        }

        const report = await OrcadoRealizadoService.getReport(obraId)

        return NextResponse.json(report)
    } catch (error: any) {
        console.error("Error generating report:", error)
        return NextResponse.json(
            { error: error?.message || "Internal Server Error" },
            { status: 500 }
        )
    }
}
