import fs from "node:fs"

import {
  Prisma,
  PrismaClient,
  StatusConferencia,
  TipoCategoria,
  TipoContaBancaria,
  TipoLancamento,
} from "@prisma/client"

import { rebuildBankCurrentBalances } from "@/actions/financeiro/banks/balance-tools"
import { getFixedFinancialGroups } from "@/lib/financial/fixed-category-taxonomy"

const prisma = new PrismaClient()

const DEFAULT_CSV_PATH =
  "c:\\Users\\kbrit\\Downloads\\[GD] Planilha financeira 2026 - Página28 (3).csv"
const REQUIRED_BANK_NAMES = ["Inter empresa", "Inter pessoal"] as const
const IMPORT_SOURCE = "financial-history-2026"
const FALLBACK_CATEGORY_NAME = "Sem classificação"
const HEADER_ROW = [
  "Mês",
  "Data",
  "Status",
  "Id do cliente",
  "Valor",
  "Sub-categoria",
  "Tipo",
  "Fornecedor",
  "Observações",
  "Conta",
  "Conta destino",
  "Categoria",
  "Categoria",
]

type StatusRaw = "EFETIVADO" | "PREVISTO"
type DirectionRaw = "ENTRADA" | "SAIDA"

type CsvFields = string[]

interface ParsedRow {
  rowNumber: number
  month: string | null
  date: Date
  status: StatusRaw
  direction: DirectionRaw
  amount: number
  bankName: string | null
  subcategory: string | null
  groupHint: string | null
  supplier: string | null
  notes: string | null
  description: string
  categoryParentName: string
  categoryType: TipoCategoria
}

interface CategoryCacheEntry {
  id: number
  nome: string
  tipo: TipoCategoria
  categoria_pai_id: number | null
}

interface BankCacheEntry {
  id: number
  nome: string
  tipo: TipoContaBancaria
  saldo_inicial: Prisma.Decimal
  saldo_atual: Prisma.Decimal
  ativo: boolean
}

interface CategoryCache {
  byExactKey: Map<string, CategoryCacheEntry>
  byLooseKey: Map<string, CategoryCacheEntry>
}

interface ImportSummary {
  sourceFile: string
  totalRows: number
  repeatedHeaderRows: number
  importedRows: number
  createdBanks: number
  createdCategories: number
  deletedLancamentos: number
  affectedBankNames: string[]
  validation: {
    lancamentoCount: number
    centroCustoLinkedCount: number
    missingBankCount: number
    missingCategoryCount: number
  }
}

function normalizeKey(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function repairMojibake(value: string | null | undefined) {
  const sanitized = (value ?? "").trim()
  if (!sanitized) {
    return sanitized
  }

  if (!/[ÃƒÃ‚]/.test(sanitized)) {
    return sanitized
  }

  try {
    const repaired = Buffer.from(sanitized, "latin1").toString("utf8").trim()
    return repaired.length > 0 && !repaired.includes("\uFFFD") ? repaired : sanitized
  } catch {
    return sanitized
  }
}

function sanitizeText(value: string | null | undefined) {
  const normalized = repairMojibake(value).replace(/\s+/g, " ").trim()
  return normalized.length > 0 ? normalized : null
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 3)}...`
}

function parseDate(value: string) {
  const [dayText, monthText, yearText] = value.split("/")
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)

  if (!day || !month || !year) {
    throw new Error(`Data inválida: ${value}`)
  }

  return new Date(year, month - 1, day)
}

function parseCurrency(value: string) {
  const normalized = value
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim()

  const amount = Number(normalized)
  if (!Number.isFinite(amount)) {
    throw new Error(`Valor inválido: ${value}`)
  }

  return Number(amount.toFixed(2))
}

function parseCsvLine(line: string) {
  const columns: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
        continue
      }

      inQuotes = !inQuotes
      continue
    }

    if (char === "," && !inQuotes) {
      columns.push(current)
      current = ""
      continue
    }

    current += char
  }

  columns.push(current)
  return columns
}

function decodeCsvBuffer(buffer: Buffer) {
  return buffer.toString("utf8").replace(/^\uFEFF/, "")
}

function isRepeatedHeaderRow(fields: CsvFields) {
  return normalizeKey(fields[0]) === "mes" && normalizeKey(fields[1]) === "data"
}

function readCsvRows(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo CSV não encontrado: ${filePath}`)
  }

  const content = decodeCsvBuffer(fs.readFileSync(filePath))
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    throw new Error("CSV vazio ou sem linhas de dados.")
  }

  const headerColumns = parseCsvLine(lines[0])
  if (headerColumns.length < HEADER_ROW.length) {
    throw new Error("CSV com cabeçalho incompleto.")
  }

  const rows: CsvFields[] = []
  let repeatedHeaderRows = 0

  for (const line of lines.slice(1)) {
    const fields = parseCsvLine(line)
    if (isRepeatedHeaderRow(fields)) {
      repeatedHeaderRows += 1
      continue
    }

    rows.push(fields)
  }

  return { rows, repeatedHeaderRows }
}

