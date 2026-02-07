
import { prisma } from "@/lib/prisma"

async function main() {
    console.log("Testing prisma connections...")
    try {
        const obras = await prisma.obras.findMany({
            take: 1,
            select: { id: true }
        })
        console.log("Success findMany simple:", obras)

        const obraFull = await prisma.obras.findFirst({
            take: 1
        })
        console.log("Success findFirst full:", obraFull ? "Found" : "Not found")

    } catch (e) {
        console.error("Error:", e)
    }
}

main()
