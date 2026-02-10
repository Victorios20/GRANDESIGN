
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("Verifying 'cidades' table schema...")

    try {
        // 1. Check if column exists
        const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cidades'
    `
        console.log("Columns in 'cidades':", columns)

        // 2. Try to insert a test city with color
        const testName = `TestCity_${Date.now()}`
        const testColor = "#FF0000"

        console.log(`Attempting to insert city: ${testName}, color: ${testColor}`)

        const result = await prisma.$queryRaw`
      INSERT INTO cidades (nome, cor)
      VALUES (${testName}, ${testColor})
      RETURNING id, nome, cor
    `
        console.log("Insert result:", result)

        // 3. Clean up
        if (Array.isArray(result) && result[0]?.id) {
            await prisma.$queryRaw`DELETE FROM cidades WHERE id = ${result[0].id}`
            console.log("Cleaned up test city.")
        }

    } catch (e) {
        console.error("Error during verification:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