function getValue(fields: CsvFields, index: number) {
  return sanitizeText(fields[index])
}

function parseFinancialRow(fields: CsvFields, rowNumber: number): ParsedRow {
  const month = getValue(fields, 0)
  const dateText = getValue(fields, 1)
  const statusText = normalizeKey(fields[2])
  const amountText = fields[4] ?? ""
  const subcategory = getValue(fields, 5)
  const directionText = normalizeKey(fields[6])
  const supplier = getValue(fields, 7)
  const notes = getValue(fields, 8)
  const bankName = getValue(fields, 9)
  const groupHint = getValue(fields, 11)

  if (!dateText) {
    throw new Error(`Linha ${rowNumber} sem data preenchida.`)
  }


  const status: StatusRaw =
    statusText === "efetivado"
      ? "EFETIVADO"
      : statusText === "previsto"
        ? "PREVISTO"
        : (() => {
            throw new Error(`Status desconhecido na linha ${rowNumber}: ${fields[2] ?? ""}`)
          })()

  const direction: DirectionRaw =
    directionText === "entrada"
      ? "ENTRADA"
      : directionText === "saida"
        ? "SAIDA"
        : (() => {
            throw new Error(`Tipo desconhecido na linha ${rowNumber}: ${fields[6] ?? ""}`)
          })()

  const categoryParentName = subcategory ? groupHint ?? resolveFallbackGroup(direction) : resolveFallbackGroup(direction)
  const categoryType = resolveCategoryType(categoryParentName, direction)
  const description = truncate(
    [subcategory ?? FALLBACK_CATEGORY_NAME, notes]
      .filter(Boolean)
      .join(" - "),
    255,
  )

  return {
    rowNumber,
    month,
    date: parseDate(dateText),
    status,
    direction,
    amount: parseCurrency(amountText),
    bankName,
    subcategory,
    groupHint,
    supplier,
    notes,
    description,
    categoryParentName,
    categoryType,
  }
}

function resolveFallbackGroup(direction: DirectionRaw) {
  return direction === "ENTRADA" ? "Receita de Ajuste" : "Despesa de ajuste"
}

function resolveCategoryType(groupName: string, direction: DirectionRaw) {
  const normalizedGroup = normalizeKey(groupName)
  const fixedGroup = getFixedFinancialGroups().find(
    (group) => normalizeKey(group.name) === normalizedGroup,
  )

  if (fixedGroup) {
    return fixedGroup.tipo
  }

  return direction === "ENTRADA" ? TipoCategoria.RECEITA : TipoCategoria.DESPESA
}

function buildCategoryKey(name: string, type: TipoCategoria, parentId: number | null) {
  return `${type}|${parentId ?? "root"}|${normalizeKey(name)}`
}

function buildLooseCategoryKey(name: string, type: TipoCategoria) {
  return `${type}|${normalizeKey(name)}`
}

async function loadCategoryCache(tx: PrismaClient | Prisma.TransactionClient): Promise<CategoryCache> {
  const categories = await tx.categoria.findMany({
    select: {
      id: true,
      nome: true,
      tipo: true,
      categoria_pai_id: true,
    },
    orderBy: [{ id: "asc" }],
  })

  const byExactKey = new Map<string, CategoryCacheEntry>()
  const byLooseKey = new Map<string, CategoryCacheEntry>()

  for (const category of categories) {
    const exactKey = buildCategoryKey(category.nome, category.tipo, category.categoria_pai_id)
    const looseKey = buildLooseCategoryKey(category.nome, category.tipo)

    if (!byExactKey.has(exactKey)) {
      byExactKey.set(exactKey, category)
    }

    if (!byLooseKey.has(looseKey)) {
      byLooseKey.set(looseKey, category)
    }
  }

  return { byExactKey, byLooseKey }
}

async function loadBankCache(tx: PrismaClient | Prisma.TransactionClient) {
  const banks = await tx.contasBancaria.findMany({
    select: {
      id: true,
      nome: true,
      tipo: true,
      saldo_inicial: true,
      saldo_atual: true,
      ativo: true,
    },
    orderBy: [{ id: "asc" }],
  })

  const byName = new Map<string, BankCacheEntry>()
  for (const bank of banks) {
    const key = normalizeKey(bank.nome)
    if (!byName.has(key)) {
      byName.set(key, bank)
    }
  }

  return byName
}

