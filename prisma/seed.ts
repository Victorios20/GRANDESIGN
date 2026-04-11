import { PrismaClient, TipoCategoria } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Starting Financial Module Seed...")

    // 1. Create Default Categories (Idempotent)
    await seedCategories()

    console.log("✅ Seed completed successfully.")
}

async function seedCategories() {
    const categories = [
        // RECEITAS
        {
            nome: "Vendas",
            tipo: TipoCategoria.RECEITA,
            subcategorias: ["Venda de Produtos", "Venda de Serviços"],
            cor: "#10b981", // Emerald-500
        },
        {
            nome: "Serviços",
            tipo: TipoCategoria.RECEITA,
            subcategorias: ["Consultoria", "Manutenção"],
            cor: "#3b82f6", // Blue-500
        },
        {
            nome: "Outros Recebimentos",
            tipo: TipoCategoria.RECEITA,
            subcategorias: ["Rendimentos", "Reembolsos"],
            cor: "#6366f1", // Indigo-500
        },
        // DESPESAS
        {
            nome: "Fornecedores",
            tipo: TipoCategoria.DESPESA,
            subcategorias: ["Matéria Prima", "Comercial"],
            cor: "#ef4444", // Red-500
        },
        {
            nome: "Salários",
            tipo: TipoCategoria.DESPESA,
            subcategorias: ["Operacional", "Administrativo", "Comissões"],
            cor: "#f59e0b", // Amber-500
        },
        {
            nome: "Impostos",
            tipo: TipoCategoria.DESPESA,
            subcategorias: ["Federais", "Estaduais", "Municipais"],
            cor: "#92400e", // Amber-800
        },
        {
            nome: "Despesas Administrativas",
            tipo: TipoCategoria.DESPESA,
            subcategorias: ["Aluguel", "Energia", "Internet", "Material de Escritório"],
            cor: "#64748b", // Slate-500
        },
        {
            nome: "Despesas Operacionais",
            tipo: TipoCategoria.DESPESA,
            subcategorias: ["Combustível", "Manutenção Veículos"],
            cor: "#71717a", // Zinc-500
        },
        // SISTEMA / TRANSFERÊNCIAS
        {
            nome: "Transferências (Entrada)",
            tipo: TipoCategoria.RECEITA,
            subcategorias: [],
            cor: "#8b5cf6", // Violet-500
            system: true
        },
        {
            nome: "Transferências (Saída)",
            tipo: TipoCategoria.DESPESA,
            subcategorias: [],
            cor: "#8b5cf6", // Violet-500
            system: true
        }
    ]

    for (const cat of categories) {
        // 1. Check if Parent exists
        let parent = await prisma.categoria.findFirst({
            where: {
                nome: cat.nome,
                tipo: cat.tipo
            }
        })

        if (!parent) {
            console.log(`Creating Parent Category: ${cat.nome}`)
            parent = await prisma.categoria.create({
                data: {
                    nome: cat.nome,
                    tipo: cat.tipo,
                    cor: cat.cor,
                    ativo: true
                }
            })
        } else {
            console.log(`Parent Category exists: ${cat.nome}`)
        }

        // 2. Create Subcategories
        for (const subName of cat.subcategorias) {
            const exists = await prisma.categoria.findFirst({
                where: {
                    nome: subName,
                    tipo: cat.tipo,
                    categoria_pai_id: parent.id
                }
            })

            if (!exists) {
                console.log(`  -> Creating Subcategory: ${subName}`)
                await prisma.categoria.create({
                    data: {
                        nome: subName,
                        tipo: cat.tipo,
                        categoria_pai_id: parent.id,
                        ativo: true
                    }
                })
            }
        }
    }
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
