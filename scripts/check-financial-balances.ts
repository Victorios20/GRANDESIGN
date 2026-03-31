import { PrismaClient } from "@prisma/client"

import { getBankBalanceSnapshots } from "@/actions/financeiro/banks/balance-tools"

const prisma = new PrismaClient()

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

function parseBankName() {
  const args = process.argv.slice(2)
  const flagIndex = args.findIndex((arg) => arg === "--bank")

  if (flagIndex < 0) {
    return null
  }

  return args[flagIndex + 1] ?? null
}

async function main() {
  const onlyDiff = hasFlag("--only-diff")
  const bankName = parseBankName()
  let snapshots = await getBankBalanceSnapshots(prisma)

  if (bankName) {
    const normalizedName = bankName.trim().toLowerCase()
    snapshots = snapshots.filter((snapshot) => snapshot.nome.toLowerCase().includes(normalizedName))
  }

  const mismatches = snapshots.filter((snapshot) => Math.abs(snapshot.diferenca) >= 0.01)

  console.log(
    JSON.stringify(
      {
        totalBanks: snapshots.length,
        mismatches: mismatches.length,
        data: onlyDiff ? mismatches : snapshots,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((error) => {
    console.error("[X] Falha no diagnóstico de saldos:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