function ensureMapValue<T>(map: Map<string, T>, key: string, value: T) {
  if (!map.has(key)) {
    map.set(key, value)
  }
}

async function ensureBank(
  tx: PrismaClient | Prisma.TransactionClient,
  bankCache: Map<string, BankCacheEntry>,
  bankName: string,
  summary: ImportSummary,
) {
  const key = normalizeKey(bankName)
  const existing = bankCache.get(key)
  if (existing) {
    return existing
  }

  const created = await tx.contasBancaria.create({
    data: {
      nome: bankName,
      tipo: TipoContaBancaria.CORRENTE,
      saldo_inicial: new Prisma.Decimal(0),
      saldo_atual: new Prisma.Decimal(0),
      ativo: true,
    },
    select: {
      id: true,
      nome: true,
      tipo: true,
      saldo_inicial: true,
      saldo_atual: true,
      ativo: true,
    },
  })

  bankCache.set(key, created)
  summary.createdBanks += 1
  return created
}

async function ensureCategory(
  tx: PrismaClient | Prisma.TransactionClient,
  categoryCache: CategoryCache,
  name: string,
  type: TipoCategoria,
  parentId: number | null,
  summary: ImportSummary,
) {
  const exactKey = buildCategoryKey(name, type, parentId)
  const looseKey = buildLooseCategoryKey(name, type)

  const existingExact = categoryCache.byExactKey.get(exactKey)
  if (existingExact) {
    return existingExact
  }

  const existingLoose = categoryCache.byLooseKey.get(looseKey)
  if (existingLoose) {
    ensureMapValue(categoryCache.byExactKey, exactKey, existingLoose)
    return existingLoose
  }

  const created = await tx.categoria.create({
    data: {
      nome: name,
      tipo: type,
      ativo: true,
      categoria_pai_id: parentId ?? undefined,
    },
    select: {
      id: true,
      nome: true,
      tipo: true,
      categoria_pai_id: true,
    },
  })

  ensureMapValue(categoryCache.byExactKey, exactKey, created)
  ensureMapValue(categoryCache.byLooseKey, looseKey, created)
  summary.createdCategories += 1
  return created
}

function getTopLevelGroupsToSeed() {
  const groups = getFixedFinancialGroups().map((group) => group.name)
  return new Set([
    ...groups,
    "Sem classificação",
    "Transferência",
  ])
}

async function seedFixedTaxonomy(
  tx: PrismaClient | Prisma.TransactionClient,
  categoryCache: CategoryCache,
  summary: ImportSummary,
) {
  const groups = getFixedFinancialGroups()

  for (const group of groups) {
    const parent = await ensureCategory(
      tx,
      categoryCache,
      group.name,
      group.tipo,
      null,
      summary,
    )

    for (const childName of group.defaultChildren) {
      await ensureCategory(tx, categoryCache, childName, group.tipo, parent.id, summary)
    }
  }

  const fallbackReceitaParent = await ensureCategory(
    tx,
    categoryCache,
    "Receita de Ajuste",
    TipoCategoria.RECEITA,
    null,
    summary,
  )
  await ensureCategory(
    tx,
    categoryCache,
    FALLBACK_CATEGORY_NAME,
    TipoCategoria.RECEITA,
    fallbackReceitaParent.id,
    summary,
  )

  const fallbackDespesaParent = await ensureCategory(
    tx,
    categoryCache,
    "Despesa de ajuste",
    TipoCategoria.DESPESA,
    null,
    summary,
  )
  await ensureCategory(
    tx,
    categoryCache,
    FALLBACK_CATEGORY_NAME,
    TipoCategoria.DESPESA,
    fallbackDespesaParent.id,
    summary,
  )
}

function buildCategorySelection(row: ParsedRow) {
  return {
    parentName: row.categoryParentName,
    leafName: row.subcategory ?? FALLBACK_CATEGORY_NAME,
    type: row.categoryType,
  }
}

function parseArgs() {
  const argv = process.argv.slice(2)

  return {
    apply: argv.includes("--apply"),
    preflight: argv.includes("--preflight") || !argv.includes("--apply"),
    filePath: (() => {
      const index = argv.indexOf("--file")
      return index >= 0 && argv[index + 1] ? argv[index + 1] : DEFAULT_CSV_PATH
    })(),
  }
}

