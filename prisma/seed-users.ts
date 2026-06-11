import { PrismaClient } from "@prisma/client"
import * as bcrypt from "bcryptjs"
import { MODULE_CATALOG } from "../src/lib/access/modules"

const prisma = new PrismaClient()

// Módulos não-administrativos (operacional + financeiro). Páginas do grupo
// "admin" (/admin/users, /configuracoes) seguem protegidas por papel ADMIN/DEV.
const NON_ADMIN_MODULE_KEYS = MODULE_CATALOG
    .filter((m) => m.group !== "admin")
    .map((m) => m.key)

// Acesso default por papel, preservando o comportamento atual:
// - VENDEDOR: apenas home/orcamento/obras (espelha a allowlist hardcoded antiga).
// - VISITANTE: navega livre por todas as páginas não-administrativas (hoje não é restrito).
// - ADMIN/DEV: NENHUMA linha (bypass total no resolver). Não seedar.
const DEFAULT_ROLE_MODULES: Record<string, string[]> = {
    VENDEDOR: ["home", "orcamento", "obras"],
    VISITANTE: [...NON_ADMIN_MODULE_KEYS],
}

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

    // 1.1 Acesso default por papel (idempotente)
    for (const [roleName, moduleKeys] of Object.entries(DEFAULT_ROLE_MODULES)) {
        const roleId = roleMap[roleName]
        if (!roleId) continue
        if (moduleKeys.length === 0) continue

        await prisma.roleModuleAccess.createMany({
            data: moduleKeys.map((module_key) => ({ role_id: roleId, module_key })),
            skipDuplicates: true,
        })
        console.log(`  -> Access seeded for ${roleName}: ${moduleKeys.join(", ")}`)
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
