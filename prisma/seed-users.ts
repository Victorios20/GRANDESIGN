import { PrismaClient } from "@prisma/client"
import * as bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Starting Security Seed (Users & Roles)...")

    // 1. Roles
    const roles = [
        { name: "ADMIN", label: "Administrador" },
        { name: "DEV", label: "Desenvolvedor" },
        { name: "VENDEDOR", label: "Vendedor" },
        { name: "VISITANTE", label: "Visitante" },
    ]

    const roleMap: Record<string, number> = {}

    for (const r of roles) {
        let role = await prisma.role.findUnique({ where: { name: r.name } })
        if (!role) {
            console.log(`  -> Creating Role: ${r.name}`)
            role = await prisma.role.create({ data: r })
        } else {
            console.log(`  -> Role exists: ${r.name}`)
        }
        roleMap[r.name] = role.id
    }

    // 2. Admin User
    const adminEmail = "vriosdantas@gmail.com"
    const adminPassword = "Admin123!" // Temporary password
    const passwordHash = await bcrypt.hash(adminPassword, 10)

    let user = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!user) {
        console.log(`  -> Creating Admin User: ${adminEmail}`)
        user = await prisma.user.create({
            data: {
                name: "VICTOR RIOS DANTAS",
                email: adminEmail,
                password_hash: passwordHash,
                is_active: true,
            }
        })

        // Assign ADMIN role
        await prisma.userRole.create({
            data: {
                user_id: user.id,
                role_id: roleMap["ADMIN"]
            }
        })
        console.log(`✅ Admin user created and role assigned.`)
    } else {
        console.log(`  -> Admin user already exists: ${adminEmail}`)
    }

    console.log("✅ Security seed completed.")
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