async function main() {
  const args = parseArgs()
  const summary: ImportSummary = {
    sourceFile: args.filePath,
    totalRows: 0,
    repeatedHeaderRows: 0,
    importedRows: 0,
    createdBanks: 0,
    createdCategories: 0,
    deletedLancamentos: 0,
    affectedBankNames: [],
    validation: {
      lancamentoCount: 0,
      centroCustoLinkedCount: 0,
      missingBankCount: 0,
      missingCategoryCount: 0,
    },
  }

  const { rows: rawRows, repeatedHeaderRows } = readCsvRows(args.filePath)
  const parsedRows = rawRows.map((fields, index) => parseFinancialRow(fields, index + 2))
  const csvBankNames = Array.from(
    new Set(parsedRows.map((row) => row.bankName).filter((b): b is string => !!b)),
  ).sort((left, right) => left.localeCompare(right, "pt-BR"))
  const unexpectedBankNames = csvBankNames.filter(
    (bankName) =>
      !REQUIRED_BANK_NAMES.some(
        (required) => normalizeKey(required) === normalizeKey(bankName),
      ),
  )

  if (unexpectedBankNames.length > 0) {
    throw new Error(
      `Encontradas contas bancárias inesperadas no CSV: ${unexpectedBankNames.join(", ")}`,
    )
  }

  summary.totalRows = parsedRows.length
  summary.repeatedHeaderRows = repeatedHeaderRows
  summary.importedRows = parsedRows.length
  summary.affectedBankNames = csvBankNames

  if (args.preflight) {
    console.log(
      JSON.stringify(
        {
          mode: "preflight",
          summary,
          rows: parsedRows.slice(0, 3).map((row) => ({
            rowNumber: row.rowNumber,
            month: row.month,
            date: row.date.toISOString().slice(0, 10),
            status: row.status,
            direction: row.direction,
            amount: row.amount,
            bankName: row.bankName,
            categoryParentName: row.categoryParentName,
            categoryType: row.categoryType,
          })),
        },
        null,
        2,
      ),
    )
  }

  if (!args.apply) {
    return
  }

  await prisma.$transaction(async (tx) => {
    const bankCache = await loadBankCache(tx)
    const categoryCache = await loadCategoryCache(tx)

    await tx.lancamento.deleteMany({})
    summary.deletedLancamentos = await tx.lancamento.count()

    for (const bankName of REQUIRED_BANK_NAMES) {
      await ensureBank(tx, bankCache, bankName, summary)
    }

    await seedFixedTaxonomy(tx, categoryCache, summary)

    const launchRows = []

    for (const row of parsedRows) {
      const { parentName, leafName, type } = buildCategorySelection(row)
      const parent = await ensureCategory(tx, categoryCache, parentName, type, null, summary)
      const leaf = await ensureCategory(tx, categoryCache, leafName, type, parent.id, summary)

      launchRows.push({
        tipo: row.direction === "ENTRADA" ? TipoLancamento.RECEITA : TipoLancamento.DESPESA,
        descricao: row.description,
        valor: new Prisma.Decimal(row.amount.toFixed(2)),
        data_lancamento: row.date,
        data_competencia: row.date,
        observacoes: row.notes,
        status_conferencia:
          row.status === "EFETIVADO"
            ? StatusConferencia.CONFERIDO
            : StatusConferencia.PENDENTE,
        conferido_em: row.status === "EFETIVADO" ? row.date : null,
        conta_bancaria_id: row.bankName ? (bankCache.get(normalizeKey(row.bankName))?.id ?? null) : null,
        categoria_id: leaf.id,
        centro_custo_id: null,
      })
    }



    const result = await tx.lancamento.createMany({
      data: launchRows.map((launch) => ({
        ...launch,
        conta_bancaria_id: launch.conta_bancaria_id as number | null,
      })),
    })

    summary.importedRows = result.count

    const affectedBankIds = Array.from(
      new Set(
        parsedRows.map((row) => bankCache.get(normalizeKey(row.bankName))?.id).filter((value): value is number => typeof value === "number"),
      ),
    )

    await rebuildBankCurrentBalances(tx, affectedBankIds)

    summary.validation = {
      lancamentoCount: await tx.lancamento.count(),
      centroCustoLinkedCount: await tx.lancamento.count({
        where: { centro_custo_id: { not: null } },
      }),
      missingBankCount: await tx.lancamento.count({
        where: { conta_bancaria_id: null },
      }),
      missingCategoryCount: 0,
    }
  }, { timeout: 60000 })

  console.log(
    JSON.stringify(
      {
        mode: "apply",
        summary,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((error) => {
    console.error("[X] Falha na reimportação:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
