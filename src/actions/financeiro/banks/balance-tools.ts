import { Prisma, PrismaClient, TipoLancamento } from "@prisma/client"

type BalanceClient = PrismaClient | Prisma.TransactionClient

export interface BankBalanceSnapshot {
    id: number
    nome: string
    ativo: boolean
    saldo_inicial: number
    receitas: number
    despesas: number
    saldo_calculado: number
    saldo_atual: number
    diferenca: number
}

function toDecimal(value: Prisma.Decimal | number | string | null | undefined) {
    return new Prisma.Decimal(value ?? 0)
}

function toRoundedNumber(value: Prisma.Decimal) {
    return Number(value.toFixed(2))
}

export async function getBankBalanceSnapshots(
    client: BalanceClient,
    bankIds?: number[],
) {
    const bankWhere = bankIds && bankIds.length > 0 ? { id: { in: bankIds } } : undefined
    const transactionWhere =
        bankIds && bankIds.length > 0
            ? { conta_bancaria_id: { in: bankIds } }
            : undefined

    const [banks, groupedTransactions] = await Promise.all([
        client.contasBancaria.findMany({
            where: bankWhere,
            select: {
                id: true,
                nome: true,
                ativo: true,
                saldo_inicial: true,
                saldo_atual: true,
            },
            orderBy: [{ nome: "asc" }, { id: "asc" }],
        }),
        client.lancamento.groupBy({
            by: ["conta_bancaria_id", "tipo"],
            where: transactionWhere,
            _sum: {
                valor: true,
            },
        }),
    ])

    const totalsByBank = new Map<number, { receitas: Prisma.Decimal; despesas: Prisma.Decimal }>()

    for (const row of groupedTransactions) {
        const current = totalsByBank.get(row.conta_bancaria_id) ?? {
            receitas: new Prisma.Decimal(0),
            despesas: new Prisma.Decimal(0),
        }
        const amount = toDecimal(row._sum.valor)

        if (row.tipo === TipoLancamento.RECEITA) {
            current.receitas = current.receitas.plus(amount)
        } else {
            current.despesas = current.despesas.plus(amount)
        }

        totalsByBank.set(row.conta_bancaria_id, current)
    }

    return banks.map<BankBalanceSnapshot>((bank) => {
        const totals = totalsByBank.get(bank.id) ?? {
            receitas: new Prisma.Decimal(0),
            despesas: new Prisma.Decimal(0),
        }
        const saldoInicial = toDecimal(bank.saldo_inicial)
        const saldoAtual = toDecimal(bank.saldo_atual)
        const saldoCalculado = saldoInicial.plus(totals.receitas).minus(totals.despesas)
        const diferenca = saldoAtual.minus(saldoCalculado)

        return {
            id: bank.id,
            nome: bank.nome,
            ativo: bank.ativo,
            saldo_inicial: toRoundedNumber(saldoInicial),
            receitas: toRoundedNumber(totals.receitas),
            despesas: toRoundedNumber(totals.despesas),
            saldo_calculado: toRoundedNumber(saldoCalculado),
            saldo_atual: toRoundedNumber(saldoAtual),
            diferenca: toRoundedNumber(diferenca),
        }
    })
}

export async function rebuildBankCurrentBalances(
    client: BalanceClient,
    bankIds?: number[],
) {
    const snapshots = await getBankBalanceSnapshots(client, bankIds)

    for (const snapshot of snapshots) {
        await client.contasBancaria.update({
            where: { id: snapshot.id },
            data: {
                saldo_atual: new Prisma.Decimal(snapshot.saldo_calculado.toFixed(2)),
            },
        })
    }

    return getBankBalanceSnapshots(client, bankIds)
}
