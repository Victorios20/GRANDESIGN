import { NextRequest, NextResponse } from "next/server"
import { deleteObraDB } from "@/actions/obras/delete-obra-db"

export const dynamic = "force-dynamic"

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = Number(params.id)
        if (!id || isNaN(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
        }

        const result = await deleteObraDB(id)

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json(result)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Unexpected error" },
            { status: 500 }
        )
    }
}
