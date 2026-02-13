import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
async function main() {
    console.log("Prisma keys:", Object.keys(prisma))
    // Also check deeper prototype keys if needed, but usually models are on instance or prototype
    // For Prisma v5/v6, models are often getters on the instance.
    // Let's try to access specific ones
    try { console.log("fornecedores:", !!prisma.fornecedores) } catch (e) { console.log("fornecedores error", e) }
    try { console.log("fornecedor:", !!prisma.fornecedor) } catch (e) { console.log("fornecedor error", e) }
}
main()
